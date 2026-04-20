import { useState, useEffect } from 'react'
import { format, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getDashboardStats, getDashboardChartData } from '@/services/dashboard'
import {
  Utensils,
  Bus,
  Wallet,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const chartConfig = {
  Folha: {
    label: 'Folha de Pgto',
    color: '#8b5cf6',
  },
  Ticket: {
    label: 'Ticket Aliment.',
    color: '#f97316',
  },
  Transporte: {
    label: 'Vale Transporte',
    color: '#3b82f6',
  },
  Meritocracia: {
    label: 'Meritocracia',
    color: '#eab308',
  },
  Total: {
    label: 'Total Gasto',
    color: '#10b981',
  },
}

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState('')
  const [closedMonth, setClosedMonth] = useState('')
  const [months, setMonths] = useState<{ value: string; label: string }[]>([])
  const [stats, setStats] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { supabase } = await import('@/lib/supabase/client')

      const { data: cData } = await supabase
        .from('contracheques')
        .select('mes_ano')
        .order('mes_ano', { ascending: false })
        .limit(1)

      const latestClosed = cData?.[0]?.mes_ano || format(new Date(), 'yyyy-MM')
      setClosedMonth(latestClosed)

      const { data: pData } = await supabase
        .from('plantoes')
        .select('data')
        .order('data', { ascending: false })
        .limit(1)

      let maxFutureDate = new Date()
      let maxMonth = new Date(maxFutureDate.getFullYear(), maxFutureDate.getMonth() + 1, 1)

      if (pData?.[0]?.data) {
        const shiftDate = parseISO(pData[0].data)
        if (shiftDate > maxMonth) {
          maxMonth = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), 1)
        }
      }

      const mSet = new Set<string>()
      const start = new Date(2026, 0, 1)
      let current = new Date(maxMonth.getFullYear(), maxMonth.getMonth(), 1)

      while (current >= start) {
        mSet.add(format(current, 'yyyy-MM'))
        current = subMonths(current, 1)
      }
      mSet.add(latestClosed)

      const options = Array.from(mSet)
        .sort((a, b) => b.localeCompare(a))
        .map((val) => ({
          value: val,
          label: format(parseISO(`${val}-01T12:00:00`), 'MMMM yyyy', { locale: ptBR }),
        }))

      setMonths(options)
      setSelectedMonth(latestClosed)
    }
    init()
  }, [])

  useEffect(() => {
    if (selectedMonth) {
      loadData()
    }
  }, [selectedMonth])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [newStats, newChartData] = await Promise.all([
        getDashboardStats(selectedMonth),
        getDashboardChartData(selectedMonth),
      ])
      setStats(newStats)
      const formattedChartData = newChartData.map((d) => ({
        ...d,
        displayName: format(parseISO(`${d.name}-01`), 'MMM/yy', { locale: ptBR }),
      }))
      setChartData(formattedChartData)
    } catch (error) {
      console.error('Failed to load dashboard data', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totalCost = stats ? stats.ticketCost + stats.transportCost + stats.folhaPagamento : 0

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            {selectedMonth > closedMonth && closedMonth !== '' && (
              <div className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200">
                Previsão
              </div>
            )}
          </div>
          <p className="text-slate-500">Visão consolidada dos custos com benefícios.</p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full bg-white h-12 shadow-sm border-slate-200">
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

      {isLoading || !stats ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[140px] w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card className="border-0 shadow-elevation overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Total Investido (Mês)
              </CardTitle>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Wallet className="w-6 h-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{formatCurrency(totalCost)}</div>
              <p className="text-sm mt-2 flex items-center gap-1">
                {stats.totalCostVariation > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-rose-500" />
                    <span className="text-rose-600 font-medium">
                      +{stats.totalCostVariation.toFixed(1)}%
                    </span>
                  </>
                ) : stats.totalCostVariation < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-600 font-medium">
                      {stats.totalCostVariation.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500 font-medium">0%</span>
                  </>
                )}
                <span className="text-slate-500 ml-1">vs mês anterior</span>
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elevation overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Folha de Pagamento
              </CardTitle>
              <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
                <Wallet className="w-6 h-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {formatCurrency(stats.folhaPagamento || 0)}
              </div>
              <p className="text-sm text-slate-500 mt-2">Soma dos contracheques</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elevation overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Ticket Alimentação
              </CardTitle>
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                <Utensils className="w-6 h-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {formatCurrency(stats.ticketCost)}
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Referente a <span className="font-medium text-slate-700">{stats.ticketCount}</span>{' '}
                colaboradores
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elevation overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Vale Transporte</CardTitle>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Bus className="w-6 h-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {formatCurrency(stats.transportCost)}
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Referente a{' '}
                <span className="font-medium text-slate-700">{stats.transportCount}</span>{' '}
                colaboradores
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elevation overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Custo Médio / Colab.
              </CardTitle>
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <Calculator className="w-6 h-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {formatCurrency(stats.averageCost)}
              </div>
              <p className="text-sm text-slate-500 mt-2">Média por funcionário ativo</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elevation overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Colaboradores Ativos
              </CardTitle>
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users className="w-6 h-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.activeEmployees}</div>
              <p className="text-sm text-slate-500 mt-2">Registrados na base de dados</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elevation overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Meritocracia</CardTitle>
              <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {formatCurrency(stats.meritocracia || 0)}
              </div>
              <p className="text-sm text-slate-500 mt-2">Prêmios do período</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="border-0 shadow-elevation md:col-span-4 rounded-2xl">
          <CardHeader>
            <CardTitle>Evolução de Custos (Últimos 6 meses)</CardTitle>
            <CardDescription>Comparativo entre os benefícios oferecidos</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ChartContainer config={chartConfig} className="w-full h-full">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillFolha" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-Folha)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-Folha)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillTicket" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-Ticket)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-Ticket)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillTransporte" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-Transporte)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-Transporte)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillMeritocracia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-Meritocracia)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-Meritocracia)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="displayName"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    className="text-sm font-medium text-slate-600 capitalize"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `R$ ${value / 1000}k`}
                    className="text-xs text-slate-500"
                    width={60}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Area
                    type="monotone"
                    dataKey="Folha"
                    stroke="var(--color-Folha)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#fillFolha)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="Ticket"
                    stroke="var(--color-Ticket)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#fillTicket)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="Transporte"
                    stroke="var(--color-Transporte)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#fillTransporte)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="Meritocracia"
                    stroke="var(--color-Meritocracia)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#fillMeritocracia)"
                    stackId="1"
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elevation md:col-span-3 rounded-2xl">
          <CardHeader>
            <CardTitle>Custo Total Consolidado</CardTitle>
            <CardDescription>Soma de todos os benefícios nos últimos meses</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="displayName"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    className="text-sm font-medium text-slate-600 capitalize"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `R$ ${value / 1000}k`}
                    className="text-xs text-slate-500"
                    width={60}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar
                    dataKey="Total"
                    fill="var(--color-Total)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
