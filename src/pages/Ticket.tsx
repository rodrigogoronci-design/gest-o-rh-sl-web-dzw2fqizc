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
import { Save, Info, Calendar as CalendarIcon, Minus, Plus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TicketRecord } from '@/types'

const buildMonthsList = (maxFutureDate?: Date) => {
  const months = []
  const start = new Date(2026, 0, 1) // Janeiro de 2026

  const now = new Date()
  let maxMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1) // Mês seguinte

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

const UnitInput = ({ value, onChange, className, readOnly, title }: any) => {
  const handleDecrement = () => {
    if (readOnly) return
    const current = parseInt(value) || 0
    if (current > 0) {
      onChange({ target: { value: String(current - 1) } })
    }
  }

  const handleIncrement = () => {
    if (readOnly) return
    const current = parseInt(value) || 0
    onChange({ target: { value: String(current + 1) } })
  }

  return (
    <div
      className={cn(
        'flex w-[84px] items-center h-8 rounded border border-slate-200 bg-white overflow-hidden transition-all focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/50',
        className,
      )}
      title={title}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={readOnly || value <= 0}
        className="flex h-full w-7 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        min="0"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className="flex-1 w-full h-full bg-transparent text-center text-xs font-medium text-slate-700 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={readOnly}
        className="flex h-full w-7 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

export default function Ticket() {
  const { currentUser, users } = useAppStore()
  const { toast } = useToast()

  const [ticketValue, setTicketValue] = useState(31.59)
  const [dbTicketValue, setDbTicketValue] = useState(31.59)

  const [months, setMonths] = useState(() => buildMonthsList())
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [closedMonth, setClosedMonth] = useState('')
  const [localData, setLocalData] = useState<Record<string, TicketRecord>>({})
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
          const shiftDate = parseISO(data.data)
          setMonths(buildMonthsList(shiftDate))
        }
      })

    supabase
      .from('contracheques')
      .select('mes_ano')
      .order('mes_ano', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setClosedMonth(data.mes_ano)
        }
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
      ] = await Promise.all([
        supabase.from('ferias').select('*').lte('data_inicio', pEnd).gte('data_fim', pStart),
        supabase
          .from('atestados')
          .select('*')
          .lte('data_inicio', prevPEnd)
          .gte('data_fim', prevPStart),
        supabase.from('plantoes').select('*').gte('data', pStart).lte('data', pEnd),
        supabase.from('beneficios_ticket').select('*').eq('mes_ano', selectedMonth),
        supabase.from('faltas').select('*').gte('data', pStart).lte('data', pEnd),
      ])

      const calcDays = (records: any[], startStr: string, endStr: string) => {
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
            counts[r.colaborador_id] =
              (counts[r.colaborador_id] || 0) +
              eachDayOfInterval({ start: overlapStart, end: overlapEnd }).length
          }
        })
        return counts
      }

      const vacationDaysCount = calcDays(ferias || [], pStart, pEnd)
      const atestadoDaysCount = calcDays(atestados || [], prevPStart, prevPEnd)
      setPreCalculatedVacations(vacationDaysCount)
      setPreCalculatedAtestados(atestadoDaysCount)

      const currentMonthShifts: Record<string, number> = {}
      plantoes?.forEach((p) => {
        currentMonthShifts[p.colaborador_id] = (currentMonthShifts[p.colaborador_id] || 0) + 1
      })

      const currentMonthFaltas: Record<string, number> = {}
      faltas?.forEach((f) => {
        currentMonthFaltas[f.colaborador_id] = (currentMonthFaltas[f.colaborador_id] || 0) + 1
      })
      setPreCalculatedFaltas(currentMonthFaltas)

      const ticketsByColab = (tickets || []).reduce((acc: any, t: any) => {
        acc[t.colaborador_id] = t
        return acc
      }, {})

      const initial: Record<string, TicketRecord> = {}
      users
        .filter((u) => u.role === 'user' || u.role === 'Colaborador')
        .forEach((u) => {
          const t = ticketsByColab[u.id]
          const isStored = !!t
          const data = t || { dias_uteis: 20, plantoes: 0, atestados: 0, ferias: 0, faltas: 0 }

          initial[u.id] = {
            regular: isStored ? data.dias_uteis : 20,
            shifts: currentMonthShifts[u.id] || 0,
            vacation: isStored ? data.ferias : vacationDaysCount[u.id] || 0,
            sick: isStored ? data.atestados : atestadoDaysCount[u.id] || 0,
            faltas: isStored ? data.faltas : currentMonthFaltas[u.id] || 0,
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
    }))
    const { error } = await saveTicketsBatch(rows, selectedMonth)
    setIsSaving(false)
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: 'Salvo com sucesso!',
        className: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      })
    }
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
                  variant="default"
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
              <span>Ciclo de Apuração:</span>
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
              <TableRow className="[&>th]:py-2 [&>th]:px-3 text-xs uppercase tracking-wider text-slate-500 font-semibold border-0">
                <TableHead className="min-w-[160px]">Colaborador</TableHead>
                <TableHead className="w-[100px] text-center">Dias Úteis</TableHead>
                <TableHead className="w-[100px] text-center">Plantões</TableHead>
                <TableHead className="w-[110px] text-center">
                  <div
                    className="flex items-center justify-center gap-1 cursor-help"
                    title={`Descontos baseados no ciclo anterior: ${format(parseISO(prevPStart), 'dd/MM/yyyy')} a ${format(parseISO(prevPEnd), 'dd/MM/yyyy')}`}
                  >
                    Atestados
                    <Info className="w-3 h-3 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="w-[100px] text-center">Férias</TableHead>
                <TableHead className="w-[100px] text-center">Faltas</TableHead>
                <TableHead className="text-center w-[90px]">Total</TableHead>
                <TableHead className="text-right min-w-[120px]">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users
                .filter((u) => u.role === 'user' || u.role === 'Colaborador')
                .map((u) => {
                  const data = localData[u.id] || {
                    regular: 0,
                    shifts: 0,
                    sick: 0,
                    vacation: 0,
                    faltas: 0,
                  }
                  const preCalcVacation = preCalculatedVacations[u.id] || 0
                  const preCalcSick = preCalculatedAtestados[u.id] || 0
                  const preCalcFaltas = preCalculatedFaltas[u.id] || 0
                  const eligibleDays = Math.max(
                    0,
                    data.regular + data.shifts - (data.sick + data.vacation + (data.faltas || 0)),
                  )
                  const totalValue = eligibleDays * ticketValue
                  grandTotal += totalValue

                  return (
                    <TableRow
                      key={u.id}
                      className="[&>td]:py-2 [&>td]:px-3 hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                    >
                      <TableCell className="font-medium text-slate-700 text-xs">{u.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-center">
                          <UnitInput
                            value={data.regular}
                            onChange={(e: any) =>
                              handleInputChange(u.id, 'regular', e.target.value)
                            }
                          />
                          <span className="text-[10px] text-emerald-600 font-medium">
                            +R$ {(data.regular * ticketValue).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-center">
                          <UnitInput
                            value={data.shifts}
                            readOnly
                            className="bg-slate-50 border-slate-200 opacity-80"
                            title="Calculado automaticamente"
                          />
                          <span className="text-[10px] text-emerald-600 font-medium">
                            +R$ {(data.shifts * ticketValue).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-center">
                          <UnitInput
                            value={data.sick}
                            onChange={(e: any) => handleInputChange(u.id, 'sick', e.target.value)}
                            className={cn(
                              data.sick !== preCalcSick && 'border-orange-300 bg-orange-50',
                            )}
                          />
                          <div className="flex w-[84px] justify-between items-center px-1">
                            <span className="text-[10px] text-red-600 font-medium">
                              -R$ {(data.sick * ticketValue).toFixed(2).replace('.', ',')}
                            </span>
                            {data.sick !== preCalcSick && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-orange-500 cursor-help shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Diferente ({preCalcSick} dias no ciclo anterior)</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-center">
                          <UnitInput
                            value={data.vacation}
                            onChange={(e: any) =>
                              handleInputChange(u.id, 'vacation', e.target.value)
                            }
                            className={cn(
                              data.vacation !== preCalcVacation && 'border-orange-300 bg-orange-50',
                            )}
                          />
                          <div className="flex w-[84px] justify-between items-center px-1">
                            <span className="text-[10px] text-red-600 font-medium">
                              -R$ {(data.vacation * ticketValue).toFixed(2).replace('.', ',')}
                            </span>
                            {data.vacation !== preCalcVacation && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-orange-500 cursor-help shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Diferente ({preCalcVacation} dias na escala atual)</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-center">
                          <UnitInput
                            value={data.faltas || 0}
                            onChange={(e: any) => handleInputChange(u.id, 'faltas', e.target.value)}
                            className={cn(
                              data.faltas !== preCalcFaltas && 'border-orange-300 bg-orange-50',
                            )}
                          />
                          <div className="flex w-[84px] justify-between items-center px-1">
                            <span className="text-[10px] text-red-600 font-medium">
                              -R$ {((data.faltas || 0) * ticketValue).toFixed(2).replace('.', ',')}
                            </span>
                            {data.faltas !== preCalcFaltas && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-orange-500 cursor-help shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Diferente ({preCalcFaltas} faltas na escala atual)</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
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
