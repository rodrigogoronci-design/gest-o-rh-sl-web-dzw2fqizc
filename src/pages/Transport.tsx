import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import useAppStore from '@/stores/useAppStore'
import { saveTransportBatch } from '@/services/beneficios'
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
import { Save, Calendar as CalendarIcon, Minus, Plus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TransportRecord } from '@/types'

const generateMonths = () => {
  const months = []
  const start = new Date(2026, 0, 1) // Janeiro de 2026
  const end = new Date()
  end.setMonth(end.getMonth() + 3) // Até 3 meses no futuro

  let current = new Date(end.getFullYear(), end.getMonth(), 1)

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

export default function Transport() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()

  const [transportValue, setTransportValue] = useState(10.2)
  const [dbTransportValue, setDbTransportValue] = useState(10.2)

  const months = generateMonths()
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [localData, setLocalData] = useState<Record<string, TransportRecord>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const year = parseInt(selectedMonth.split('-')[0])
  const month = parseInt(selectedMonth.split('-')[1]) - 1

  // Current period (Férias, Plantões, etc)
  const pStart = format(new Date(year, month, 25), 'yyyy-MM-dd')
  const pEnd = format(new Date(year, month + 1, 24), 'yyyy-MM-dd')

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
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const [{ data: transports }, { data: cols }, { data: tickets }, { data: hoData }] =
        await Promise.all([
          supabase.from('beneficios_transporte').select('*').eq('mes_ano', selectedMonth),
          supabase.from('colaboradores').select('*').order('nome'),
          supabase
            .from('beneficios_ticket')
            .select('colaborador_id, ferias, atestados, faltas')
            .eq('mes_ano', selectedMonth),
          supabase.from('dias_home_office').select('data').gte('data', pStart).lte('data', pEnd),
        ])

      const globalHomeOfficeCount = hoData ? hoData.length : 0

      const freshUsers = cols || []
      setActiveUsers(freshUsers)

      const transportsByColab = (transports || []).reduce((acc: any, t: any) => {
        acc[t.colaborador_id] = t
        return acc
      }, {})

      const ticketsByColab = (tickets || []).reduce((acc: any, t: any) => {
        acc[t.colaborador_id] = t
        return acc
      }, {})

      const initial: Record<string, TransportRecord> = {}
      freshUsers
        .filter(
          (u: any) =>
            (u.role === 'user' || u.role === 'Colaborador') && u.recebe_transporte === true,
        )
        .forEach((u) => {
          const t = transportsByColab[u.id]
          const isStored = !!t
          const data = t || { dias_uteis: 20, atestados: 0, ferias: 0, faltas: 0 }
          const tk = ticketsByColab[u.id] || { ferias: 0, atestados: 0, faltas: 0 }

          initial[u.id] = {
            businessDays: isStored ? data.dias_uteis : 20,
            vacation: isStored ? data.ferias : tk.ferias,
            sick: isStored ? data.atestados : tk.atestados,
            faltas: isStored ? data.faltas : tk.faltas,
            homeOffice: isStored ? data.home_office : globalHomeOfficeCount,
          }
        })
      setLocalData(initial)
      setIsLoading(false)
    }

    loadData()
  }, [selectedMonth])

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'Admin') {
    return <Navigate to="/app/mural" replace />
  }

  const handleInputChange = (userId: string, field: keyof TransportRecord, value: string) => {
    const num = parseInt(value) || 0
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
    setIsSaving(true)
    const rows = Object.entries(localData).map(([colaborador_id, data]) => ({
      colaborador_id,
      mes_ano: selectedMonth,
      dias_uteis: data.businessDays,
      home_office: data.homeOffice || 0,
      ferias: data.vacation,
      atestados: data.sick,
      faltas: data.faltas,
    }))
    const { error } = await saveTransportBatch(rows, selectedMonth)
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
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Controle de Vale Transporte
          </h1>
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
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
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
              <TableRow className="[&>th]:py-2 [&>th]:px-3 text-xs uppercase tracking-wider text-slate-500 font-semibold border-0">
                <TableHead className="min-w-[160px]">Colaborador</TableHead>
                <TableHead className="w-[100px] text-center">Dias Úteis</TableHead>
                <TableHead className="w-[100px] text-center">Atestados</TableHead>
                <TableHead className="w-[100px] text-center">Férias</TableHead>
                <TableHead className="w-[100px] text-center">Faltas</TableHead>
                <TableHead className="w-[100px] text-center">Home Office</TableHead>
                <TableHead className="text-center w-[90px]">Total</TableHead>
                <TableHead className="text-right min-w-[120px]">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUsers
                .filter(
                  (u: any) =>
                    (u.role === 'user' || u.role === 'Colaborador') && u.recebe_transporte === true,
                )
                .map((u) => {
                  const data = localData[u.id] || {
                    businessDays: 0,
                    vacation: 0,
                    sick: 0,
                    faltas: 0,
                    homeOffice: 0,
                  }
                  const eligibleDays = Math.max(
                    0,
                    data.businessDays -
                      data.vacation -
                      (data.sick || 0) -
                      (data.faltas || 0) -
                      (data.homeOffice || 0),
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
                        <div className="flex flex-col gap-1 items-center">
                          <UnitInput
                            value={data.businessDays}
                            onChange={(e: any) =>
                              handleInputChange(u.id, 'businessDays', e.target.value)
                            }
                          />
                          <span className="text-[10px] text-emerald-600 font-medium">
                            +R$ {(data.businessDays * transportValue).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-center">
                          <UnitInput
                            value={data.sick || 0}
                            onChange={(e: any) => handleInputChange(u.id, 'sick', e.target.value)}
                          />
                          <div className="flex w-[84px] justify-center items-center px-1">
                            <span className="text-[10px] text-red-600 font-medium">
                              -R$ {((data.sick || 0) * transportValue).toFixed(2).replace('.', ',')}
                            </span>
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
                          />
                          <div className="flex w-[84px] justify-center items-center px-1">
                            <span className="text-[10px] text-red-600 font-medium">
                              -R$ {(data.vacation * transportValue).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-center">
                          <UnitInput
                            value={data.faltas || 0}
                            onChange={(e: any) => handleInputChange(u.id, 'faltas', e.target.value)}
                          />
                          <div className="flex w-[84px] justify-center items-center px-1">
                            <span className="text-[10px] text-red-600 font-medium">
                              -R${' '}
                              {((data.faltas || 0) * transportValue).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-center">
                          <UnitInput
                            value={data.homeOffice || 0}
                            onChange={(e: any) =>
                              handleInputChange(u.id, 'homeOffice', e.target.value)
                            }
                          />
                          <div className="flex w-[84px] justify-center items-center px-1">
                            <span className="text-[10px] text-red-600 font-medium">
                              -R${' '}
                              {((data.homeOffice || 0) * transportValue)
                                .toFixed(2)
                                .replace('.', ',')}
                            </span>
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
