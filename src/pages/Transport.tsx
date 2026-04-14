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
import { TransportRecord } from '@/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const TRANSPORT_DAILY_VALUE = 10.2

export default function Transport() {
  const { currentUser, users, transportData, saveAllTransport, isLoading, shifts } = useAppStore()
  const { toast } = useToast()

  const [localData, setLocalData] = useState<Record<string, TransportRecord>>({})
  const [preCalculatedVacations, setPreCalculatedVacations] = useState<Record<string, number>>({})
  const [globalHomeOffice, setGlobalHomeOffice] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const toastShownRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    if (!users || users.length === 0) return

    const loadData = async () => {
      const today = new Date()
      const pEnd = format(new Date(today.getFullYear(), today.getMonth(), 24), 'yyyy-MM-dd')
      const pStart = format(new Date(today.getFullYear(), today.getMonth() - 1, 25), 'yyyy-MM-dd')

      const { data: ferias } = await supabase
        .from('ferias')
        .select('*')
        .lte('data_inicio', pEnd)
        .gte('data_fim', pStart)

      const vacationDaysCount: Record<string, number> = {}
      const start = parseISO(pStart)
      const end = parseISO(pEnd)

      ferias?.forEach((f) => {
        if (!f.colaborador_id) return
        const fStart = parseISO(f.data_inicio)
        const fEnd = parseISO(f.data_fim)

        if (fStart <= end && fEnd >= start) {
          const overlapStart = fStart < start ? start : fStart
          const overlapEnd = fEnd > end ? end : fEnd
          const days = eachDayOfInterval({ start: overlapStart, end: overlapEnd }).length
          vacationDaysCount[f.colaborador_id] = (vacationDaysCount[f.colaborador_id] || 0) + days
        }
      })

      setPreCalculatedVacations(vacationDaysCount)

      const currentMonthShifts: Record<string, number> = {}
      Object.keys(shifts || {}).forEach((dateStr) => {
        if (dateStr >= pStart && dateStr <= pEnd) {
          shifts[dateStr].forEach((uid) => {
            currentMonthShifts[uid] = (currentMonthShifts[uid] || 0) + 1
          })
        }
      })

      const initial: Record<string, TransportRecord> = {}
      users
        .filter((u) => u.role === 'user')
        .forEach((u) => {
          const isStored = !!transportData[u.id]
          const data = transportData[u.id] || { businessDays: 20, homeOffice: 0, vacation: 0 }
          const preCalcVacation = vacationDaysCount[u.id] || 0

          initial[u.id] = {
            ...data,
            shifts: currentMonthShifts[u.id] || 0,
            vacation: isStored ? data.vacation : preCalcVacation,
          }
        })
      setLocalData(initial)
    }

    loadData()
  }, [users, transportData, shifts])

  if (currentUser?.role !== 'admin') return <Navigate to="/app/mural" replace />

  const handleInputChange = (userId: string, field: keyof TransportRecord, value: string) => {
    if (field === 'shifts') return
    const num = parseInt(value) || 0

    if (field === 'vacation') {
      const preCalc = preCalculatedVacations[userId] || 0
      if (num !== preCalc && !toastShownRef.current[`${userId}-vacation`]) {
        toast({
          title: 'Atenção: Edição Manual',
          description:
            'Você está alterando os dias de férias que foram importados automaticamente do mural.',
          variant: 'destructive',
        })
        toastShownRef.current[`${userId}-vacation`] = true
      }
    }

    setLocalData((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: num },
    }))
  }

  const applyGlobalHomeOffice = () => {
    setLocalData((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], homeOffice: globalHomeOffice }
      })
      return next
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    await saveAllTransport(localData)
    setIsSaving(false)
    toast({
      title: 'Cálculos salvos com sucesso!',
      description: 'Os dados de Vale Transporte foram atualizados no banco de dados.',
      className: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    })
  }

  let grandTotal = 0

  if (isLoading)
    return <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Vale Transporte</h1>
          <p className="text-muted-foreground mt-1">
            Período: 25/
            {format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 25), 'MM')} a 24/
            {format(new Date(), 'MM')} • Valor diário base: R${' '}
            {TRANSPORT_DAILY_VALUE.toFixed(2).replace('.', ',')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white p-1 rounded-md border shadow-sm">
            <span className="text-sm font-medium px-2 text-slate-600">Home Office Global:</span>
            <Input
              type="number"
              min="0"
              className="w-16 h-8 text-center"
              value={globalHomeOffice}
              onChange={(e) => setGlobalHomeOffice(parseInt(e.target.value) || 0)}
            />
            <Button variant="secondary" size="sm" className="h-8" onClick={applyGlobalHomeOffice}>
              Aplicar a todos
            </Button>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 bg-[#10b981] hover:bg-[#059669] text-white"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm flex-1 overflow-hidden flex flex-col">
        <CardContent className="p-0 overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="min-w-[200px]">Colaborador</TableHead>
                <TableHead className="w-[130px]">Dias Úteis</TableHead>
                <TableHead className="w-[130px]">Plantões</TableHead>
                <TableHead className="w-[130px]">Home Office</TableHead>
                <TableHead className="w-[130px]">Férias</TableHead>
                <TableHead className="text-center w-[120px]">Dias Devidos</TableHead>
                <TableHead className="text-right min-w-[150px]">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users
                .filter((u) => u.role === 'user')
                .map((u) => {
                  const data = localData[u.id] || {
                    businessDays: 0,
                    homeOffice: 0,
                    vacation: 0,
                    shifts: 0,
                  }
                  const preCalcVacation = preCalculatedVacations[u.id] || 0
                  const eligibleDays = Math.max(
                    0,
                    data.businessDays - data.homeOffice - data.vacation - (data.shifts || 0),
                  )
                  const totalValue = eligibleDays * TRANSPORT_DAILY_VALUE
                  grandTotal += totalValue

                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={data.businessDays}
                            onChange={(e) =>
                              handleInputChange(u.id, 'businessDays', e.target.value)
                            }
                            className="h-8"
                          />
                          <span className="text-[10px] text-emerald-600 font-medium">
                            + R${' '}
                            {(data.businessDays * TRANSPORT_DAILY_VALUE)
                              .toFixed(2)
                              .replace('.', ',')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Input
                            type="number"
                            value={data.shifts || 0}
                            readOnly
                            className="h-8 bg-slate-50 cursor-not-allowed border-slate-200 text-slate-500 font-medium"
                            title="Plantões contam como home office (trabalho remoto) para o VT"
                          />
                          <span className="text-[10px] text-red-600 font-medium">
                            - R${' '}
                            {((data.shifts || 0) * TRANSPORT_DAILY_VALUE)
                              .toFixed(2)
                              .replace('.', ',')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={data.homeOffice}
                            onChange={(e) => handleInputChange(u.id, 'homeOffice', e.target.value)}
                            className="h-8 text-amber-600"
                          />
                          <span className="text-[10px] text-amber-600 font-medium">
                            - R${' '}
                            {(data.homeOffice * TRANSPORT_DAILY_VALUE).toFixed(2).replace('.', ',')}
                          </span>
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
                              - R${' '}
                              {(data.vacation * TRANSPORT_DAILY_VALUE).toFixed(2).replace('.', ',')}
                            </span>
                            {data.vacation !== preCalcVacation && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3.5 h-3.5 text-orange-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Diferente do mural (Mural: {preCalcVacation} dias)</p>
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
            Total Pago pela Empresa
          </span>
          <span className="text-2xl font-bold text-[#10b981]">
            R$ {grandTotal.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </Card>
    </div>
  )
}
