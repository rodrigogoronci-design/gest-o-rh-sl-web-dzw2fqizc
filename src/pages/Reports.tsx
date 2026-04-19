import { useState, useEffect } from 'react'
import { format, parseISO, subMonths } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Printer,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  DollarSign,
  Activity,
  AlertTriangle,
  FileText,
  CalendarOff,
  Banknote,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import useAppStore from '@/stores/useAppStore'
import { ptBR } from 'date-fns/locale'

export default function Reports() {
  const { users } = useAppStore()
  const { toast } = useToast()

  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [isLoading, setIsLoading] = useState(false)
  const [evolutivoUserId, setEvolutivoUserId] = useState<string>('all')

  const [data, setData] = useState({
    tickets: [] as any[],
    transports: [] as any[],
    plantoes: [] as any[],
    faltas: [] as any[],
    atestados: [] as any[],
    feriados: [] as any[],
    contracheques: [] as any[],
    avaliacoes: [] as any[],
    evolutivo: [] as any[],
  })

  const ticketValue = parseFloat(localStorage.getItem('ticketValue') || '31.59')
  const transportValue = parseFloat(localStorage.getItem('transportValue') || '10.20')

  const year = parseInt(selectedMonth.split('-')[0])
  const month = parseInt(selectedMonth.split('-')[1]) - 1
  const pStart = format(new Date(year, month - 1, 25), 'yyyy-MM-dd')
  const pEnd = format(new Date(year, month, 24), 'yyyy-MM-dd')

  const evolutivoMeses = Array.from({ length: 6 })
    .map((_, i) => format(subMonths(parseISO(`${selectedMonth}-01`), i), 'yyyy-MM'))
    .reverse()

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const [
        { data: tickets },
        { data: transports },
        { data: plantoes },
        { data: faltas },
        { data: atestados },
        { data: feriados },
        { data: contracheques },
        { data: avaliacoes },
        { data: evolutivo },
      ] = await Promise.all([
        supabase.from('beneficios_ticket').select('*').eq('mes_ano', selectedMonth),
        supabase.from('beneficios_transporte').select('*').eq('mes_ano', selectedMonth),
        supabase.from('plantoes').select('*').gte('data', pStart).lte('data', pEnd).order('data'),
        supabase.from('faltas').select('*').gte('data', pStart).lte('data', pEnd).order('data'),
        supabase
          .from('atestados')
          .select('*')
          .lte('data_inicio', pEnd)
          .gte('data_fim', pStart)
          .order('data_inicio'),
        supabase.from('feriados').select('*').gte('data', pStart).lte('data', pEnd).order('data'),
        supabase.from('contracheques').select('*').eq('mes_ano', selectedMonth),
        supabase.from('avaliacoes').select('*').eq('periodo', selectedMonth),
        supabase.from('contracheques').select('*').in('mes_ano', evolutivoMeses),
      ])

      setData({
        tickets: tickets || [],
        transports: transports || [],
        plantoes: plantoes || [],
        faltas: faltas || [],
        atestados: atestados || [],
        feriados: feriados || [],
        contracheques: contracheques || [],
        avaliacoes: avaliacoes || [],
        evolutivo: evolutivo || [],
      })
      setIsLoading(false)
    }
    loadData()
  }, [selectedMonth, pStart, pEnd])

  const getUserName = (id: string) => {
    const u = users.find((u) => u.id === id)
    return u ? u.nome || u.name : 'Desconhecido'
  }

  // Calculate totals
  let totalTicket = 0
  data.tickets.forEach((t) => {
    const eligible = Math.max(0, t.dias_uteis + t.plantoes - (t.atestados + t.ferias + t.faltas))
    totalTicket += eligible * ticketValue
  })

  let totalTransport = 0
  data.transports.forEach((t) => {
    const eligible = Math.max(
      0,
      t.dias_uteis - t.ferias - t.atestados - t.faltas - (t.home_office || 0),
    )
    totalTransport += eligible * transportValue
  })

  let totalBruto = 0
  let totalLiquido = 0
  let totalDescontos = 0

  data.contracheques.forEach((c) => {
    const ext = c.dados_extraidos
    if (ext?.totais) {
      totalBruto += ext.totais.vencimentos || 0
      totalDescontos += ext.totais.descontos || 0
      totalLiquido += ext.totais.liquido || c.valor_liquido || 0
    } else {
      totalLiquido += c.valor_liquido || 0
    }
  })

  const avaliacoesCount = data.avaliacoes.length
  const avgAvaliacoes =
    avaliacoesCount > 0
      ? data.avaliacoes.reduce(
          (acc, a) => acc + a.nota_pontualidade + a.nota_qualidade + a.nota_trabalho_equipe,
          0,
        ) /
        (avaliacoesCount * 3)
      : 0

  // Construir mapa evolutivo
  const eventsMap: Record<
    string,
    { descricao: string; type: 'vencimento' | 'desconto'; values: Record<string, number> }
  > = {}

  data.evolutivo.forEach((cc) => {
    if (evolutivoUserId !== 'all' && cc.colaborador_id !== evolutivoUserId) return

    const linhas = cc.dados_extraidos?.linhas || []
    linhas.forEach((l: any) => {
      const key = l.codigo || l.descricao
      if (!key) return
      if (!eventsMap[key]) {
        eventsMap[key] = {
          descricao: l.descricao || `Cód. ${l.codigo}`,
          type: l.vencimento > 0 ? 'vencimento' : 'desconto',
          values: {},
        }
      }
      const val = (l.vencimento || 0) + (l.desconto || 0)
      eventsMap[key].values[cc.mes_ano] = (eventsMap[key].values[cc.mes_ano] || 0) + val
    })
  })

  const evolutivoList = Object.keys(eventsMap).map((k) => ({ key: k, ...eventsMap[k] }))
  const evolutivoVencimentos = evolutivoList
    .filter((e) => e.type === 'vencimento')
    .sort((a, b) => b.values[selectedMonth] - a.values[selectedMonth])
  const evolutivoDescontos = evolutivoList
    .filter((e) => e.type === 'desconto')
    .sort((a, b) => b.values[selectedMonth] - a.values[selectedMonth])

  const handleExportCsv = () => {
    const rows = []
    rows.push([
      'Relatório do Período',
      `${format(parseISO(pStart), 'dd/MM/yyyy')} a ${format(parseISO(pEnd), 'dd/MM/yyyy')}`,
    ])
    rows.push([])

    rows.push(['RESUMO FINANCEIRO DE BENEFÍCIOS'])
    rows.push(['Benefício', 'Valor Total (R$)'])
    rows.push(['Ticket Alimentação', totalTicket.toFixed(2).replace('.', ',')])
    rows.push(['Vale Transporte', totalTransport.toFixed(2).replace('.', ',')])
    rows.push(['Total Geral', (totalTicket + totalTransport).toFixed(2).replace('.', ',')])
    rows.push([])

    rows.push(['RESUMO DA FOLHA DE PAGAMENTO E MERITOCRACIA'])
    rows.push(['Métrica', 'Valor'])
    rows.push(['Folha Bruta', totalBruto.toFixed(2).replace('.', ',')])
    rows.push(['Total Descontos', totalDescontos.toFixed(2).replace('.', ',')])
    rows.push(['Folha Líquida', totalLiquido.toFixed(2).replace('.', ',')])
    rows.push(['Média de Meritocracia', avgAvaliacoes.toFixed(1).replace('.', ',')])
    rows.push([])

    rows.push(['ACOMPANHAMENTO FUNCIONAL EVOLUTIVO (PROVENTOS)'])
    rows.push(['Evento', ...evolutivoMeses])
    evolutivoVencimentos.forEach((e) => {
      const row = [e.descricao]
      evolutivoMeses.forEach((m) => row.push((e.values[m] || 0).toFixed(2).replace('.', ',')))
      rows.push(row)
    })
    rows.push([])

    rows.push(['ACOMPANHAMENTO FUNCIONAL EVOLUTIVO (DESCONTOS)'])
    rows.push(['Evento', ...evolutivoMeses])
    evolutivoDescontos.forEach((e) => {
      const row = [e.descricao]
      evolutivoMeses.forEach((m) => row.push((e.values[m] || 0).toFixed(2).replace('.', ',')))
      rows.push(row)
    })
    rows.push([])

    rows.push(['CONTRACHEQUES (FOLHA DE PAGAMENTO)'])
    rows.push([
      'Colaborador',
      'Total Bruto (R$)',
      'Total Descontos (R$)',
      'Valor Líquido (R$)',
      'Assinado',
    ])
    data.contracheques.forEach((c) => {
      const ext = c.dados_extraidos
      const bruto = ext?.totais?.vencimentos || 0
      const desc = ext?.totais?.descontos || 0
      const liq = ext?.totais?.liquido || c.valor_liquido || 0
      rows.push([
        getUserName(c.colaborador_id),
        bruto.toFixed(2).replace('.', ','),
        desc.toFixed(2).replace('.', ','),
        liq.toFixed(2).replace('.', ','),
        c.assinado ? 'Sim' : 'Não',
      ])
    })
    rows.push([])

    rows.push(['AVALIAÇÕES (MERITOCRACIA)'])
    rows.push(['Colaborador', 'Pontualidade', 'Qualidade', 'Trabalho em Equipe', 'Média'])
    data.avaliacoes.forEach((a) => {
      const media = ((a.nota_pontualidade + a.nota_qualidade + a.nota_trabalho_equipe) / 3).toFixed(
        1,
      )
      rows.push([
        getUserName(a.colaborador_id),
        a.nota_pontualidade,
        a.nota_qualidade,
        a.nota_trabalho_equipe,
        media.replace('.', ','),
      ])
    })
    rows.push([])

    rows.push(['PLANTÕES'])
    rows.push(['Colaborador', 'Data', 'Período'])
    data.plantoes.forEach((p) =>
      rows.push([
        getUserName(p.colaborador_id),
        format(parseISO(p.data), 'dd/MM/yyyy'),
        p.periodo || 'Integral',
      ]),
    )
    rows.push([])

    const csvContent = '\uFEFF' + rows.map((e) => e.join(';')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_${selectedMonth}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Exportação concluída',
      description: 'O arquivo Excel (CSV) foi gerado com sucesso.',
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const formatNumber = (val: number) =>
    val ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'

  return (
    <div className="space-y-6 flex flex-col h-full pb-10 print:pb-0">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Relatórios e Análises</h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Período analisado:</span>
              <strong className="text-slate-700">
                {format(parseISO(pStart), 'dd/MM/yyyy')} a {format(parseISO(pEnd), 'dd/MM/yyyy')}
              </strong>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-[140px] h-8 text-xs font-medium bg-white shadow-sm"
          />
          <Button
            onClick={handleExportCsv}
            variant="outline"
            className="h-8 text-xs gap-1.5 bg-white"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel (CSV)
          </Button>
          <Button onClick={handlePrint} className="h-8 text-xs gap-1.5 shadow-sm">
            <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center print:hidden">
          <div className="text-sm text-slate-500">Carregando dados do relatório...</div>
        </div>
      ) : (
        <div className="grid gap-6 print:block print:space-y-6">
          <div className="hidden print:block mb-6">
            <h2 className="text-2xl font-bold">Relatório Mensal Consolidado</h2>
            <p className="text-sm text-slate-600">
              Período de Apuração: {format(parseISO(pStart), 'dd/MM/yyyy')} a{' '}
              {format(parseISO(pEnd), 'dd/MM/yyyy')}
            </p>
          </div>

          <h3 className="text-lg font-semibold text-slate-800 mb-0">
            Resumo da Folha e Meritocracia
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-4 print:mb-6">
            <Card className="border-slate-200 shadow-sm print:shadow-none print:border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Bruto</CardTitle>
                <Banknote className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  R$ {totalBruto.toFixed(2).replace('.', ',')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Folha bruta do mês</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm print:shadow-none print:border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Descontos</CardTitle>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  R$ {totalDescontos.toFixed(2).replace('.', ',')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total de descontos</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm print:shadow-none print:border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Líquido</CardTitle>
                <Activity className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">
                  R$ {totalLiquido.toFixed(2).replace('.', ',')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Líquido a pagar</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm print:shadow-none print:border bg-amber-50/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Média Meritocracia
                </CardTitle>
                <Star className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {avgAvaliacoes.toFixed(1)} / 5.0
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {avaliacoesCount} avaliações no período
                </p>
              </CardContent>
            </Card>
          </div>

          <h3 className="text-lg font-semibold text-slate-800 mt-4 mb-0">Resumo de Benefícios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-4 print:mb-6">
            <Card className="border-slate-200 shadow-sm print:shadow-none print:border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Ticket Alimentação
                </CardTitle>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">
                  R$ {totalTicket.toFixed(2).replace('.', ',')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Base: R$ {ticketValue.toFixed(2).replace('.', ',')}/dia
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm print:shadow-none print:border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Vale Transporte
                </CardTitle>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">
                  R$ {totalTransport.toFixed(2).replace('.', ',')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Base: R$ {transportValue.toFixed(2).replace('.', ',')}/dia
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm print:shadow-none print:border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Custo Total Benefícios
                </CardTitle>
                <Activity className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  R$ {(totalTicket + totalTransport).toFixed(2).replace('.', ',')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Soma dos benefícios no período</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm mt-6 print:shadow-none print:border print:break-inside-avoid">
            <CardHeader className="pb-4 border-b bg-slate-50/50 print:bg-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Acompanhamento Funcional (Evolutivo)
                </CardTitle>
                <CardDescription>
                  Análise mês a mês detalhada por eventos importados da folha
                </CardDescription>
              </div>
              <div className="print:hidden w-full sm:w-[250px]">
                <Select value={evolutivoUserId} onValueChange={setEvolutivoUserId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Visão Consolidada (Empresa)</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto print:overflow-visible">
              <Table>
                <TableHeader className="bg-slate-50 print:bg-transparent">
                  <TableRow>
                    <TableHead className="min-w-[200px]">Evento (Proventos)</TableHead>
                    {evolutivoMeses.map((m) => (
                      <TableHead key={`prov-m-${m}`} className="text-right min-w-[100px] text-xs">
                        {format(parseISO(`${m}-01`), 'MMM/yy', { locale: ptBR })}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evolutivoVencimentos.length > 0 ? (
                    evolutivoVencimentos.map((e, idx) => (
                      <TableRow key={`prov-${idx}`} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-700 text-xs">
                          {e.descricao}
                        </TableCell>
                        {evolutivoMeses.map((m) => (
                          <TableCell
                            key={`v-${m}`}
                            className="text-right text-green-600 font-medium text-xs"
                          >
                            {formatNumber(e.values[m])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={evolutivoMeses.length + 1}
                        className="text-center py-4 text-muted-foreground text-sm"
                      >
                        Nenhum provento registrado no período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>

                <TableHeader className="bg-slate-50 print:bg-transparent border-t-[20px] border-transparent">
                  <TableRow>
                    <TableHead className="min-w-[200px]">Evento (Descontos)</TableHead>
                    {evolutivoMeses.map((m) => (
                      <TableHead key={`desc-m-${m}`} className="text-right min-w-[100px] text-xs">
                        {format(parseISO(`${m}-01`), 'MMM/yy', { locale: ptBR })}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evolutivoDescontos.length > 0 ? (
                    evolutivoDescontos.map((e, idx) => (
                      <TableRow key={`desc-${idx}`} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-700 text-xs">
                          {e.descricao}
                        </TableCell>
                        {evolutivoMeses.map((m) => (
                          <TableCell
                            key={`d-${m}`}
                            className="text-right text-red-600 font-medium text-xs"
                          >
                            {formatNumber(e.values[m])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={evolutivoMeses.length + 1}
                        className="text-center py-4 text-muted-foreground text-sm"
                      >
                        Nenhum desconto registrado no período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 mt-6">
            <Card className="border-slate-200 shadow-sm print:shadow-none print:border print:break-inside-avoid">
              <CardHeader className="pb-2 border-b bg-slate-50/50 print:bg-transparent">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold">
                    Contracheques Processados ({data.contracheques.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-auto print:max-h-none print:overflow-visible">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 print:static print:bg-transparent">
                    <TableRow className="[&>th]:py-2">
                      <TableHead className="text-xs">Colaborador</TableHead>
                      <TableHead className="text-xs text-center">Assinado</TableHead>
                      <TableHead className="text-xs text-right">Líquido (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.contracheques.length > 0 ? (
                      data.contracheques.map((c) => {
                        const ext = c.dados_extraidos
                        const liq = ext?.totais?.liquido || c.valor_liquido || 0
                        return (
                          <TableRow key={c.id} className="[&>td]:py-2">
                            <TableCell className="text-xs font-medium text-slate-700">
                              {getUserName(c.colaborador_id)}
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              {c.assinado ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 inline-block" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-500 inline-block opacity-50" />
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-right font-medium">
                              {liq.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-xs text-slate-500 py-4">
                          Nenhum contracheque processado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm print:shadow-none print:border print:break-inside-avoid">
              <CardHeader className="pb-2 border-b bg-slate-50/50 print:bg-transparent">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <CardTitle className="text-sm font-semibold">
                    Avaliações de Meritocracia ({data.avaliacoes.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-auto print:max-h-none print:overflow-visible">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 print:static print:bg-transparent">
                    <TableRow className="[&>th]:py-2">
                      <TableHead className="text-xs">Colaborador</TableHead>
                      <TableHead className="text-xs text-center w-[80px]">Média</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.avaliacoes.length > 0 ? (
                      data.avaliacoes.map((a) => {
                        const media =
                          (a.nota_pontualidade + a.nota_qualidade + a.nota_trabalho_equipe) / 3
                        return (
                          <TableRow key={a.id} className="[&>td]:py-2">
                            <TableCell className="text-xs font-medium text-slate-700">
                              {getUserName(a.colaborador_id)}
                            </TableCell>
                            <TableCell className="text-xs text-center font-medium text-amber-600">
                              {media.toFixed(1)}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-xs text-slate-500 py-4">
                          Nenhuma avaliação no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm print:shadow-none print:border print:break-inside-avoid">
              <CardHeader className="pb-2 border-b bg-slate-50/50 print:bg-transparent">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <CardTitle className="text-sm font-semibold">
                    Plantões Registrados ({data.plantoes.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-auto print:max-h-none print:overflow-visible">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 print:static print:bg-transparent">
                    <TableRow className="[&>th]:py-2">
                      <TableHead className="text-xs">Colaborador</TableHead>
                      <TableHead className="text-xs">Período</TableHead>
                      <TableHead className="text-xs text-right w-[100px]">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.plantoes.length > 0 ? (
                      data.plantoes.map((p) => (
                        <TableRow key={p.id} className="[&>td]:py-2">
                          <TableCell className="text-xs font-medium text-slate-700">
                            {getUserName(p.colaborador_id)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {p.periodo || 'Integral'}
                          </TableCell>
                          <TableCell className="text-xs text-right text-slate-500">
                            {format(parseISO(p.data), 'dd/MM/yyyy')}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-xs text-slate-500 py-4">
                          Nenhum plantão no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm print:shadow-none print:border print:break-inside-avoid">
              <CardHeader className="pb-2 border-b bg-slate-50/50 print:bg-transparent">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <CardTitle className="text-sm font-semibold">
                    Faltas Inseridas ({data.faltas.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-auto print:max-h-none print:overflow-visible">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 print:static print:bg-transparent">
                    <TableRow className="[&>th]:py-2">
                      <TableHead className="text-xs">Colaborador</TableHead>
                      <TableHead className="text-xs text-right w-[100px]">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.faltas.length > 0 ? (
                      data.faltas.map((f) => (
                        <TableRow key={f.id} className="[&>td]:py-2">
                          <TableCell className="text-xs font-medium text-slate-700">
                            {getUserName(f.colaborador_id)}
                          </TableCell>
                          <TableCell className="text-xs text-right text-slate-500 text-red-600">
                            {format(parseISO(f.data), 'dd/MM/yyyy')}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-xs text-slate-500 py-4">
                          Nenhuma falta no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
