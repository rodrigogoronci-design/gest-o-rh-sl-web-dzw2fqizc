import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { format } from 'date-fns'
import useAppStore from '@/stores/useAppStore'
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
import { Save } from 'lucide-react'
import { TicketRecord } from '@/types'

const TICKET_VALUE = 31.59

export default function Ticket() {
  const { currentUser, users, ticketData, saveAllTickets, isLoading, shifts } = useAppStore()
  const { toast } = useToast()

  const [localData, setLocalData] = useState<Record<string, TicketRecord>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const mesAno = format(new Date(), 'yyyy-MM')
    const currentMonthShifts: Record<string, number> = {}

    Object.keys(shifts || {}).forEach((date) => {
      if (date.startsWith(mesAno)) {
        shifts[date].forEach((uid) => {
          currentMonthShifts[uid] = (currentMonthShifts[uid] || 0) + 1
        })
      }
    })

    // Initialize local state with global state or defaults
    const initial: Record<string, TicketRecord> = {}
    users
      .filter((u) => u.role === 'user')
      .forEach((u) => {
        const data = ticketData[u.id] || { regular: 20, shifts: 0, sick: 0, vacation: 0 }
        initial[u.id] = {
          ...data,
          shifts: currentMonthShifts[u.id] || 0,
        }
      })
    setLocalData(initial)
  }, [users, ticketData, shifts])

  if (currentUser?.role !== 'admin') return <Navigate to="/app/mural" replace />

  const handleInputChange = (userId: string, field: keyof TicketRecord, value: string) => {
    if (field === 'shifts') return // Prevent manual edit of auto-calculated field
    const num = parseInt(value) || 0
    setLocalData((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: num },
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    await saveAllTickets(localData)
    setIsSaving(false)
    toast({
      title: 'Cálculos salvos com sucesso!',
      description: 'Os dados de Ticket Alimentação foram atualizados no banco de dados.',
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
            Valor diário base: R$ {TICKET_VALUE.toFixed(2).replace('.', ',')}
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
                <TableHead className="w-[120px]">Dias Úteis</TableHead>
                <TableHead className="w-[120px]">Plantões</TableHead>
                <TableHead className="w-[120px]">Atestados</TableHead>
                <TableHead className="w-[120px]">Férias</TableHead>
                <TableHead className="text-center w-[120px]">Total Dias</TableHead>
                <TableHead className="text-right min-w-[150px]">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users
                .filter((u) => u.role === 'user')
                .map((u) => {
                  const data = localData[u.id] || { regular: 0, shifts: 0, sick: 0, vacation: 0 }
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
                        <Input
                          type="number"
                          min="0"
                          value={data.regular}
                          onChange={(e) => handleInputChange(u.id, 'regular', e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={data.shifts}
                          readOnly
                          className="h-8 bg-slate-50 cursor-not-allowed border-slate-200 text-slate-500 font-medium"
                          title="Calculado automaticamente a partir do mural de plantões"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={data.sick}
                          onChange={(e) => handleInputChange(u.id, 'sick', e.target.value)}
                          className="h-8 text-red-600"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={data.vacation}
                          onChange={(e) => handleInputChange(u.id, 'vacation', e.target.value)}
                          className="h-8 text-red-600"
                        />
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">
                        {eligibleDays}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
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
