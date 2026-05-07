import { useState, useEffect } from 'react'
import { format, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, ChevronLeft, ChevronRight, FileText, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { formatHours } from '@/lib/ponto-utils'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

export default function BancoHoras() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any[]>([])
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [selectedColab, setSelectedColab] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const handlePrint = () => window.print()

  useEffect(() => {
    if (!user) return
    const init = async () => {
      try {
        const { data: myColab } = await supabase
          .from('colaboradores')
          .select('*')
          .eq('user_id', user.id)
          .single()
        let amAdmin = false
        if (
          myColab &&
          ['admin', 'administrador', 'gerente'].includes(myColab.role?.toLowerCase() || '')
        ) {
          amAdmin = true
          setIsAdmin(true)
        }

        if (amAdmin) {
          const { data: allColabs } = await supabase
            .from('colaboradores')
            .select('id, nome')
            .order('nome')

          const filteredColabs = (allColabs || []).filter((c) => {
            const nomeLower = c.nome.toLowerCase()
            return (
              !nomeLower.includes('administrador geral') &&
              !nomeLower.includes('ismael') &&
              !nomeLower.includes('rodrigo')
            )
          })

          setColaboradores(filteredColabs)
          if (filteredColabs.length > 0) {
            const me = filteredColabs.find((c) => c.id === myColab?.id)
            setSelectedColab(me ? me.id : filteredColabs[0].id)
          }
        } else if (myColab) {
          setSelectedColab(myColab.id)
        }
      } catch (err) {
        console.error(err)
      }
    }
    init()
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const endPeriodDate = new Date(year, month - 1, 1)
      const startPeriodDate = subMonths(endPeriodDate, 11)

      const { data: allPeriodos, error: pError } = await supabase
        .from('periodos_folha')
        .select('*')
        .order('ano', { ascending: true })
        .order('mes', { ascending: true })

      if (pError) throw pError

      const validPeriodos = allPeriodos.filter((p) => {
        const pDate = new Date(p.ano, p.mes - 1, 1)
        return pDate <= endPeriodDate
      })

      if (validPeriodos.length === 0) {
        setData([])
        setLoading(false)
        return
      }

      const periodoIds = validPeriodos.map((p) => p.id)
      const { data: calcData, error: cError } = await supabase
        .from('calculos_horas')
        .select(
          'periodo_id, horas_normais, horas_extras, horas_noturnas, faltas, banco_horas_saldo',
        )
        .in('periodo_id', periodoIds)
        .eq('colaborador_id', selectedColab)

      if (cError) throw cError

      let runningSaldo = 0
      const history = validPeriodos.map((p) => {
        const calcs = calcData.filter((c) => c.periodo_id === p.id)
        const horasNormais = calcs.reduce((acc, curr) => acc + Number(curr.horas_normais || 0), 0)
        const horasExtras = calcs.reduce((acc, curr) => acc + Number(curr.horas_extras || 0), 0)
        const horasNoturnas = calcs.reduce((acc, curr) => acc + Number(curr.horas_noturnas || 0), 0)
        const faltas = calcs.reduce((acc, curr) => acc + Number(curr.faltas || 0), 0)
        const bancoSaldo = calcs.reduce((acc, curr) => acc + Number(curr.banco_horas_saldo || 0), 0)

        const calcSaldo = bancoSaldo !== 0 ? bancoSaldo : horasExtras - faltas
        runningSaldo += calcSaldo

        return {
          periodoStr: `${String(p.mes).padStart(2, '0')}/${p.ano}`,
          mesAnoDate: new Date(p.ano, p.mes - 1, 1),
          horasNormais,
          horasExtras,
          horasNoturnas,
          faltas,
          saldoMes: calcSaldo,
          saldoAcumulado: runningSaldo,
        }
      })

      const last12 = history.filter((h) => h.mesAnoDate >= startPeriodDate)
      setData(last12)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedColab) {
      fetchData()
    }
  }, [selectedColab, currentDate])

  const currentBalance = data.length > 0 ? data[data.length - 1].saldoAcumulado : 0
  const isPositive = currentBalance > 0
  const isNegative = currentBalance < 0

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto bg-slate-50/50 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Banco de Horas</h1>
          <p className="text-muted-foreground">Acompanhamento e evolução do saldo de horas</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && colaboradores.length > 0 && (
            <Select value={selectedColab} onValueChange={setSelectedColab}>
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center rounded-md border bg-white shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-9 w-9 rounded-none rounded-l-md border-r"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 text-sm font-medium w-[140px] text-center capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-9 w-9 rounded-none rounded-r-md border-l"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={handlePrint} className="gap-2">
            <FileText className="w-4 h-4" />
            Gerar Relatório
          </Button>
        </div>
      </div>

      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold">Relatório de Banco de Horas</h1>
        <p>Colaborador: {colaboradores.find((c) => c.id === selectedColab)?.nome || 'Todos'}</p>
        <p className="capitalize">
          Período de referência: {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 md:col-span-2 rounded-xl" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar saldo</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="outline" size="sm" onClick={() => fetchData()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed">
          <Clock className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Nenhum dado disponível</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Não há cálculos de horas registrados para este colaborador no período selecionado.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1 border-none shadow-md overflow-hidden relative print:shadow-none print:border print:col-span-3">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 w-2',
                  isPositive ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-slate-300',
                )}
              />
              <CardHeader className="pl-8 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Saldo Acumulado Atual
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-8">
                <div
                  className={cn(
                    'text-4xl font-bold tracking-tight',
                    isPositive
                      ? 'text-emerald-600'
                      : isNegative
                        ? 'text-rose-600'
                        : 'text-slate-700',
                  )}
                >
                  {isPositive ? '+' : ''}
                  {formatHours(currentBalance)}
                </div>
                <p className="text-sm text-muted-foreground mt-2 capitalize">
                  Referência: {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-none shadow-md print:shadow-none print:border print:col-span-3 print:mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolução do Saldo (Últimos 12 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ChartContainer
                    config={{
                      saldoAcumulado: { label: 'Saldo Acumulado', color: 'hsl(var(--primary))' },
                    }}
                    className="h-full w-full"
                  >
                    <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="periodoStr"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickFormatter={(val) => `${val}h`}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="saldoAcumulado"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-md print:shadow-none print:border">
            <CardHeader>
              <CardTitle>Histórico Mês a Mês</CardTitle>
              <CardDescription>Detalhamento das horas dos últimos meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="px-4 py-3 font-semibold text-slate-700">Período</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-right">
                        Horas Normais
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-right">
                        Horas Extras
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-right">
                        Horas Noturnas
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-right">Faltas</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-right">
                        Saldo do Mês
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-right">
                        Acumulado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b last:border-0 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">{row.periodoStr}</td>
                        <td className="px-4 py-3 text-right">{formatHours(row.horasNormais)}</td>
                        <td className="px-4 py-3 text-right">{formatHours(row.horasExtras)}</td>
                        <td className="px-4 py-3 text-right">{formatHours(row.horasNoturnas)}</td>
                        <td className="px-4 py-3 text-right">{formatHours(row.faltas)}</td>
                        <td
                          className={cn(
                            'px-4 py-3 text-right font-medium',
                            row.saldoMes > 0
                              ? 'text-emerald-600'
                              : row.saldoMes < 0
                                ? 'text-rose-600'
                                : '',
                          )}
                        >
                          {row.saldoMes > 0 ? '+' : ''}
                          {formatHours(row.saldoMes)}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 text-right font-bold',
                            row.saldoAcumulado > 0
                              ? 'text-emerald-600'
                              : row.saldoAcumulado < 0
                                ? 'text-rose-600'
                                : 'text-slate-900',
                          )}
                        >
                          {row.saldoAcumulado > 0 ? '+' : ''}
                          {formatHours(row.saldoAcumulado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {data.map((row, i) => (
                  <div
                    key={i}
                    className="bg-white border rounded-lg p-4 shadow-sm flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-semibold text-slate-800">{row.periodoStr}</span>
                      <span
                        className={cn(
                          'font-bold text-lg',
                          row.saldoAcumulado > 0
                            ? 'text-emerald-600'
                            : row.saldoAcumulado < 0
                              ? 'text-rose-600'
                              : 'text-slate-900',
                        )}
                      >
                        {row.saldoAcumulado > 0 ? '+' : ''}
                        {formatHours(row.saldoAcumulado)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-1 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">H. Normais</span>
                        <span className="font-medium">{formatHours(row.horasNormais)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">H. Extras</span>
                        <span className="font-medium">{formatHours(row.horasExtras)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Faltas</span>
                        <span className="font-medium">{formatHours(row.faltas)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Saldo Mês</span>
                        <span
                          className={cn(
                            'font-medium',
                            row.saldoMes > 0
                              ? 'text-emerald-600'
                              : row.saldoMes < 0
                                ? 'text-rose-600'
                                : '',
                          )}
                        >
                          {row.saldoMes > 0 ? '+' : ''}
                          {formatHours(row.saldoMes)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
