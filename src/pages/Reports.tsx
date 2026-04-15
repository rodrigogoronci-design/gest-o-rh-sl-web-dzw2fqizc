import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Printer,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  DollarSign,
  Activity,
  AlertTriangle,
  FileText,
  CalendarOff,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import useAppStore from '@/stores/useAppStore'

export default function Reports() {
  const { users } = useAppStore()
  const { toast } = useToast()

  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [isLoading, setIsLoading] = useState(false)

  const [data, setData] = useState({
    tickets: [] as any[],
    transports: [] as any[],
    plantoes: [] as any[],
    faltas: [] as any[],
    atestados: [] as any[],
    feriados: [] as any[],
  })

  const ticketValue = parseFloat(localStorage.getItem('ticketValue') || '31.59')
  const transportValue = parseFloat(localStorage.getItem('transportValue') || '10.20')

  const year = parseInt(selectedMonth.split('-')[0])
  const month = parseInt(selectedMonth.split('-')[1]) - 1
  const pStart = format(new Date(year, month - 1, 25), 'yyyy-MM-dd')
  const pEnd = format(new Date(year, month, 24), 'yyyy-MM-dd')

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
      ])

      setData({
        tickets: tickets || [],
        transports: transports || [],
        plantoes: plantoes || [],
        faltas: faltas || [],
        atestados: atestados || [],
        feriados: feriados || [],
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
    const eligible = Math.max(0, t.dias_uteis - t.ferias - t.atestados - t.faltas)
    totalTransport += eligible * transportValue
  })

  const handleExportCsv = () => {
    const rows = []
    rows.push([
      'Relatório do Período',
      `${format(parseISO(pStart), 'dd/MM/yyyy')} a ${format(parseISO(pEnd), 'dd/MM/yyyy')}`,
    ])
    rows.push([])

    rows.push(['RESUMO FINANCEIRO'])
    rows.push(['Benefício', 'Valor Total (R$)'])
    rows.push(['Ticket Alimentação', totalTicket.toFixed(2).replace('.', ',')])
    rows.push(['Vale Transporte', totalTransport.toFixed(2).replace('.', ',')])
    rows.push(['Total Geral', (totalTicket + totalTransport).toFixed(2).replace('.', ',')])
    rows.push([])

    rows.push(['PLANTÕES'])
    rows.push(['Colaborador', 'Data'])
    data.plantoes.forEach((p) =>
      rows.push([getUserName(p.colaborador_id), format(parseISO(p.data), 'dd/MM/yyyy')]),
    )
    rows.push([])

    rows.push(['FALTAS'])
    rows.push(['Colaborador', 'Data'])
    data.faltas.forEach((f) =>
      rows.push([getUserName(f.colaborador_id), format(parseISO(f.data), 'dd/MM/yyyy')]),
    )
    rows.push([])

    rows.push(['ATESTADOS'])
    rows.push(['Colaborador', 'Início', 'Fim', 'Dias'])
    data.atestados.forEach((a) =>
      rows.push([
        getUserName(a.colaborador_id),
        format(parseISO(a.data_inicio), 'dd/MM/yyyy'),
        format(parseISO(a.data_fim), 'dd/MM/yyyy'),
        a.quantidade_dias,
      ]),
    )
    rows.push([])

    rows.push(['FERIADOS'])
    rows.push(['Data', 'Descrição'])
    data.feriados.forEach((f) => rows.push([format(parseISO(f.data), 'dd/MM/yyyy'), f.descricao]))

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
            <h2 className="text-2xl font-bold">Relatório Mensal de Benefícios</h2>
            <p className="text-sm text-slate-600">
              Período de Apuração: {format(parseISO(pStart), 'dd/MM/yyyy')} a{' '}
              {format(parseISO(pEnd), 'dd/MM/yyyy')}
            </p>
          </div>

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
                <CardTitle className="text-sm font-medium text-slate-600">Custo Total</CardTitle>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
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
                          <TableCell className="text-xs text-right text-slate-500">
                            {format(parseISO(p.data), 'dd/MM/yyyy')}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-xs text-slate-500 py-4">
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

            <Card className="border-slate-200 shadow-sm print:shadow-none print:border print:break-inside-avoid">
              <CardHeader className="pb-2 border-b bg-slate-50/50 print:bg-transparent">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <CardTitle className="text-sm font-semibold">
                    Atestados Médicos ({data.atestados.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-auto print:max-h-none print:overflow-visible">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 print:static print:bg-transparent">
                    <TableRow className="[&>th]:py-2">
                      <TableHead className="text-xs">Colaborador</TableHead>
                      <TableHead className="text-xs text-center w-[160px]">Período</TableHead>
                      <TableHead className="text-xs text-right w-[60px]">Dias</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.atestados.length > 0 ? (
                      data.atestados.map((a) => (
                        <TableRow key={a.id} className="[&>td]:py-2">
                          <TableCell className="text-xs font-medium text-slate-700">
                            {getUserName(a.colaborador_id)}
                          </TableCell>
                          <TableCell className="text-xs text-center text-slate-500">
                            {format(parseISO(a.data_inicio), 'dd/MM')} a{' '}
                            {format(parseISO(a.data_fim), 'dd/MM')}
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">
                            {a.quantidade_dias}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-xs text-slate-500 py-4">
                          Nenhum atestado no período
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
                  <CalendarOff className="w-4 h-4 text-purple-500" />
                  <CardTitle className="text-sm font-semibold">
                    Feriados no Período ({data.feriados.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-auto print:max-h-none print:overflow-visible">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 print:static print:bg-transparent">
                    <TableRow className="[&>th]:py-2">
                      <TableHead className="text-xs w-[100px]">Data</TableHead>
                      <TableHead className="text-xs">Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.feriados.length > 0 ? (
                      data.feriados.map((f) => (
                        <TableRow key={f.id} className="[&>td]:py-2">
                          <TableCell className="text-xs font-medium text-slate-700">
                            {format(parseISO(f.data), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{f.descricao}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-xs text-slate-500 py-4">
                          Nenhum feriado no período
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
