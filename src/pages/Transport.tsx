import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
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
import { TransportRecord } from '@/types'

const TRANSPORT_DAILY_VALUE = 10.2

export default function Transport() {
  const { currentUser, users, transportData, updateTransportData } = useAppStore()
  const { toast } = useToast()

  const [localData, setLocalData] = useState<Record<string, TransportRecord>>({})
  const [globalHomeOffice, setGlobalHomeOffice] = useState(0)

  useEffect(() => {
    const initial: Record<string, TransportRecord> = {}
    users.forEach((u) => {
      initial[u.id] = transportData[u.id] || { businessDays: 20, homeOffice: 0, vacation: 0 }
    })
    setLocalData(initial)
  }, [users, transportData])

  if (currentUser?.role !== 'admin') return <Navigate to="/app/mural" replace />

  const handleInputChange = (userId: string, field: keyof TransportRecord, value: string) => {
    const num = parseInt(value) || 0
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

  const handleSave = () => {
    Object.entries(localData).forEach(([userId, data]) => {
      updateTransportData(userId, data)
    })
    toast({
      title: 'Cálculos salvos com sucesso!',
      description: 'Os dados de Vale Transporte foram atualizados.',
      className: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    })
  }

  let grandTotal = 0

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Vale Transporte</h1>
          <p className="text-muted-foreground mt-1">
            Valor diário base: R$ {TRANSPORT_DAILY_VALUE.toFixed(2).replace('.', ',')}
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
          <Button onClick={handleSave} className="gap-2 bg-[#10b981] hover:bg-[#059669] text-white">
            <Save className="w-4 h-4" /> Salvar
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm flex-1 overflow-hidden flex flex-col">
        <CardContent className="p-0 overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="min-w-[200px]">Colaborador</TableHead>
                <TableHead className="w-[140px]">Dias Úteis</TableHead>
                <TableHead className="w-[140px]">Home Office</TableHead>
                <TableHead className="w-[140px]">Férias</TableHead>
                <TableHead className="text-center w-[140px]">Dias Devidos</TableHead>
                <TableHead className="text-right min-w-[150px]">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const data = localData[u.id] || { businessDays: 0, homeOffice: 0, vacation: 0 }
                const eligibleDays = Math.max(
                  0,
                  data.businessDays - data.homeOffice - data.vacation,
                )
                const totalValue = eligibleDays * TRANSPORT_DAILY_VALUE
                grandTotal += totalValue

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={data.businessDays}
                        onChange={(e) => handleInputChange(u.id, 'businessDays', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={data.homeOffice}
                        onChange={(e) => handleInputChange(u.id, 'homeOffice', e.target.value)}
                        className="h-8 text-amber-600"
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
