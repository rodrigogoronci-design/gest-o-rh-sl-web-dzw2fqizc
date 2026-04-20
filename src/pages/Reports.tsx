import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, TrendingUp, Calculator, FileText } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import useAppStore from '@/stores/useAppStore'

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

export default function Reports() {
  const { users } = useAppStore()
  const [months, setMonths] = useState(() => buildMonthsList())
  const [selectedMonth, setSelectedMonth] = useState('')
  const [closedMonth, setClosedMonth] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [summary, setSummary] = useState({ bruto: 0, descontos: 0, liquido: 0, beneficios: 0 })
  const [contracheques, setContracheques] = useState<any[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: pData } = await supabase
        .from('plantoes')
        .select('data')
        .order('data', { ascending: false })
        .limit(1)
        .maybeSingle()

      let maxDate
      if (pData?.data) {
        maxDate = parseISO(pData.data)
      }

      setMonths(buildMonthsList(maxDate))

      const { data: cData } = await supabase
        .from('contracheques')
        .select('mes_ano')
        .order('mes_ano', { ascending: false })
        .limit(1)
        .maybeSingle()

      const latestClosed = cData?.mes_ano || format(new Date(), 'yyyy-MM')
      setClosedMonth(latestClosed)
      setSelectedMonth(latestClosed)
    }
    init()
  }, [])

  useEffect(() => {
    if (!selectedMonth) return

    const loadData = async () => {
      setIsLoading(true)

      const [cRes, tRes, trRes, confRes] = await Promise.all([
        supabase.from('contracheques').select('*').eq('mes_ano', selectedMonth),
        supabase.from('beneficios_ticket').select('*').eq('mes_ano', selectedMonth),
        supabase.from('beneficios_transporte').select('*').eq('mes_ano', selectedMonth),
        supabase.from('configuracoes').select('*').in('chave', ['ticket_value', 'transport_value']),
      ])

      const data = cRes.data || []
      setContracheques(data)

      let bruto = 0
      let descontos = 0
      let liquido = 0

      data.forEach((c) => {
        const v = c.dados_extraidos?.totais?.vencimentos || 0
        const d = c.dados_extraidos?.totais?.descontos || 0
        const l = c.valor_liquido || c.dados_extraidos?.totais?.liquido || 0
        bruto += Number(v)
        descontos += Number(d)
        liquido += Number(l)
      })

      let ticketValue = 31.59
      let transportValue = 10.2
      confRes.data?.forEach((c) => {
        if (c.chave === 'ticket_value') ticketValue = Number(c.valor)
        if (c.chave === 'transport_value') transportValue = Number(c.valor)
      })

      let totalBeneficios = 0
      tRes.data?.forEach((t) => {
        const days = Math.max(
          0,
          (t.dias_uteis || 0) +
            (t.plantoes || 0) -
            (t.faltas || 0) -
            (t.ferias || 0) -
            (t.atestados || 0),
        )
        totalBeneficios += days * ticketValue
      })
      trRes.data?.forEach((t) => {
        const days = Math.max(
          0,
          (t.dias_uteis || 0) -
            (t.home_office || 0) -
            (t.faltas || 0) -
            (t.ferias || 0) -
            (t.atestados || 0),
        )
        totalBeneficios += days * transportValue
      })

      setSummary({ bruto, descontos, liquido, beneficios: totalBeneficios })
      setIsLoading(false)
    }

    loadData()
  }, [selectedMonth])

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in-up flex flex-col h-full">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Resumo da Folha e Meritocracia
            </h1>
            {selectedMonth > closedMonth && closedMonth !== '' && (
              <div className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200">
                Previsão
              </div>
            )}
          </div>
          <p className="text-slate-500">
            Acompanhamento consolidado da folha de pagamento, benefícios e premiações.
          </p>
        </div>
        <div className="w-full xl:w-64">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full bg-white h-12 shadow-sm border-slate-200 capitalize">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value} className="capitalize">
                  {m.label}{' '}
                  {m.value > closedMonth && closedMonth !== '' && (
                    <span className="text-amber-600 ml-1 text-xs font-medium">(Previsão)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="resumo" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-slate-100/80 p-1 w-full justify-start overflow-x-auto shrink-0 border border-slate-200/60 rounded-xl">
          <TabsTrigger
            value="resumo"
            className="flex gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <FileText className="w-4 h-4" /> Resumo da Folha
          </TabsTrigger>
          <TabsTrigger
            value="meritocracia"
            className="flex gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <TrendingUp className="w-4 h-4" /> Meritocracia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="flex-1 mt-6">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-elevation overflow-hidden relative rounded-2xl">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-500" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      Total Bruto
                    </CardTitle>
                    <DollarSign className="w-5 h-5 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">
                      {formatCurrency(summary.bruto)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-elevation overflow-hidden relative rounded-2xl">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Descontos</CardTitle>
                    <TrendingUp className="w-5 h-5 text-red-400 rotate-180" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">
                      {formatCurrency(summary.descontos)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-elevation overflow-hidden relative rounded-2xl">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      Total Líquido
                    </CardTitle>
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">
                      {formatCurrency(summary.liquido)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-elevation overflow-hidden relative rounded-2xl">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      Benefícios (Ticket+Vale)
                    </CardTitle>
                    <Calculator className="w-5 h-5 text-blue-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">
                      {formatCurrency(summary.beneficios)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-elevation overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-lg">Detalhamento por Colaborador</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-0">
                        <TableHead className="font-semibold text-slate-600">Colaborador</TableHead>
                        <TableHead className="text-right font-semibold text-slate-600">
                          Bruto
                        </TableHead>
                        <TableHead className="text-right font-semibold text-slate-600">
                          Descontos
                        </TableHead>
                        <TableHead className="text-right font-semibold text-slate-600">
                          Líquido
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracheques.map((c) => {
                        const user = users?.find((u: any) => u.id === c.colaborador_id)
                        const bruto = c.dados_extraidos?.totais?.vencimentos || 0
                        const descontos = c.dados_extraidos?.totais?.descontos || 0
                        const liquido = c.valor_liquido || c.dados_extraidos?.totais?.liquido || 0

                        return (
                          <TableRow key={c.id} className="hover:bg-slate-50/50 border-slate-100">
                            <TableCell className="font-medium text-slate-700">
                              {user?.nome || user?.name || 'Desconhecido'}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              {formatCurrency(Number(bruto))}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(Number(descontos))}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-emerald-600">
                              {formatCurrency(Number(liquido))}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {contracheques.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                            <FileText className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                            Nenhum dado de folha disponível para este mês.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="meritocracia" className="flex-1 mt-6">
          <Card className="border-0 shadow-elevation h-full rounded-2xl">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg">
                Meritocracia -{' '}
                <span className="capitalize">
                  {months.find((m) => m.value === selectedMonth)?.label}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full mt-6" />
              ) : (
                <div className="text-center py-20 text-slate-500">
                  <TrendingUp className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-medium text-slate-700 mb-2">
                    Cálculo de Meritocracia
                  </h3>
                  <p className="text-sm max-w-md mx-auto text-slate-500">
                    Os dados de meritocracia para este período{' '}
                    {selectedMonth > closedMonth ? 'ainda são uma previsão' : 'estão consolidados'}.
                    O resumo detalhado das premiações será exibido aqui.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
