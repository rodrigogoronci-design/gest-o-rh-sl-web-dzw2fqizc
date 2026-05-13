import { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import useAppStore from '@/stores/useAppStore'
import { saveTransportBatch } from '@/services/beneficios'
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
import { Save, Info, Calendar as CalendarIcon, Lock, Unlock, Printer } from 'lucide-react'
import { toggleBeneficiosFechamento } from '@/services/beneficios'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TransportRecord } from '@/types'
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

export default function Transport() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()

  const [transportValue, setTransportValue] = useState(10.2)
  const [dbTransportValue, setDbTransportValue] = useState(10.2)

  const [months, setMonths] = useState(() => buildMonthsList())
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [closedMonth, setClosedMonth] = useState('')
  const [localData, setLocalData] = useState<
    Record<string, TransportRecord & { holidaysWorked?: number }>
  >({})
  const [detailsData, setDetailsData] = useState<Record<string, Record<string, string[]>>>({})

  const [preCalculatedRegular, setPreCalculatedRegular] = useState<Record<string, number>>({})
  const [preCalculatedShifts, setPreCalculatedShifts] = useState<Record<string, number>>({})
  const [preCalculatedHolidays, setPreCalculatedHolidays] = useState<Record<string, number>>({})
  const [preCalculatedVacations, setPreCalculatedVacations] = useState<Record<string, number>>({})
  const [preCalculatedAtestados, setPreCalculatedAtestados] = useState<Record<string, number>>({})
  const [preCalculatedFaltas, setPreCalculatedFaltas] = useState<Record<string, number>>({})
  const [preCalculatedAfastamentos, setPreCalculatedAfastamentos] = useState<
    Record<string, number>
  >({})

  const [totalBusinessDays, setTotalBusinessDays] = useState(20)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isClosed, setIsClosed] = useState(false)
  const toastShownRef = useRef<Record<string, boolean>>({})

  const year = parseInt(selectedMonth.split('-')[0])
  const month = parseInt(selectedMonth.split('-')[1]) - 1

  const pStart = format(new Date(year, month, 25), 'yyyy-MM-dd')
  const pEnd = format(new Date(year, month + 1, 24), 'yyyy-MM-dd')

  const prevPStart = format(new Date(year, month - 1, 25), 'yyyy-MM-dd')
  const prevPEnd = format(new Date(year, month, 24), 'yyyy-MM-dd')

  const [activeUsers, setActiveUsers] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'transport_value')
      .single()
      .then(({ data }) => {
        if (data) {
          const val = Number(data.valor)
          setTransportValue(val)
          setDbTransportValue(val)
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
    const loadData = async () => {
      setIsLoading(true)
      const [
        { data: transports },
        { data: cols },
        { data: hoData },
        { data: faltas },
        { data: ferias },
        { data: atestados },
        { data: plantoes },
        { data: feriadosDb },
        { data: afastamentosDb },
        { data: fechamento },
      ] = await Promise.all([
        supabase.from('beneficios_transporte').select('*').eq('mes_ano', selectedMonth),
        supabase.from('colaboradores').select('*').order('nome'),
        supabase
          .from('dias_home_office')
          .select('data')
          .gte('data', prevPStart)
          .lte('data', prevPEnd),
        supabase.from('faltas').select('*').gte('data', prevPStart).lte('data', prevPEnd),
        supabase.from('ferias').select('*').lte('data_inicio', pEnd).gte('data_fim', pStart),
        supabase
          .from('atestados')
          .select('*')
          .gte('data_inicio', prevPStart)
          .lte('data_inicio', prevPEnd),
        supabase.from('plantoes').select('*').gte('data', pStart).lte('data', pEnd),
        supabase.from('feriados').select('*').gte('data', pStart).lte('data', pEnd),
        supabase.from('afastamentos').select('*').lte('data_inicio', pEnd).gte('data_fim', pStart),
        supabase
          .from('beneficios_fechamentos')
          .select('status')
          .eq('mes_ano', selectedMonth)
          .maybeSingle(),
      ])

      setIsClosed(fechamento?.status === 'fechado')

      const holidaysStrs = (feriadosDb || []).map((f: any) => f.data)
      const daysInPeriod = eachDayOfInterval({
        start: parseISO(pStart),
        end: parseISO(pEnd),
      })
      let bDays = 0
      daysInPeriod.forEach((d) => {
        const dayOfWeek = d.getDay()
        const dStr = format(d, 'yyyy-MM-dd')
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaysStrs.includes(dStr)) {
          bDays++
        }
      })
      setTotalBusinessDays(bDays)

      const freshUsers = cols || []
      setActiveUsers(freshUsers)

      const hoDates = hoData?.map((h) => format(parseISO(h.data), 'dd/MM/yyyy')) || []

      const dDetails: Record<string, Record<string, string[]>> = {}
      freshUsers.forEach((u: any) => {
        dDetails[u.id] = {
          ferias: [],
          atestados: [],
          faltas: [],
          homeOffice: hoDates,
          plantoes: [],
          diasUteis: [],
          feriados: [],
          afastamentos: [],
        }
      })

      const calcDays = (
        records: any[],
        startStr: string,
        endStr: string,
        type: string,
        holidays: string[] = [],
      ) => {
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

            const intervalDays = eachDayOfInterval({ start: overlapStart, end: overlapEnd })
            let days = intervalDays.length

            if (type === 'ferias') {
              days = intervalDays.filter((d) => {
                const dayOfWeek = d.getDay()
                const dStr = format(d, 'yyyy-MM-dd')
                return dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dStr)
              }).length
            } else if (type === 'atestados' && r.quantidade_dias) {
              days = r.quantidade_dias
            }

            counts[r.colaborador_id] = (counts[r.colaborador_id] || 0) + days

            if (dDetails[r.colaborador_id]) {
              dDetails[r.colaborador_id][type].push(
                `${format(rStart, 'dd/MM')} a ${format(rEnd, 'dd/MM')}${type === 'atestados' && r.quantidade_dias ? ` (${r.quantidade_dias} ${r.quantidade_dias === 1 ? 'dia' : 'dias'})` : ''}${type === 'ferias' ? ` (${days} dias úteis)` : ''}`,
              )
            }
          }
        })
        return counts
      }

      const vacationDaysCount = calcDays(ferias || [], pStart, pEnd, 'ferias', holidaysStrs)
      const atestadoDaysCount = calcDays(atestados || [], prevPStart, prevPEnd, 'atestados')

      setPreCalculatedVacations(vacationDaysCount)
      setPreCalculatedAtestados(atestadoDaysCount)

      const afastamentos =
        afastamentosDb?.filter((a) => a.status !== 'rejeitado' && a.status !== 'cancelado') || []
      const afastamentosDaysCount: Record<string, number> = {}
      afastamentos.forEach((r) => {
        if (!r.colaborador_id) return
        const rStart = parseISO(r.data_inicio)
        const rEnd = parseISO(r.data_fim)

        let overlapDays = 0
        daysInPeriod.forEach((d) => {
          const dStr = format(d, 'yyyy-MM-dd')
          const dayOfWeek = d.getDay()
          const isBusinessDay = dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaysStrs.includes(dStr)

          if (isBusinessDay && dStr >= r.data_inicio && dStr <= r.data_fim) {
            overlapDays++
          }
        })

        afastamentosDaysCount[r.colaborador_id] =
          (afastamentosDaysCount[r.colaborador_id] || 0) + overlapDays

        if (dDetails[r.colaborador_id] && overlapDays > 0) {
          dDetails[r.colaborador_id].afastamentos.push(
            `Afastamento: ${format(rStart, 'dd/MM')} a ${format(rEnd, 'dd/MM')} (${r.tipo}) - ${overlapDays} dias`,
          )
        }
      })
      setPreCalculatedAfastamentos(afastamentosDaysCount)

      const currentMonthFaltas: Record<string, number> = {}
      faltas?.forEach((f) => {
        currentMonthFaltas[f.colaborador_id] = (currentMonthFaltas[f.colaborador_id] || 0) + 1
        if (dDetails[f.colaborador_id]) {
          dDetails[f.colaborador_id].faltas.push(format(parseISO(f.data), 'dd/MM/yyyy'))
        }
      })
      setPreCalculatedFaltas(currentMonthFaltas)

      const currentMonthShifts: Record<string, number> = {}
      const currentMonthBusinessShifts: Record<string, number> = {}
      const currentMonthHolidayShifts: Record<string, number> = {}

      plantoes?.forEach((p) => {
        if (!p.colaborador_id) return
        const dStr = p.data
        const d = parseISO(dStr)
        const dayOfWeek = d.getDay()
        const isHoliday = holidaysStrs.includes(dStr)

        if (isHoliday) {
          currentMonthHolidayShifts[p.colaborador_id] =
            (currentMonthHolidayShifts[p.colaborador_id] || 0) + 1
          if (dDetails[p.colaborador_id])
            dDetails[p.colaborador_id].feriados.push(format(d, 'dd/MM/yyyy'))
        } else if (dayOfWeek === 0 || dayOfWeek === 6) {
          currentMonthShifts[p.colaborador_id] = (currentMonthShifts[p.colaborador_id] || 0) + 1
          if (dDetails[p.colaborador_id])
            dDetails[p.colaborador_id].plantoes.push(format(d, 'dd/MM/yyyy'))
        } else {
          currentMonthBusinessShifts[p.colaborador_id] =
            (currentMonthBusinessShifts[p.colaborador_id] || 0) + 1
          if (dDetails[p.colaborador_id])
            dDetails[p.colaborador_id].diasUteis.push(format(d, 'dd/MM/yyyy'))
        }
      })

      setPreCalculatedRegular(currentMonthBusinessShifts)
      setPreCalculatedShifts(currentMonthShifts)
      setPreCalculatedHolidays(currentMonthHolidayShifts)
      setDetailsData(dDetails)

      const transportsByColab = (transports || []).reduce((acc: any, t: any) => {
        acc[t.colaborador_id] = t
        return acc
      }, {})

      const initial: Record<string, TransportRecord & { holidaysWorked?: number }> = {}
      freshUsers
        .filter(
          (u: any) =>
            (u.role === 'user' || u.role === 'Colaborador') &&
            u.recebe_transporte === true &&
            u.status !== 'Inativo' &&
            u.status !== 'Demitido' &&
            (afastamentosDaysCount[u.id] || 0) < bDays,
        )
        .forEach((u) => {
          const t = transportsByColab[u.id]
          const isStored = !!t

          const calcReg = currentMonthBusinessShifts[u.id] || 0
          const calcShifts = currentMonthShifts[u.id] || 0
          const calcHolidays = currentMonthHolidayShifts[u.id] || 0

          const defaultReg = Math.max(0, bDays - (afastamentosDaysCount[u.id] || 0))

          initial[u.id] = {
            businessDays: defaultReg,
            vacation: vacationDaysCount[u.id] || 0,
            sick: atestadoDaysCount[u.id] || 0,
            faltas: currentMonthFaltas[u.id] || 0,
            homeOffice: isStored ? (t.home_office ?? hoDates.length) : hoDates.length,
            shifts: 0,
            holidaysWorked: 0,
            credito: isStored ? t.credito : 0,
            desconto: isStored ? t.desconto : 0,
            credito_justificativa: isStored ? t.credito_justificativa : '',
            desconto_justificativa: isStored ? t.desconto_justificativa : '',
          }
        })
      setLocalData(initial)
      setIsLoading(false)
    }

    loadData()
  }, [selectedMonth, pStart, pEnd, prevPStart, prevPEnd])

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'Admin') {
    return <Navigate to="/app/mural" replace />
  }

  const handleInputChange = (
    userId: string,
    field: keyof TransportRecord | 'holidaysWorked',
    value: string,
  ) => {
    if (isClosed) return
    if (field === 'shifts' || field === 'holidaysWorked' || field === 'businessDays') return
    if (field === 'credito_justificativa' || field === 'desconto_justificativa') {
      setLocalData((prev) => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }))
      return
    }
    const num = parseInt(value) || 0

    const checkWarning = (f: string, preCalc: number, label: string) => {
      if (num !== preCalc && !toastShownRef.current[`${userId}-${f}`]) {
        toast({
          title: 'Atenção: Edição Manual',
          description: `Você está alterando os dias de ${label} calculados automaticamente.`,
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
    await supabase.from('configuracoes').upsert({
      chave: 'transport_value',
      valor: transportValue,
      updated_at: new Date().toISOString(),
    })
    await supabase.from('historico_ajustes').insert({
      user_id: currentUser?.id,
      acao: 'Alteração Base: Vale Transporte',
      detalhes: { antigo: dbTransportValue, novo: transportValue },
    })
    setDbTransportValue(transportValue)
    toast({ title: 'Valor base atualizado', description: 'O novo valor foi salvo globalmente.' })
  }

  const handleSave = async () => {
    if (isClosed) return
    setIsSaving(true)

    const fullyAwayUsers = activeUsers.filter(
      (u) =>
        (u.role === 'user' || u.role === 'Colaborador') &&
        (preCalculatedAfastamentos[u.id] || 0) >= totalBusinessDays &&
        totalBusinessDays > 0,
    )

    const rows = Object.entries(localData).map(([colaborador_id, data]) => ({
      colaborador_id,
      mes_ano: selectedMonth,
      dias_uteis: data.businessDays,
      home_office: data.homeOffice || 0,
      plantoes: 0,
      feriados_trabalhados: 0,
      ferias: data.vacation,
      atestados: data.sick,
      faltas: data.faltas,
      credito: data.credito || 0,
      desconto: data.desconto || 0,
      credito_justificativa: data.credito_justificativa || '',
      desconto_justificativa: data.desconto_justificativa || '',
    }))
    const { error } = await saveTransportBatch(rows, selectedMonth)

    if (fullyAwayUsers.length > 0) {
      await supabase
        .from('beneficios_transporte')
        .delete()
        .eq('mes_ano', selectedMonth)
        .in(
          'colaborador_id',
          fullyAwayUsers.map((u) => u.id),
        )
    }

    setIsSaving(false)

    if (error)
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    else
      toast({
        title: 'Salvo com sucesso!',
        className: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      })
  }

  const handleToggleFechamento = async () => {
    if (!currentUser?.id) return
    const newState = !isClosed
    await toggleBeneficiosFechamento(selectedMonth, newState, currentUser.id)
    setIsClosed(newState)
    toast({
      title: newState ? 'Apuração Fechada' : 'Apuração Reaberta',
      description: newState
        ? 'O período foi fechado para edições.'
        : 'O período está aberto para edições.',
    })
  }

  let grandTotal = 0

  const filteredUsers = activeUsers.filter(
    (u: any) =>
      (u.role === 'user' || u.role === 'Colaborador') &&
      u.recebe_transporte === true &&
      u.status !== 'Inativo' &&
      u.status !== 'Demitido' &&
      (preCalculatedAfastamentos[u.id] || 0) < totalBusinessDays,
  )

  return (
    <>
      <div className="space-y-4 flex flex-col h-full print:hidden">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-slate-800">
                Controle de Vale Transporte
              </h1>
              {selectedMonth > closedMonth && closedMonth !== '' && (
                <div className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold tracking-wide uppercase border border-amber-200">
                  Previsão
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Valor diário base: R$
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={transportValue === 0 ? '' : transportValue}
                  onChange={(e) => setTransportValue(parseFloat(e.target.value) || 0)}
                  className="w-20 h-6 text-xs px-2 py-0 border-slate-200 focus-visible:ring-1 focus-visible:ring-offset-0 bg-white"
                />
                {transportValue !== dbTransportValue && (
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
            {isClosed ? (
              <Button
                onClick={handleToggleFechamento}
                variant="outline"
                className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 h-8 text-xs"
              >
                <Unlock className="w-3.5 h-3.5" /> Reabrir Apuração
              </Button>
            ) : (
              <Button
                onClick={handleToggleFechamento}
                variant="destructive"
                className="gap-1.5 h-8 text-xs bg-red-600 hover:bg-red-700"
              >
                <Lock className="w-3.5 h-3.5" /> Fechar Apuração
              </Button>
            )}
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="gap-1.5 h-8 text-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Extrato
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading || isClosed}
              className="gap-1.5 bg-[#10b981] hover:bg-[#059669] text-white shadow-sm h-8 text-xs"
            >
              <Save className="w-3.5 h-3.5" /> {isSaving ? 'Salvando...' : 'Salvar'}
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
                  <TableHead className="w-[110px] text-center">
                    <div
                      className="flex items-center justify-center gap-1 cursor-help"
                      title={`Padrão do ciclo (${format(parseISO(pStart), 'dd/MM')} a ${format(parseISO(pEnd), 'dd/MM')}): ${totalBusinessDays} dias. (Todos os dias menos sábados, domingos e feriados)`}
                    >
                      Dias Úteis <Info className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
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
                  <TableHead className="w-[110px] text-center">
                    <div
                      className="flex items-center justify-center gap-1 cursor-help"
                      title={`Ciclo anterior: ${format(parseISO(prevPStart), 'dd/MM/yyyy')} a ${format(parseISO(prevPEnd), 'dd/MM/yyyy')}`}
                    >
                      Home Office <Info className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[90px] text-center">Crédito</TableHead>
                  <TableHead className="w-[90px] text-center">Desconto</TableHead>
                  <TableHead className="text-center w-[80px]">Total</TableHead>
                  <TableHead className="text-right min-w-[110px]">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const data = localData[u.id] || {
                    businessDays: 0,
                    vacation: 0,
                    sick: 0,
                    faltas: 0,
                    homeOffice: 0,
                    shifts: 0,
                    holidaysWorked: 0,
                    credito: 0,
                    desconto: 0,
                  }
                  const details = detailsData[u.id] || {
                    ferias: [],
                    atestados: [],
                    faltas: [],
                    homeOffice: [],
                    plantoes: [],
                    diasUteis: [],
                    feriados: [],
                    afastamentos: [],
                  }

                  const expectedReg = Math.max(
                    0,
                    totalBusinessDays - (preCalculatedAfastamentos[u.id] || 0),
                  )
                  const eligibleDays = Math.max(
                    0,
                    data.businessDays +
                      (data.credito || 0) -
                      data.vacation -
                      (data.sick || 0) -
                      (data.faltas || 0) -
                      (data.homeOffice || 0) -
                      (data.desconto || 0),
                  )
                  const totalValue = eligibleDays * transportValue
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
                          value={data.businessDays}
                          readOnly
                          multiplier={transportValue}
                          type="addition"
                          title="Dias Úteis (Padrão do mês)"
                          items={[...(details.diasUteis || []), ...(details.afastamentos || [])]}
                          emptyText={`Padrão da escala: ${totalBusinessDays} dias.`}
                        />
                      </TableCell>
                      <TableCell>
                        <FieldWithInfo
                          value={data.sick || 0}
                          onChange={(e: any) => handleInputChange(u.id, 'sick', e.target.value)}
                          multiplier={transportValue}
                          type="deduction"
                          isWarning={data.sick !== (preCalculatedAtestados[u.id] || 0)}
                          title="Períodos de Atestados"
                          items={details.atestados}
                          emptyText="Sem atestados registrados"
                        />
                      </TableCell>
                      <TableCell>
                        <FieldWithInfo
                          value={data.vacation}
                          onChange={(e: any) => handleInputChange(u.id, 'vacation', e.target.value)}
                          multiplier={transportValue}
                          type="deduction"
                          isWarning={data.vacation !== (preCalculatedVacations[u.id] || 0)}
                          title="Períodos de Férias (Dias Úteis)"
                          items={details.ferias}
                          emptyText="Sem férias registradas"
                        />
                      </TableCell>
                      <TableCell>
                        <FieldWithInfo
                          value={data.faltas || 0}
                          onChange={(e: any) => handleInputChange(u.id, 'faltas', e.target.value)}
                          multiplier={transportValue}
                          type="deduction"
                          isWarning={data.faltas !== (preCalculatedFaltas[u.id] || 0)}
                          title="Dias de Falta"
                          items={details.faltas}
                          emptyText="Sem faltas registradas"
                        />
                      </TableCell>
                      <TableCell>
                        <FieldWithInfo
                          value={data.homeOffice || 0}
                          onChange={(e: any) =>
                            handleInputChange(u.id, 'homeOffice', e.target.value)
                          }
                          multiplier={transportValue}
                          type="deduction"
                          title="Dias de Home Office"
                          items={details.homeOffice}
                          emptyText="Sem registros globais"
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
                          multiplier={transportValue}
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
                          multiplier={transportValue}
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

      {/* Impressão do Extrato */}
      <div className="hidden print:block p-8 bg-white text-black min-h-screen">
        <div className="mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-800">
            Extrato de Apuração - Vale Transporte
          </h1>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p>
                <span className="font-bold text-slate-600">Referência:</span>{' '}
                {months.find((m) => m.value === selectedMonth)?.label} ({selectedMonth})
              </p>
              <p>
                <span className="font-bold text-slate-600">Período:</span>{' '}
                {format(parseISO(pStart), 'dd/MM/yyyy')} a {format(parseISO(pEnd), 'dd/MM/yyyy')}
              </p>
            </div>
            <div className="text-right">
              <p>
                <span className="font-bold text-slate-600">Valor Diário:</span> R${' '}
                {transportValue.toFixed(2).replace('.', ',')}
              </p>
              <p>
                <span className="font-bold text-slate-600">Dias Úteis do Ciclo:</span>{' '}
                {totalBusinessDays}
              </p>
            </div>
          </div>
        </div>

        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-300 text-left">
              <th className="py-2 font-bold uppercase text-slate-600">Colaborador</th>
              <th className="py-2 text-center font-bold uppercase text-slate-600">Dias Úteis</th>
              <th className="py-2 text-center font-bold uppercase text-slate-600">Atestados</th>
              <th className="py-2 text-center font-bold uppercase text-slate-600">Férias</th>
              <th className="py-2 text-center font-bold uppercase text-slate-600">Faltas</th>
              <th className="py-2 text-center font-bold uppercase text-slate-600">Home Office</th>
              <th className="py-2 text-center font-bold uppercase text-slate-600">Crédito</th>
              <th className="py-2 text-center font-bold uppercase text-slate-600">Desconto</th>
              <th className="py-2 text-center font-bold uppercase text-slate-600">Total Dias</th>
              <th className="py-2 text-right font-bold uppercase text-slate-600">Valor Final</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, i) => {
              const data = localData[u.id] || {
                businessDays: 0,
                vacation: 0,
                sick: 0,
                faltas: 0,
                homeOffice: 0,
                credito: 0,
                desconto: 0,
              }
              const eligibleDays = Math.max(
                0,
                data.businessDays +
                  (data.credito || 0) -
                  data.vacation -
                  (data.sick || 0) -
                  (data.faltas || 0) -
                  (data.homeOffice || 0) -
                  (data.desconto || 0),
              )
              const totalValue = eligibleDays * transportValue

              return (
                <tr key={i} className="border-b border-slate-200">
                  <td className="py-2 font-medium">{u.nome || u.name}</td>
                  <td className="py-2 text-center">{data.businessDays}</td>
                  <td className="py-2 text-center">{data.sick || 0}</td>
                  <td className="py-2 text-center">{data.vacation}</td>
                  <td className="py-2 text-center">{data.faltas || 0}</td>
                  <td className="py-2 text-center">{data.homeOffice || 0}</td>
                  <td className="py-2 text-center">{data.credito || 0}</td>
                  <td className="py-2 text-center">{data.desconto || 0}</td>
                  <td className="py-2 text-center font-bold">{eligibleDays}</td>
                  <td className="py-2 text-right font-bold">
                    R$ {totalValue.toFixed(2).replace('.', ',')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="mt-8 pt-4 border-t-2 border-slate-300 flex justify-between items-center">
          <span className="font-bold text-slate-600 uppercase tracking-wider">Total a Pagar</span>
          <span className="text-xl font-black">R$ {grandTotal.toFixed(2).replace('.', ',')}</span>
        </div>

        <div className="mt-16 text-center text-sm text-slate-500">
          <p>Documento gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          {isClosed && <p className="font-bold text-slate-700 mt-1">Apuração Fechada</p>}
        </div>
      </div>
    </>
  )
}
