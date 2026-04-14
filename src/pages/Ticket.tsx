import { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import useAppStore from '@/stores/useAppStore'
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
import { Save, Info } from 'lucide-react'
import { TicketRecord } from '@/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const TICKET_VALUE = 31.59

export default function Ticket() {
  const { currentUser, users, ticketData, saveAllTickets, isLoading, shifts } = useAppStore()
  const { toast } = useToast()

  const [localData, setLocalData] = useState<Record<string, TicketRecord>>({})
  const [preCalculatedVacations, setPreCalculatedVacations] = useState<Record<string, number>>({})
  const [preCalculatedAtestados, setPreCalculatedAtestados] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)
  const toastShownRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    if (!users || users.length === 0) return

    const loadData = async () => {
      const today = new Date()
      const pEnd = format(new Date(today.getFullYear(), today.getMonth(), 24), 'yyyy-MM-dd')
      const pStart = format(new Date(today.getFullYear(), today.getMonth() - 1, 25), 'yyyy-MM-dd')

      const [{ data: ferias }, { data: atestados }] = await Promise.all([
        supabase.from('ferias').select('*').lte('data_inicio', pEnd).gte('data_fim', pStart),
        supabase.from('atestados').select('*').lte('data_inicio', pEnd).gte('data_fim', pStart),
      ])

      const calcDays = (records: any[]) => {
        const counts: Record<string, number> = {}
        const start = parseISO(pStart)
        const end = parseISO(pEnd)
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
      Object.keys(shifts || {}).forEach((dateStr) => {
        if (dateStr >= pStart && dateStr <= pEnd) {
          shifts[dateStr].forEach((uid) => {
            currentMonthShifts[uid] = (currentMonthShifts[uid] || 0) + 1
          })
        }
      })

      const initial: Record<string, TicketRecord> = {}
      users
        .filter((u) => u.role === 'user')
        .forEach((u) => {
          const isStored = !!ticketData[u.id]
          const data = ticketData[u.id] || { regular: 20, shifts: 0, sick: 0, vacation: 0 }

          initial[u.id] = {
            ...data,
            shifts: currentMonthShifts[u.id] || 0,
            vacation: isStored ? data.vacation : vacationDaysCount[u.id] || 0,
            sick: isStored ? data.sick : atestadoDaysCount[u.id] || 0,
          }
        })
      setLocalData(initial)
    }
    loadData()
  }, [users, ticketData, shifts])

  if (currentUser?.role !== 'admin') return <Navigate to="/app/mural" replace />

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

    setLocalData((prev) => ({ ...prev, [userId]: { ...prev[userId], [field]: num } }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    await saveAllTickets(localData)
    setIsSaving(false)
    toast({
      title: 'Salvo com sucesso!',
      className: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    })
  }

  let grandTotal = 0

  if (isLoading)
    return <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Ticket Alimentação</h1>
          <p className="text-muted-foreground mt-1">
            Valor base: R$ {TICKET_VALUE.toFixed(2).replace('.', ',')}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2 bg-[#10b981] hover:bg-[#059669] text-white"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Mês'}
        </Button>
      </div>

      <Card className="border-0 shadow-sm flex-1 overflow-hidden flex flex-col">
        <CardContent className="p-0 overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="min-w-[200px]">Colaborador</TableHead>
                <TableHead className="w-[130px]">Dias Úteis</TableHead>
                <TableHead className="w-[130px]">Plantões</TableHead>
                <TableHead className="w-[130px]">Atestados</TableHead>
                <TableHead className="w-[130px]">Férias</TableHead>
                <TableHead className="text-center w-[120px]">Total Dias</TableHead>
                <TableHead className="text-right min-w-[150px]">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users
                .filter((u) => u.role === 'user')
                .map((u) => {
                  const data = localData[u.id] || { regular: 0, shifts: 0, sick: 0, vacation: 0 }
                  const preCalcVacation = preCalculatedVacations[u.id] || 0
                  const preCalcSick = preCalculatedAtestados[u.id] || 0
                  const eligibleDays = Math.max(
                    0,
                    data.regular + data.shifts - (data.sick + data.vacation),
                  )
                  const totalValue = eligibleDays * TICKET_VALUE
                  grandTotal += totalValue

                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={data.regular}
                            onChange={(e) => handleInputChange(u.id, 'regular', e.target.value)}
                            className="h-8"
                          />
                          <span className="text-[10px] text-emerald-600 font-medium">
                            + R$ {(data.regular * TICKET_VALUE).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Input
                            type="number"
                            value={data.shifts}
                            readOnly
                            className="h-8 bg-slate-50 cursor-not-allowed border-slate-200 text-slate-500 font-medium"
                            title="Calculado automaticamente"
                          />
                          <span className="text-[10px] text-emerald-600 font-medium">
                            + R$ {(data.shifts * TICKET_VALUE).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={data.sick}
                            onChange={(e) => handleInputChange(u.id, 'sick', e.target.value)}
                            className={cn(
                              'h-8 text-red-600 transition-colors',
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
                                  <p>Diferente do sistema ({preCalcSick} dias)</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={data.vacation}
                            onChange={(e) => handleInputChange(u.id, 'vacation', e.target.value)}
                            className={cn(
                              'h-8 text-red-600 transition-colors',
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
                                  <p>Diferente do sistema ({preCalcVacation} dias)</p>
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
        <div className="bg-slate-100 p-4 border-t flex justify-between items-center shrink-0">
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
