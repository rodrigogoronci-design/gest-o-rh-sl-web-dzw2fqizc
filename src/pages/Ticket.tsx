import { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import useAppStore from '@/stores/useAppStore'
import { saveTicketsBatch } from '@/services/beneficios'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Save, Info, Calendar as CalendarIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TicketRecord } from '@/types'
import { FieldWithInfo, AdjustmentInput } from '@/components/beneficios/TableUtils'

const buildMonthsList = (maxFutureDate?: Date) => {
  const months = []
  const start = new Date(2026, 0, 1)

  const now = new Date()
  let maxMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  if (maxFutureDate && maxFutureDate > maxMonth) {
    maxMonth = new Date(maxFutureDate.getFullYear(), maxFutureDate.getMonth(), 1)
  }

  let current = new Date(maxMonth.getFullYear(), maxMonth.getMonth(), 1)

  while (current >= start) {
    const m = (current.getMonth() + 1).toString().padStart(2, '0')
    const y = current.getFullYear()
    months.push({
      value: `${y}-${m}`,
      label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(current),
    })
    current.setMonth(current.getMonth() - 1)
  }
  return months
}

export default function Ticket() {
  const { currentUser, users } = useAppStore()
  const { toast } = useToast()

  const [ticketValue, setTicketValue] = useState(31.59)
  const [dbTicketValue, setDbTicketValue] = useState(31.59)

  const [months, setMonths] = useState(() => buildMonthsList())
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [closedMonth, setClosedMonth] = useState('')
  const [activeUsers, setActiveUsers] = useState<any[]>([])
  const [localData, setLocalData] = useState<Record<string, TicketRecord>>({})
  const [detailsData, setDetailsData] = useState<Record<string, Record<string, string[]>>>({})
  const [preCalculatedVacations, setPreCalculatedVacations] = useState<Record<string, number>>({})
  const [preCalculatedAtestados, setPreCalculatedAtestados] = useState<Record<string, number>>({})
  const [preCalculatedFaltas, setPreCalculatedFaltas] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toastShownRef = useRef<Record<string, boolean>>({})

  const year = parseInt(selectedMonth.split('-')[0])
  const month = parseInt(selectedMonth.split('-')[1]) - 1
  const pStart = format(new Date(year, month, 25), 'yyyy-MM-dd')
  const pEnd = format(new Date(year, month + 1, 24), 'yyyy-MM-dd')

  const prevPStart = format(new Date(year, month - 1, 25), 'yyyy-MM-dd')
  const prevPEnd = format(new Date(year, month, 24), 'yyyy-MM-dd')

  useEffect(() => {
    supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'ticket_value')
      .single()
      .then(({ data }) => {
        if (data) {
          const val = Number(data.valor)
          setTicketValue(val)
          setDbTicketValue(val)
        }
      })

    supabase
      .from('plantoes')
      .select('data')
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.data) {
          setMonths(buildMonthsList(parseISO(data.data)))
        }
      })

    supabase
      .from('contracheques')
      .select('mes_ano')
      .order('mes_ano', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setClosedMonth(data.mes_ano)
      })
  }, [])

  useEffect(() => {
    if (!users || users.length === 0) return

    const loadData = async () => {
      setIsLoading(true)
      const [
        { data: ferias },
        { data: atestados },
        { data: plantoes },
        { data: tickets },
        { data: faltas },
        { data: cols },
      ] = await Promise.all([
        supabase.from('ferias').select('*').lte('data_inicio', pEnd).gte('data_fim', pStart),
        supabase
          .from('atestados')
          .select('*')
          .gte('data_inicio', prevPStart)
          .lte('data_inicio', prevPEnd),
        supabase.from('plantoes').select('*').gte('data', pStart).lte('data', pEnd),
        supabase.from('beneficios_ticket').select('*').eq('mes_ano', selectedMonth),
        supabase.from('faltas').select('*').gte('data', prevPStart).lte('data', prevPEnd),
        supabase.from('colaboradores').select('*').order('nome'),
      ])

      const freshUsers = cols || []
      setActiveUsers(freshUsers)

      const dDetails: Record<string, Record<string, string[]>> = {}
      freshUsers.forEach(
        (u) => (dDetails[u.id] = { ferias: [], atestados: [], plantoes: [], faltas: [] }),
      )

      const calcDays = (records: any[], startStr: string, endStr: string, type: string) => {
        const counts: Record<string, number> = {}
        const start = parseISO(startStr)
        const end = parseISO(endStr)
        records?.forEach((r) => {
          if (!r.colaborador_id) return
          const rStart = parseISO(r.data_inicio)
          const rEnd = parseISO(r.data_fim)
          if (rStart <= end && rEnd >= start) {
            const overlapStart = rStart < start ? start : rStart
            const overlapEnd = rEnd > end ? end : rEnd

            let days = eachDayOfInterval({ start: overlapStart, end: overlapEnd }).length
            if (type === 'atestados' && r.quantidade_dias) {
              days = r.quantidade_dias
            }

            counts[r.colaborador_id] = (counts[r.colaborador_id] || 0) + days

            if (dDetails[r.colaborador_id]) {
              dDetails[r.colaborador_id][type].push(
                `${format(rStart, 'dd/MM')} a ${format(rEnd, 'dd/MM')}${type === 'atestados' && r.quantidade_dias ? ` (${r.quantidade_dias} ${r.quantidade_dias === 1 ? 'dia' : 'dias'})` : ''}`,
              )
            }
          }
        })
        return counts
      }

      const vacationDaysCount = calcDays(ferias || [], pStart, pEnd, 'ferias')
      const atestadoDaysCount = calcDays(atestados || [], prevPStart, prevPEnd, 'atestados')

      setPreCalculatedVacations(vacationDaysCount)
      setPreCalculatedAtestados(atestadoDaysCount)

      const currentMonthShifts: Record<string, number> = {}
      plantoes?.forEach((p) => {
        currentMonthShifts[p.colaborador_id] = (currentMonthShifts[p.colaborador_id] || 0) + 1
        if (dDetails[p.colaborador_id])
          dDetails[p.colaborador_id].plantoes.push(format(parseISO(p.data), 'dd/MM/yyyy'))
      })

      const currentMonthFaltas: Record<string, number> = {}
      faltas?.forEach((f) => {
        currentMonthFaltas[f.colaborador_id] = (currentMonthFaltas[f.colaborador_id] || 0) + 1
        if (dDetails[f.colaborador_id])
          dDetails[f.colaborador_id].faltas.push(format(parseISO(f.data), 'dd/MM/yyyy'))
      })
      setPreCalculatedFaltas(currentMonthFaltas)
      setDetailsData(dDetails)

      const ticketsByColab = (tickets || []).reduce((acc: any, t: any) => {
        acc[t.colaborador_id] = t
        return acc
      }, {})

      const initial: Record<string, TicketRecord> = {}
      freshUsers
        .filter(
          (u) =>
            (u.role === 'user' || u.role === 'Colaborador') &&
            u.status !== 'Inativo' &&
            u.status !== 'Demitido',
        )
        .forEach((u) => {
          const t = ticketsByColab[u.id]
          const isStored = !!t
          const data = t || {
            dias_uteis: 20,
            plantoes: 0,
            atestados: 0,
            ferias: 0,
            faltas: 0,
            credito: 0,
            desconto: 0,
          }

          initial[u.id] = {
            regular: isStored ? data.dias_uteis : 20,
            shifts: currentMonthShifts[u.id] || 0,
            vacation: vacationDaysCount[u.id] || 0,
            sick: atestadoDaysCount[u.id] || 0,
            faltas: currentMonthFaltas[u.id] || 0,
            credito: isStored ? data.credito : 0,
            desconto: isStored ? data.desconto : 0,
            credito_justificativa: isStored ? data.credito_justificativa : '',
            desconto_justificativa: isStored ? data.desconto_justificativa : '',
          }
        })
      setLocalData(initial)
      setIsLoading(false)
    }
    loadData()
  }, [users, selectedMonth, pStart, pEnd])

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'Admin') {
    return <Navigate to="/app/mural" replace />
  }

  const handleInputChange = (userId: string, field: keyof TicketRecord, value: string) => {
    if (field === 'shifts') return
    if (field === 'credito_justificativa' || field === 'desconto_justificativa') {
      setLocalData((prev) => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }))
      return
    }

    const num = parseInt(value) || 0

    const checkWarning = (f: string, preCalc: number, label: string) => {
      if (num !== preCalc && !toastShownRef.current[`${userId}-${f}`]) {
        toast({
          title: 'Atenção: Edição Manual',
          description: `Você está alterando os dias de ${label} importados automaticamente.`,
          variant: 'destructive',
        })
        toastShownRef.current[`${userId}-${f}`] = true
      }
    }

    if (field === 'vacation')
      checkWarning('vacation', preCalculatedVacations[userId] || 0, 'férias')
    if (field === 'sick') checkWarning('sick', preCalculatedAtestados[userId] || 0, 'atestados')
    if (field === 'faltas') checkWarning('faltas', preCalculatedFaltas[userId] || 0, 'faltas')

    setLocalData((prev) => ({ ...prev, [userId]: { ...prev[userId], [field]: num } }))
  }

  const handleSaveGlobalValue = async () => {
    await supabase
      .from('configuracoes')
      .upsert({ chave: 'ticket_value', valor: ticketValue, updated_at: new Date().toISOString() })
    await supabase.from('historico_ajustes').insert({
      user_id: currentUser?.id,
      acao: 'Alteração Base: Ticket Alimentação',
      detalhes: { antigo: dbTicketValue, novo: ticketValue },
    })
    setDbTicketValue(ticketValue)
    toast({ title: 'Valor base atualizado', description: 'O novo valor foi salvo globalmente.' })
  }

  const handleSave = async () => {
    setIsSaving(true)
    const rows = Object.entries(localData).map(([colaborador_id, data]) => ({
      colaborador_id,
      mes_ano: selectedMonth,
      dias_uteis: data.regular,
      plantoes: data.shifts,
      atestados: data.sick,
      ferias: data.vacation,
      faltas: data.faltas,
      credito: data.credito || 0,
      desconto: data.desconto || 0,
      credito_justificativa: data.credito_justificativa || '',
      desconto_justificativa: data.desconto_justificativa || '',
    }))
    const { error } = await saveTicketsBatch(rows, selectedMonth)
    setIsSaving(false)
    if (error)
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    else
      toast({
        title: 'Salvo com sucesso!',
        className: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      })
  }

  let grandTotal = 0

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Controle de Ticket Alimentação
            </h1>
            {selectedMonth > closedMonth && closedMonth !== '' && (
              <div className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold tracking-wide uppercase border border-amber-200">
                Previsão
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Valor base: R$</span>
              <Input
                type="number"
                step="0.01"
                value={ticketValue === 0 ? '' : ticketValue}
                onChange={(e) => setTicketValue(parseFloat(e.target.value) || 0)}
                className="w-20 h-6 text-xs px-2 py-0 border-slate-200 focus-visible:ring-1 focus-visible:ring-offset-0 bg-white"
              />
              {ticketValue !== dbTicketValue && (
                <Button
                  size="sm"
                  className="h-6 text-[10px] px-2 bg-blue-600 hover:bg-blue-700 text-white transition-all animate-in fade-in"
                  onClick={handleSaveGlobalValue}
                >
                  Salvar Base
                </Button>
              )}
            </div>
            <div className="h-3 w-px bg-slate-300 hidden sm:block"></div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Ciclo:</span>
              <strong className="text-slate-700">
                {format(parseISO(pStart), 'dd/MM/yyyy')} a {format(parseISO(pEnd), 'dd/MM/yyyy')}
              </strong>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] h-8 text-xs font-medium bg-white shadow-sm capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value} className="capitalize text-xs">
                  {m.label}{' '}
                  {m.value > closedMonth && closedMonth !== '' && (
                    <span className="text-amber-600 ml-1 font-semibold">(Previsão)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="gap-1.5 bg-[#10b981] hover:bg-[#059669] text-white shadow-sm h-8 text-xs"
          >
            <Save className="w-3.5 h-3.5" /> {isSaving ? 'Salvando...' : 'Salvar Mês'}
          </Button>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col rounded-lg">
        <CardContent className="p-0 overflow-auto flex-1 relative bg-white">
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
              <div className="text-sm font-medium text-slate-500">Carregando dados...</div>
            </div>
          )}
          <Table className="text-sm">
            <TableHeader className="bg-slate-50/90 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200">
              <TableRow className="[&>th]:py-2 [&>th]:px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-0 whitespace-nowrap">
                <TableHead className="min-w-[160px]">Colaborador</TableHead>
                <TableHead className="w-[90px] text-center">Dias Úteis</TableHead>
                <TableHead className="w-[90px] text-center">Plantões</TableHead>
                <TableHead className="w-[100px] text-center">
                  <div
                    className="flex items-center justify-center gap-1 cursor-help"
                    title={`Ciclo anterior: ${format(parseISO(prevPStart), 'dd/MM/yyyy')} a ${format(parseISO(prevPEnd), 'dd/MM/yyyy')}`}
                  >
                    Atestados <Info className="w-3 h-3 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="w-[90px] text-center">Férias</TableHead>
                <TableHead className="w-[100px] text-center">
                  <div
                    className="flex items-center justify-center gap-1 cursor-help"
                    title={`Ciclo anterior: ${format(parseISO(prevPStart), 'dd/MM/yyyy')} a ${format(parseISO(prevPEnd), 'dd/MM/yyyy')}`}
                  >
                    Faltas <Info className="w-3 h-3 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="w-[90px] text-center">Crédito</TableHead>
                <TableHead className="w-[90px] text-center">Desconto</TableHead>
                <TableHead className="text-center w-[80px]">Total</TableHead>
                <TableHead className="text-right min-w-[110px]">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUsers
                .filter(
                  (u) =>
                    (u.role === 'user' || u.role === 'Colaborador') &&
                    u.status !== 'Inativo' &&
                    u.status !== 'Demitido',
                )
                .map((u) => {
                  const data = localData[u.id] || {
                    regular: 0,
                    shifts: 0,
                    sick: 0,
                    vacation: 0,
                    faltas: 0,
                    credito: 0,
                    desconto: 0,
                  }
                  const preCalcVacation = preCalculatedVacations[u.id] || 0
                  const preCalcSick = preCalculatedAtestados[u.id] || 0
                  const preCalcFaltas = preCalculatedFaltas[u.id] || 0
                  const details = detailsData[u.id] || {
                    ferias: [],
                    atestados: [],
                    plantoes: [],
                    faltas: [],
                  }
                  const eligibleDays = Math.max(
                    0,
                    data.regular +
                      data.shifts +
                      (data.credito || 0) -
                      (data.sick + data.vacation + (data.faltas || 0) + (data.desconto || 0)),
                  )
                  const totalValue = eligibleDays * ticketValue
                  grandTotal += totalValue

                  return (
                    <TableRow
                      key={u.id}
                      className="[&>td]:py-2 [&>td]:px-3 hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                    >
                      <TableCell className="font-medium text-slate-700 text-xs">
                        {u.nome || u.name}
                      </TableCell>
                      <TableCell>
                        <FieldWithInfo
                          value={data.regular}
                          onChange={(e: any) => handleInputChange(u.id, 'regular', e.target.value)}
                          multiplier={ticketValue}
                          type="addition"
                        />
                      </TableCell>
                      <TableCell>
                        <FieldWithInfo
                          value={data.shifts}
                          readOnly
                          multiplier={ticketValue}
                          type="addition"
                          title="Dias de Plantão"
                          items={details.plantoes}
                          emptyText="Sem plantões registrados"
                        />
                      </TableCell>
                      <TableCell>
                        <FieldWithInfo
                          value={data.sick}
                          onChange={(e: any) => handleInputChange(u.id, 'sick', e.target.value)}
                          multiplier={ticketValue}
                          type="deduction"
                          isWarning={data.sick !== preCalcSick}
                          title="Períodos de Atestados"
                          items={details.atestados}
                          emptyText="Sem atestados registrados"
                        />
                      </TableCell>
                      <TableCell>
                        <FieldWithInfo
                          value={data.vacation}
                          onChange={(e: any) => handleInputChange(u.id, 'vacation', e.target.value)}
                          multiplier={ticketValue}
                          type="deduction"
                          isWarning={data.vacation !== preCalcVacation}
                          title="Períodos de Férias"
                          items={details.ferias}
                          emptyText="Sem férias registradas"
                        />
                      </TableCell>
                      <TableCell>
                        <FieldWithInfo
                          value={data.faltas || 0}
                          onChange={(e: any) => handleInputChange(u.id, 'faltas', e.target.value)}
                          multiplier={ticketValue}
                          type="deduction"
                          isWarning={data.faltas !== preCalcFaltas}
                          title="Dias de Falta"
                          items={details.faltas}
                          emptyText="Sem faltas registradas"
                        />
                      </TableCell>
                      <TableCell>
                        <AdjustmentInput
                          value={data.credito}
                          justification={data.credito_justificativa}
                          onChange={(val: string, just: string) => {
                            handleInputChange(u.id, 'credito', val)
                            handleInputChange(u.id, 'credito_justificativa', just)
                          }}
                          title="Justificativa do Crédito (Dias)"
                          type="credito"
                          multiplier={ticketValue}
                        />
                      </TableCell>
                      <TableCell>
                        <AdjustmentInput
                          value={data.desconto}
                          justification={data.desconto_justificativa}
                          onChange={(val: string, just: string) => {
                            handleInputChange(u.id, 'desconto', val)
                            handleInputChange(u.id, 'desconto_justificativa', just)
                          }}
                          title="Justificativa do Desconto (Dias)"
                          type="desconto"
                          multiplier={ticketValue}
                        />
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700 text-sm">
                        {eligibleDays}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary text-sm">
                        R$ {totalValue.toFixed(2).replace('.', ',')}
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </CardContent>
        <div className="bg-slate-50 p-3 border-t flex justify-between items-center shrink-0 z-20">
          <span className="font-semibold text-slate-500 uppercase text-xs tracking-wider">
            Total Pago pela Empresa
          </span>
          <span className="text-lg font-bold text-[#10b981]">
            R$ {grandTotal.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </Card>
    </div>
  )
}
