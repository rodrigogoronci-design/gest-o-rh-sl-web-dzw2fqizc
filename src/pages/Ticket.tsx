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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TicketRecord } from '@/types'

const TICKET_VALUE = 31.59

const UnitInput = ({ value, onChange, className, unit = 'dias', readOnly, title }: any) => (
  <div className="relative w-full" title={title}>
    <Input
      type="number"
      min="0"
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      className={cn('h-8 pr-12 text-left font-medium', className)}
    />
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold pointer-events-none uppercase tracking-wider">
      {unit}
    </span>
  </div>
)

export default function Ticket() {
  const { currentUser, users } = useAppStore()
  const { toast } = useToast()

  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [localData, setLocalData] = useState<Record<string, TicketRecord>>({})
  const [preCalculatedVacations, setPreCalculatedVacations] = useState<Record<string, number>>({})
  const [preCalculatedAtestados, setPreCalculatedAtestados] = useState<Record<string, number>>({})
  const [preCalculatedFaltas, setPreCalculatedFaltas] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toastShownRef = useRef<Record<string, boolean>>({})

  const year = parseInt(selectedMonth.split('-')[0])
  const month = parseInt(selectedMonth.split('-')[1]) - 1
  const pStart = format(new Date(year, month - 1, 25), 'yyyy-MM-dd')
  const pEnd = format(new Date(year, month, 24), 'yyyy-MM-dd')

  const prevPStart = format(new Date(year, month - 2, 25), 'yyyy-MM-dd')
  const prevPEnd = format(new Date(year, month - 1, 24), 'yyyy-MM-dd')

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
        supabase
          .from('ferias')
          .select('*')
          .lte('data_inicio', prevPEnd)
          .gte('data_fim', prevPStart),
        supabase
          .from('atestados')
          .select('*')
          .lte('data_inicio', prevPEnd)
          .gte('data_fim', prevPStart),
        supabase.from('plantoes').select('*').gte('data', pStart).lte('data', pEnd),
        supabase.from('beneficios_ticket').select('*').eq('mes_ano', selectedMonth),
        supabase.from('faltas').select('*').gte('data', pStart).lte('data', pEnd),
      ])

      const calcDays = (records: any[]) => {
        const counts: Record<string, number> = {}
        const start = parseISO(prevPStart)
        const end = parseISO(prevPEnd)
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

      const vacationDaysCount = calcDays(ferias || [])
      const atestadoDaysCount = calcDays(atestados || [])
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
    const { error } = await saveTicketsBatch(rows)
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
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Ticket Alimentação</h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-sm text-muted-foreground font-medium">
              Valor base: R$ {TICKET_VALUE.toFixed(2).replace('.', ',')}
            </span>
            <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
            <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Ciclo de Apuração:</span>
              <strong className="text-slate-700">
                {format(parseISO(pStart), 'dd/MM/yyyy')} a {format(parseISO(pEnd), 'dd/MM/yyyy')}
              </strong>
            </div>
            <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
            <div
              className="flex items-center gap-1.5 text-sm text-slate-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200"
              title="Atestados e férias são descontados na escala seguinte"
            >
              <Info className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-orange-700">Descontos referem-se a:</span>
              <strong className="text-orange-800">
                {format(parseISO(prevPStart), 'dd/MM/yyyy')} a{' '}
                {format(parseISO(prevPEnd), 'dd/MM/yyyy')}
              </strong>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-[160px] h-9 font-medium bg-white shadow-sm"
          />
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="gap-2 bg-[#10b981] hover:bg-[#059669] text-white shadow-sm"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Mês'}
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm flex-1 overflow-hidden flex flex-col">
        <CardContent className="p-0 overflow-auto flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
              <div className="text-sm font-medium text-slate-500">Carregando dados...</div>
            </div>
          )}
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="min-w-[180px]">Colaborador</TableHead>
                <TableHead className="w-[120px]">Dias Úteis</TableHead>
                <TableHead className="w-[120px]">Plantões</TableHead>
                <TableHead className="w-[120px]">Atestados</TableHead>
                <TableHead className="w-[120px]">Férias</TableHead>
                <TableHead className="w-[120px]">Faltas</TableHead>
                <TableHead className="text-center w-[110px]">Total Dias</TableHead>
                <TableHead className="text-right min-w-[140px]">Valor Total</TableHead>
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
                  const totalValue = eligibleDays * TICKET_VALUE
                  grandTotal += totalValue

                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-slate-700">{u.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <UnitInput
                            value={data.regular}
                            onChange={(e: any) =>
                              handleInputChange(u.id, 'regular', e.target.value)
                            }
                            unit="dias"
                          />
                          <span className="text-[10px] text-emerald-600 font-medium">
                            + R$ {(data.regular * TICKET_VALUE).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <UnitInput
                            value={data.shifts}
                            readOnly
                            unit="dias"
                            className="bg-slate-50 cursor-not-allowed border-slate-200 text-slate-500"
                            title="Calculado automaticamente"
                          />
                          <span className="text-[10px] text-emerald-600 font-medium">
                            + R$ {(data.shifts * TICKET_VALUE).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <UnitInput
                            value={data.sick}
                            onChange={(e: any) => handleInputChange(u.id, 'sick', e.target.value)}
                            unit="dias"
                            className={cn(
                              'text-red-600 transition-colors',
                              data.sick !== preCalcSick &&
                                'border-orange-300 bg-orange-50 focus-visible:ring-orange-400',
                            )}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-red-600 font-medium">
                              - R$ {(data.sick * TICKET_VALUE).toFixed(2).replace('.', ',')}
                            </span>
                            {data.sick !== preCalcSick && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3.5 h-3.5 text-orange-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Diferente do sistema ({preCalcSick} dias no ciclo anterior)</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <UnitInput
                            value={data.vacation}
                            onChange={(e: any) =>
                              handleInputChange(u.id, 'vacation', e.target.value)
                            }
                            unit="dias"
                            className={cn(
                              'text-red-600 transition-colors',
                              data.vacation !== preCalcVacation &&
                                'border-orange-300 bg-orange-50 focus-visible:ring-orange-400',
                            )}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-red-600 font-medium">
                              - R$ {(data.vacation * TICKET_VALUE).toFixed(2).replace('.', ',')}
                            </span>
                            {data.vacation !== preCalcVacation && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3.5 h-3.5 text-orange-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    Diferente do sistema ({preCalcVacation} dias no ciclo anterior)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <UnitInput
                            value={data.faltas || 0}
                            onChange={(e: any) => handleInputChange(u.id, 'faltas', e.target.value)}
                            unit="faltas"
                            className={cn(
                              'text-red-600 transition-colors',
                              data.faltas !== preCalcFaltas &&
                                'border-orange-300 bg-orange-50 focus-visible:ring-orange-400',
                            )}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-red-600 font-medium">
                              - R${' '}
                              {((data.faltas || 0) * TICKET_VALUE).toFixed(2).replace('.', ',')}
                            </span>
                            {data.faltas !== preCalcFaltas && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3.5 h-3.5 text-orange-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    Diferente do sistema ({preCalcFaltas} faltas na escala atual)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700 text-lg">
                        {eligibleDays}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary text-lg">
                        R$ {totalValue.toFixed(2).replace('.', ',')}
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </CardContent>
        <div className="bg-slate-100 p-4 border-t flex justify-between items-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <span className="font-semibold text-slate-600 uppercase text-sm">
            Valor Total Geral (Empresa)
          </span>
          <span className="text-2xl font-bold text-[#10b981]">
            R$ {grandTotal.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </Card>
    </div>
  )
}
