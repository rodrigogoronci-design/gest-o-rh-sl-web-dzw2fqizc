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
import { Skeleton } from '@/components/ui/skeleton'
import {
  DollarSign,
  TrendingUp,
  Calculator,
  Receipt,
  Star,
  Activity,
  AlertTriangle,
  LineChart,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import useAppStore from '@/stores/useAppStore'
import { cn } from '@/lib/utils'

const getLast6Months = (endStr: string) => {
  const res = []
  const [y, m] = endStr.split('-').map(Number)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1)
    if (d.getFullYear() < 2026) continue
    res.push(format(d, 'yyyy-MM'))
  }
  return res
}

const formatMonthShort = (mesAno: string) => {
  if (!mesAno) return ''
  const [y, m] = mesAno.split('-').map(Number)
  return format(new Date(y, m - 1, 1), 'MMM/yy', { locale: ptBR })
}

export default function Reports() {
  const { users } = useAppStore()
  const [months, setMonths] = useState<{ value: string; label: string }[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [closedMonth, setClosedMonth] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [summary, setSummary] = useState({ bruto: 0, descontos: 0, liquido: 0, beneficios: 0 })
  const [contracheques, setContracheques] = useState<any[]>([])
  const [operacional, setOperacional] = useState({
    plantoes: [] as any[],
    faltas: [] as any[],
    avaliacoes: [] as any[],
  })
  const [evolutivo, setEvolutivo] = useState({
    proventos: {} as any,
    descontos: {} as any,
    months: [] as string[],
  })

  useEffect(() => {
    const init = async () => {
      const { data: cData } = await supabase.from('contracheques').select('mes_ano')

      const unique = Array.from(new Set((cData || []).map((c) => c.mes_ano))).sort((a, b) =>
        b.localeCompare(a),
      )

      if (unique.length > 0) {
        const mapped = unique.map((m) => {
          const [y, mo] = m.split('-').map(Number)
          const d = new Date(y, mo - 1, 1)
          return {
            value: m,
            label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d),
          }
        })
        setMonths(mapped)
        setClosedMonth(mapped[0].value)
        setSelectedMonth(mapped[0].value)
      } else {
        const now = new Date()
        const val = format(now, 'yyyy-MM')
        setMonths([
          {
            value: val,
            label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(now),
          },
        ])
        setClosedMonth(val)
        setSelectedMonth(val)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!selectedMonth) return
    const loadData = async () => {
      setIsLoading(true)
      const [y, m] = selectedMonth.split('-').map(Number)

      // Ajuste das datas para o fechamento da folha (dia 25 do mês anterior a dia 24 do mês selecionado)
      const startDate = format(new Date(y, m - 1, 25), 'yyyy-MM-dd')
      const endDate = format(new Date(y, m, 24), 'yyyy-MM-dd')
      const evoMonths = getLast6Months(selectedMonth)

      const [cRes, tRes, trRes, confRes, pRes, fRes, aRes, evoRes] = await Promise.all([
        supabase.from('contracheques').select('*').eq('mes_ano', selectedMonth),
        supabase.from('beneficios_ticket').select('*').eq('mes_ano', selectedMonth),
        supabase.from('beneficios_transporte').select('*').eq('mes_ano', selectedMonth),
        supabase.from('configuracoes').select('*').in('chave', ['ticket_value', 'transport_value']),
        supabase.from('plantoes').select('*').gte('data', startDate).lte('data', endDate),
        supabase.from('faltas').select('*').gte('data', startDate).lte('data', endDate),
        supabase.from('avaliacoes').select('*').eq('periodo', selectedMonth),
        supabase.from('contracheques').select('mes_ano, dados_extraidos').in('mes_ano', evoMonths),
      ])

      const data = cRes.data || []
      setContracheques(data)
      setOperacional({
        plantoes: pRes.data || [],
        faltas: fRes.data || [],
        avaliacoes: aRes.data || [],
      })

      let bruto = 0,
        descontos = 0,
        liquido = 0
      data.forEach((c) => {
        bruto += Number(c.dados_extraidos?.totais?.vencimentos || 0)
        descontos += Number(c.dados_extraidos?.totais?.descontos || 0)
        liquido += Number(c.valor_liquido || c.dados_extraidos?.totais?.liquido || 0)
      })

      let ticketVal = 31.59,
        transVal = 10.2
      confRes.data?.forEach((c) => {
        if (c.chave === 'ticket_value') ticketVal = Number(c.valor)
        if (c.chave === 'transport_value') transVal = Number(c.valor)
      })

      let bens = 0
      tRes.data?.forEach((t) => {
        bens +=
          Math.max(
            0,
            (t.dias_uteis || 0) +
              (t.plantoes || 0) -
              (t.faltas || 0) -
              (t.ferias || 0) -
              (t.atestados || 0),
          ) * ticketVal
      })
      trRes.data?.forEach((t) => {
        bens +=
          Math.max(
            0,
            (t.dias_uteis || 0) -
              (t.home_office || 0) -
              (t.faltas || 0) -
              (t.ferias || 0) -
              (t.atestados || 0),
          ) * transVal
      })
      setSummary({ bruto, descontos, liquido, beneficios: bens })

      const pMap: any = {},
        dMap: any = {}
      evoRes.data?.forEach((c) => {
        const mes = c.mes_ano
        const linhas = c.dados_extraidos?.linhas || []
        linhas.forEach((l: any) => {
          if (!l.descricao) return
          const desc = l.descricao.trim().toUpperCase()
          if (l.vencimento) {
            if (!pMap[desc]) pMap[desc] = {}
            pMap[desc][mes] = (pMap[desc][mes] || 0) + Number(l.vencimento)
          }
          if (l.desconto) {
            if (!dMap[desc]) dMap[desc] = {}
            dMap[desc][mes] = (dMap[desc][mes] || 0) + Number(l.desconto)
          }
        })
      })
      setEvolutivo({ proventos: pMap, descontos: dMap, months: evoMonths })
      setIsLoading(false)
    }
    loadData()
  }, [selectedMonth])

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const getUserName = (id: string) =>
    users?.find((u: any) => u.id === id)?.nome ||
    users?.find((u: any) => u.id === id)?.name ||
    'Desconhecido'

  const renderEvolutivo = (dataMap: any, isDesconto: boolean) => {
    const events = Object.keys(dataMap).sort()
    return (
      <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="font-semibold text-slate-600">
                Evento ({isDesconto ? 'Descontos' : 'Proventos'})
              </TableHead>
              {evolutivo.months.map((m) => (
                <TableHead
                  key={m}
                  className="text-right whitespace-nowrap font-medium text-slate-600"
                >
                  {formatMonthShort(m)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={evolutivo.months.length + 1}
                  className="text-center py-8 text-slate-400"
                >
                  Sem dados no período
                </TableCell>
              </TableRow>
            ) : (
              events.map((ev) => (
                <TableRow key={ev} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-700 text-xs uppercase">
                    {ev}
                  </TableCell>
                  {evolutivo.months.map((m) => {
                    const val = dataMap[ev][m]
                    return (
                      <TableCell
                        key={m}
                        className={cn(
                          'text-right font-medium',
                          isDesconto ? 'text-red-500' : 'text-emerald-600',
                        )}
                      >
                        {val ? formatCurrency(val) : '-'}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in-up pb-24">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Relatórios Gerenciais
            </h1>
            {selectedMonth > closedMonth && closedMonth !== '' && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200">
                Previsão
              </span>
            )}
          </div>
          <p className="text-slate-500">
            Acompanhamento consolidado da folha de pagamento e registros operacionais.
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

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Total Bruto',
                val: summary.bruto,
                color: 'bg-slate-500',
                Icon: DollarSign,
                tCol: 'text-slate-400',
              },
              {
                title: 'Descontos',
                val: summary.descontos,
                color: 'bg-red-500',
                Icon: TrendingUp,
                tCol: 'text-red-400',
                cls: 'rotate-180',
              },
              {
                title: 'Total Líquido',
                val: summary.liquido,
                color: 'bg-emerald-500',
                Icon: DollarSign,
                tCol: 'text-emerald-400',
              },
              {
                title: 'Benefícios (Ticket+Vale)',
                val: summary.beneficios,
                color: 'bg-blue-500',
                Icon: Calculator,
                tCol: 'text-blue-400',
              },
            ].map((s, i) => (
              <Card
                key={i}
                className="border-0 shadow-elevation overflow-hidden relative rounded-2xl"
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${s.color}`} />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">{s.title}</CardTitle>
                  <s.Icon className={cn('w-5 h-5', s.tCol, s.cls)} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{formatCurrency(s.val)}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-elevation rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-indigo-500" /> Acompanhamento Funcional
                    (Evolutivo)
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Análise mês a mês detalhada por eventos importados da folha
                  </p>
                </div>
                <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-sm">
                  Visão Consolidada (Empresa)
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8 bg-slate-50/30">
              {renderEvolutivo(evolutivo.proventos, false)}
              {renderEvolutivo(evolutivo.descontos, true)}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: `Contracheques Processados (${contracheques.length})`,
                Icon: Receipt,
                color: 'text-blue-500',
                headers: ['Colaborador', 'Assinado', 'Líquido (R$)'],
                data: contracheques,
                render: (c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-slate-700">
                      {getUserName(c.colaborador_id)}
                    </TableCell>
                    <TableCell>
                      {c.assinado ? (
                        <span className="text-emerald-600 font-medium">Sim</span>
                      ) : (
                        <span className="text-slate-400">Não</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {formatCurrency(
                        Number(c.valor_liquido || c.dados_extraidos?.totais?.liquido || 0),
                      )}
                    </TableCell>
                  </TableRow>
                ),
                emptyMsg: 'Nenhum contracheque processado',
              },
              {
                title: `Avaliações de Meritocracia (${operacional.avaliacoes.length})`,
                Icon: Star,
                color: 'text-amber-500',
                headers: ['Colaborador', 'Média'],
                data: operacional.avaliacoes,
                render: (a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-slate-700">
                      {getUserName(a.colaborador_id)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-amber-600">
                      {(
                        (Number(a.nota_pontualidade) +
                          Number(a.nota_qualidade) +
                          Number(a.nota_trabalho_equipe)) /
                        3
                      ).toFixed(1)}
                    </TableCell>
                  </TableRow>
                ),
                emptyMsg: 'Nenhuma avaliação no período',
              },
              {
                title: `Plantões Registrados (${operacional.plantoes.length})`,
                Icon: Activity,
                color: 'text-emerald-500',
                headers: ['Colaborador', 'Período', 'Data'],
                data: operacional.plantoes,
                render: (p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-slate-700">
                      {getUserName(p.colaborador_id)}
                    </TableCell>
                    <TableCell className="text-slate-500">{p.periodo || 'Integral'}</TableCell>
                    <TableCell className="text-right text-slate-600">
                      {format(parseISO(p.data), 'dd/MM/yyyy')}
                    </TableCell>
                  </TableRow>
                ),
                emptyMsg: 'Nenhum plantão registrado',
              },
              {
                title: `Faltas Inseridas (${operacional.faltas.length})`,
                Icon: AlertTriangle,
                color: 'text-red-500',
                headers: ['Colaborador', 'Data'],
                data: operacional.faltas,
                render: (f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium text-slate-700">
                      {getUserName(f.colaborador_id)}
                    </TableCell>
                    <TableCell className="text-right text-red-500 font-medium">
                      {format(parseISO(f.data), 'dd/MM/yyyy')}
                    </TableCell>
                  </TableRow>
                ),
                emptyMsg: 'Nenhuma falta no período',
              },
            ].map((block, i) => (
              <Card key={i} className="border-0 shadow-elevation rounded-2xl flex flex-col h-full">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-4 shrink-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <block.Icon className={cn('w-4 h-4', block.color)} /> {block.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 relative min-h-[250px]">
                  <div className="absolute inset-0 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white shadow-[0_1px_0_0_#f1f5f9] z-10">
                        <TableRow className="border-0">
                          {block.headers.map((h, j) => (
                            <TableHead
                              key={j}
                              className={
                                j === block.headers.length - 1 ? 'text-right text-xs' : 'text-xs'
                              }
                            >
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {block.data.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={block.headers.length}
                              className="text-center py-10 text-slate-400 text-sm"
                            >
                              {block.emptyMsg}
                            </TableCell>
                          </TableRow>
                        ) : (
                          block.data.map(block.render)
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
