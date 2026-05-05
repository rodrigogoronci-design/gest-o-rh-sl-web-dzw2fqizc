import { useState, useEffect } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isWeekend,
  startOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, FileText, RefreshCcw, Download } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

interface DailyRecord {
  date: Date
  entrada: Date | null
  saidaIntervalo: Date | null
  retornoIntervalo: Date | null
  saida: Date | null
  horasNormais: number
  horasExtras: number
  horasNoturnas: number
  falta: boolean
  motivoFalta?: string
  isFuture: boolean
  hasPoints: boolean
}

function getNightOverlap(start: Date, end: Date) {
  let ms = 0
  const s = start.getTime()
  const e = end.getTime()

  const n1Start = new Date(start)
  n1Start.setDate(n1Start.getDate() - 1)
  n1Start.setHours(22, 0, 0, 0)
  const n1End = new Date(start)
  n1End.setHours(5, 0, 0, 0)
  ms += Math.max(0, Math.min(e, n1End.getTime()) - Math.max(s, n1Start.getTime()))

  const n2Start = new Date(start)
  n2Start.setHours(22, 0, 0, 0)
  const n2End = new Date(start)
  n2End.setDate(n2End.getDate() + 1)
  n2End.setHours(5, 0, 0, 0)
  ms += Math.max(0, Math.min(e, n2End.getTime()) - Math.max(s, n2Start.getTime()))

  return ms
}

function decimalToTime(dec: number) {
  if (!dec || dec === 0) return '00:00'
  const h = Math.floor(dec)
  const m = Math.round((dec - h) * 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export default function Apropriacao() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [selectedColab, setSelectedColab] = useState<string>('')
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [logoUrl, setLogoUrl] = useState('')
  const [empresaNome, setEmpresaNome] = useState('Gestão RH SL Web')

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('configuracoes')
        .select('*')
        .in('chave', ['app_logo', 'app_name'])
      if (data) {
        const logo = data.find((d) => d.chave === 'app_logo')?.valor as any
        if (logo?.url) setLogoUrl(logo.url)
        const name = data.find((d) => d.chave === 'app_name')?.valor as any
        if (name?.text) setEmpresaNome(name.text)
      }
    }
    fetchConfig()
  }, [])

  useEffect(() => {
    if (!user) return
    const fetchRoleAndColabs = async () => {
      const { data: myColab } = await supabase
        .from('colaboradores')
        .select('role, departamento, id')
        .eq('user_id', user.id)
        .single()
      const role = myColab?.role?.toLowerCase() || ''
      const isManager = role === 'admin' || role === 'administrador' || role === 'gerente'

      let query = supabase
        .from('colaboradores')
        .select(
          'id, nome, jornada_diaria, departamento, cpf, data_admissao, cargo, codigo_funcionario, jornada_entrada, jornada_saida_intervalo, jornada_retorno_intervalo, jornada_saida',
        )
      if (!isManager) {
        query = query.eq('id', myColab?.id)
      } else if (role === 'gerente') {
        query = query.eq('departamento', myColab?.departamento)
      }

      const { data } = await query.order('nome')
      if (data) {
        setColaboradores(data)
        if (data.length > 0) {
          setSelectedColab(data[0].id)
        }
      }
    }
    fetchRoleAndColabs()
  }, [user])

  const fetchRecords = async () => {
    if (!selectedColab) {
      setRecords([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const start = startOfMonth(currentDate).toISOString()
      const end = endOfMonth(currentDate).toISOString()

      const [pontoRes, afastamentosRes, feriadosRes, feriasRes, colabRes] = await Promise.all([
        supabase
          .from('registro_ponto')
          .select('*')
          .eq('colaborador_id', selectedColab)
          .gte('data_hora', start)
          .lte('data_hora', end)
          .order('data_hora', { ascending: true }),
        supabase
          .from('afastamentos')
          .select('*')
          .eq('colaborador_id', selectedColab)
          .lte('data_inicio', end)
          .gte('data_fim', start),
        supabase.from('feriados').select('*').gte('data', start).lte('data', end),
        supabase
          .from('ferias')
          .select('*')
          .eq('colaborador_id', selectedColab)
          .lte('data_inicio', end)
          .gte('data_fim', start),
        supabase.from('colaboradores').select('jornada_diaria').eq('id', selectedColab).single(),
      ])

      if (pontoRes.error) throw pontoRes.error

      const jornadaDiaria = colabRes.data?.jornada_diaria || 8
      const days = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      })
      const newRecords: DailyRecord[] = []
      const today = startOfDay(new Date())

      for (const day of days) {
        const dayStr = format(day, 'yyyy-MM-dd')
        const isWknd = isWeekend(day)
        const isFutureDay = day > today

        const dayPoints =
          pontoRes.data?.filter((p) => format(new Date(p.data_hora), 'yyyy-MM-dd') === dayStr) || []

        const hasPoints = dayPoints.length > 0

        const normalize = (t: string) => t.toLowerCase().replace('í', 'i')

        const entrada = dayPoints.find((p) => normalize(p.tipo_registro) === 'entrada')?.data_hora
        const saidaIntervalo = dayPoints.find(
          (p) =>
            normalize(p.tipo_registro) === 'saida_intervalo' ||
            normalize(p.tipo_registro) === 'saida intervalo',
        )?.data_hora
        const retornoIntervalo = dayPoints.find(
          (p) =>
            normalize(p.tipo_registro) === 'retorno_intervalo' ||
            normalize(p.tipo_registro) === 'retorno intervalo',
        )?.data_hora
        const saida = dayPoints.find((p) => normalize(p.tipo_registro) === 'saida')?.data_hora

        let workedMs = 0
        let nightMs = 0

        if (entrada && saidaIntervalo) {
          workedMs += new Date(saidaIntervalo).getTime() - new Date(entrada).getTime()
          nightMs += getNightOverlap(new Date(entrada), new Date(saidaIntervalo))
        } else if (entrada && saida && !saidaIntervalo) {
          workedMs += new Date(saida).getTime() - new Date(entrada).getTime()
          nightMs += getNightOverlap(new Date(entrada), new Date(saida))
        }

        if (retornoIntervalo && saida) {
          workedMs += new Date(saida).getTime() - new Date(retornoIntervalo).getTime()
          nightMs += getNightOverlap(new Date(retornoIntervalo), new Date(saida))
        }

        const totalHours = workedMs / (1000 * 60 * 60)
        const nightHours = nightMs / (1000 * 60 * 60)

        const horasNormais = Math.min(totalHours, jornadaDiaria)
        const horasExtras = Math.max(totalHours - jornadaDiaria, 0)

        let isFalta = false
        let motivo = ''

        if (!hasPoints) {
          const feriado = feriadosRes.data?.find((f) => f.data === dayStr)
          const afastamento = afastamentosRes.data?.find(
            (a) => dayStr >= a.data_inicio && dayStr <= a.data_fim,
          )
          const feria = feriasRes.data?.find((f) => dayStr >= f.data_inicio && dayStr <= f.data_fim)

          if (feriado) motivo = 'Feriado'
          else if (afastamento) motivo = 'Afastamento'
          else if (feria) motivo = 'Férias'
          else if (!isWknd && !isFutureDay) isFalta = true
        }

        newRecords.push({
          date: day,
          entrada: entrada ? new Date(entrada) : null,
          saidaIntervalo: saidaIntervalo ? new Date(saidaIntervalo) : null,
          retornoIntervalo: retornoIntervalo ? new Date(retornoIntervalo) : null,
          saida: saida ? new Date(saida) : null,
          horasNormais,
          horasExtras,
          horasNoturnas: nightHours,
          falta: isFalta,
          motivoFalta: motivo,
          isFuture: isFutureDay,
          hasPoints,
        })
      }
      setRecords(newRecords)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [selectedColab, currentDate])

  const totals = records.reduce(
    (acc, r) => ({
      normais: acc.normais + r.horasNormais,
      extras: acc.extras + r.horasExtras,
      noturnas: acc.noturnas + r.horasNoturnas,
      faltas: acc.faltas + (r.falta ? 1 : 0),
    }),
    { normais: 0, extras: 0, noturnas: 0, faltas: 0 },
  )

  const handlePrint = () => window.print()
  const formatTime = (d: Date | null) => (d ? format(d, 'HH:mm') : '-')
  const colabSelected = colaboradores.find((c) => c.id === selectedColab)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4 portrait; }
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
          .print-bg-gray { background-color: #e5e7eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { border-collapse: collapse; width: 100%; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Apropriação de Horas</h1>
          <p className="text-slate-500 mt-1">Cálculo e consolidação da jornada de trabalho.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold text-center min-w-[140px] capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </div>
          <Button variant="outline" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-1/3">
            <label className="text-sm font-medium mb-1 block text-slate-700">Funcionário</label>
            <Select value={selectedColab} onValueChange={setSelectedColab}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handlePrint}
            disabled={records.length === 0 || isLoading}
            className="w-full sm:w-auto ml-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            Gerar Relatório PDF
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 print:hidden">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchRecords}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card className="print:hidden">
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : records.length === 0 && !error ? (
        <Card className="print:hidden">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center text-slate-500">
            <FileText className="w-12 h-12 mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-900">Nenhum registro para este período</p>
            <p className="text-sm">Selecione um funcionário ou altere o mês para visualizar.</p>
          </CardContent>
        </Card>
      ) : (
        !error && (
          <>
            {/* View Normal Web */}
            <Card className="print:hidden overflow-hidden border-none shadow-none sm:border sm:shadow-sm">
              <CardContent className="p-0 sm:p-0">
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="px-2 py-2">Data</TableHead>
                        <TableHead className="px-2 py-2">Entrada</TableHead>
                        <TableHead className="px-2 py-2">Saída Int.</TableHead>
                        <TableHead className="px-2 py-2">Retorno Int.</TableHead>
                        <TableHead className="px-2 py-2">Saída</TableHead>
                        <TableHead className="px-2 py-2 text-right">H. Normais</TableHead>
                        <TableHead className="px-2 py-2 text-right">H. Extras</TableHead>
                        <TableHead className="px-2 py-2 text-right">H. Noturnas</TableHead>
                        <TableHead className="px-2 py-2 text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r, i) => (
                        <TableRow
                          key={i}
                          className={
                            r.falta ? 'bg-red-50/50' : isWeekend(r.date) ? 'bg-slate-50/50' : ''
                          }
                        >
                          <TableCell className="px-2 py-1 font-medium whitespace-nowrap">
                            {format(r.date, 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="px-2 py-1">{formatTime(r.entrada)}</TableCell>
                          <TableCell className="px-2 py-1">
                            {formatTime(r.saidaIntervalo)}
                          </TableCell>
                          <TableCell className="px-2 py-1">
                            {formatTime(r.retornoIntervalo)}
                          </TableCell>
                          <TableCell className="px-2 py-1">{formatTime(r.saida)}</TableCell>
                          <TableCell className="px-2 py-1 text-right">
                            {r.horasNormais > 0 ? r.horasNormais.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-right">
                            {r.horasExtras > 0 ? r.horasExtras.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-right">
                            {r.horasNoturnas > 0 ? r.horasNoturnas.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-center">
                            {r.falta ? (
                              <span className="text-red-600 font-semibold text-[10px] bg-red-100 px-1.5 py-0.5 rounded">
                                Falta
                              </span>
                            ) : r.motivoFalta ? (
                              <span className="text-slate-600 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {r.motivoFalta}
                              </span>
                            ) : !r.hasPoints ? (
                              <span className="text-slate-400 text-[10px]">-</span>
                            ) : (
                              <span className="text-green-600 text-[10px] bg-green-100 px-1.5 py-0.5 rounded">
                                OK
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter className="bg-slate-900 text-white font-medium">
                      <TableRow>
                        <TableCell colSpan={5} className="px-2 py-2">
                          Totais do Período
                        </TableCell>
                        <TableCell className="px-2 py-2 text-right">
                          {totals.normais.toFixed(2)}h
                        </TableCell>
                        <TableCell className="px-2 py-2 text-right">
                          {totals.extras.toFixed(2)}h
                        </TableCell>
                        <TableCell className="px-2 py-2 text-right">
                          {totals.noturnas.toFixed(2)}h
                        </TableCell>
                        <TableCell className="px-2 py-2 text-center">
                          {totals.faltas} faltas
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>

                <div className="md:hidden flex flex-col gap-3 p-4 bg-slate-50">
                  {records.map((r, i) => (
                    <Card
                      key={i}
                      className={`shadow-sm ${r.falta ? 'border-red-200 bg-red-50' : isWeekend(r.date) ? 'border-slate-200 bg-slate-50' : ''}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center mb-2 border-b pb-1">
                          <div className="font-semibold text-slate-800 text-sm">
                            {format(r.date, 'dd/MM/yyyy')}
                          </div>
                          <div>
                            {r.falta ? (
                              <span className="text-red-600 font-semibold text-[10px] bg-red-100 px-1.5 py-0.5 rounded">
                                Falta
                              </span>
                            ) : r.motivoFalta ? (
                              <span className="text-slate-600 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {r.motivoFalta}
                              </span>
                            ) : !r.hasPoints ? (
                              <span className="text-slate-400 text-[10px]">-</span>
                            ) : (
                              <span className="text-green-600 text-[10px] bg-green-100 px-1.5 py-0.5 rounded">
                                OK
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1 text-xs mb-2">
                          <div>
                            <span className="block text-slate-500 text-[10px]">Ent</span>{' '}
                            {formatTime(r.entrada)}
                          </div>
                          <div>
                            <span className="block text-slate-500 text-[10px]">S.I</span>{' '}
                            {formatTime(r.saidaIntervalo)}
                          </div>
                          <div>
                            <span className="block text-slate-500 text-[10px]">R.I</span>{' '}
                            {formatTime(r.retornoIntervalo)}
                          </div>
                          <div>
                            <span className="block text-slate-500 text-[10px]">Sai</span>{' '}
                            {formatTime(r.saida)}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-xs bg-slate-100/50 p-1.5 rounded">
                          <div className="text-center">
                            <div className="text-[10px] text-slate-500">Normais</div>
                            <div className="font-medium">
                              {r.horasNormais > 0 ? r.horasNormais.toFixed(1) : '-'}
                            </div>
                          </div>
                          <div className="text-center border-l border-r border-slate-200">
                            <div className="text-[10px] text-slate-500">Extras</div>
                            <div className="font-medium">
                              {r.horasExtras > 0 ? r.horasExtras.toFixed(1) : '-'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-slate-500">Noturnas</div>
                            <div className="font-medium">
                              {r.horasNoturnas > 0 ? r.horasNoturnas.toFixed(1) : '-'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Card className="bg-slate-900 text-white mt-4 border-none shadow-md">
                    <CardContent className="p-4">
                      <h3 className="font-bold mb-3 pb-2 border-b border-slate-700">
                        Totais do Período
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-slate-400 text-sm">H. Normais</div>
                          <div className="text-xl font-bold">{totals.normais.toFixed(2)}h</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-sm">H. Extras</div>
                          <div className="text-xl font-bold text-yellow-400">
                            {totals.extras.toFixed(2)}h
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-sm">H. Noturnas</div>
                          <div className="text-xl font-bold text-blue-400">
                            {totals.noturnas.toFixed(2)}h
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-sm">Faltas</div>
                          <div className="text-xl font-bold text-red-400">{totals.faltas}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Printable View (hidden on screen) */}
            <div
              id="printable-area"
              className="hidden print:block text-[11px] text-black font-sans leading-tight"
            >
              <div className="flex justify-between items-end mb-4 border-b border-black pb-2">
                <div>
                  <h2 className="text-2xl font-bold uppercase tracking-tight">Folha de Ponto</h2>
                  <p className="text-sm mt-1">
                    {format(startOfMonth(currentDate), 'dd/MM/yyyy')} a{' '}
                    {format(endOfMonth(currentDate), 'dd/MM/yyyy')}
                  </p>
                </div>
                {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 object-contain" />}
              </div>

              {/* DADOS DO EMPREGADOR */}
              <div className="border border-black mb-3">
                <div className="print-bg-gray font-bold border-b border-black px-2 py-0.5 uppercase text-xs">
                  Dados do Empregador
                </div>
                <div className="grid grid-cols-4 gap-2 p-2">
                  <div className="col-span-3">
                    <span className="text-gray-600">Nome:</span> {empresaNome}
                  </div>
                  <div>
                    <span className="text-gray-600">CNPJ:</span> -
                  </div>
                  <div className="col-span-3">
                    <span className="text-gray-600">Endereço:</span> -
                  </div>
                  <div>
                    <span className="text-gray-600">Local:</span>{' '}
                    {colabSelected?.departamento || '-'}
                  </div>
                </div>
              </div>

              {/* DADOS DO COLABORADOR */}
              <div className="border border-black mb-3">
                <div className="print-bg-gray font-bold border-b border-black px-2 py-0.5 uppercase text-xs">
                  Dados do Colaborador
                </div>
                <div className="grid grid-cols-4 gap-y-1 gap-x-2 p-2">
                  <div className="col-span-2">
                    <span className="text-gray-600">Nome:</span> {colabSelected?.nome}
                  </div>
                  <div>
                    <span className="text-gray-600">CPF:</span> {colabSelected?.cpf || '-'}
                  </div>
                  <div>
                    <span className="text-gray-600">Código:</span>{' '}
                    {colabSelected?.codigo_funcionario || '-'}
                  </div>

                  <div>
                    <span className="text-gray-600">Admissão:</span>{' '}
                    {colabSelected?.data_admissao
                      ? format(new Date(colabSelected.data_admissao), 'dd/MM/yyyy')
                      : '-'}
                  </div>
                  <div>
                    <span className="text-gray-600">CTPS:</span> -{' '}
                    <span className="text-gray-600 ml-2">Série:</span> -
                  </div>
                  <div>
                    <span className="text-gray-600">Função:</span> {colabSelected?.cargo || '-'}
                  </div>
                  <div>
                    <span className="text-gray-600">Centro de Custo:</span> -
                  </div>
                </div>
              </div>

              {/* QUADRO DE HORÁRIOS */}
              <div className="border border-black mb-3 text-center">
                <div className="print-bg-gray font-bold border-b border-black px-2 py-0.5 text-xs">
                  Quadro de Horários
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="border-r border-black font-semibold py-1">Dia</th>
                      <th className="border-r border-black font-semibold py-1">PERÍODO 1</th>
                      <th className="border-r border-black font-semibold py-1">PERÍODO 2</th>
                      <th className="border-r border-black font-semibold py-1">PERÍODO 3</th>
                      <th className="border-r border-black font-semibold py-1">PERÍODO 4</th>
                      <th className="border-r border-black font-semibold py-1">Total</th>
                      <th className="font-semibold py-1">Local de Trabalho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      'Segunda-feira',
                      'Terça-feira',
                      'Quarta-feira',
                      'Quinta-feira',
                      'Sexta-feira',
                    ].map((dia) => (
                      <tr key={dia} className="border-b border-black last:border-0">
                        <td className="border-r border-black py-0.5">{dia}</td>
                        <td className="border-r border-black py-0.5">
                          {colabSelected?.jornada_entrada && colabSelected?.jornada_saida_intervalo
                            ? `${colabSelected.jornada_entrada} às ${colabSelected.jornada_saida_intervalo}`
                            : '-'}
                        </td>
                        <td className="border-r border-black py-0.5">
                          {colabSelected?.jornada_retorno_intervalo && colabSelected?.jornada_saida
                            ? `${colabSelected.jornada_retorno_intervalo} às ${colabSelected.jornada_saida}`
                            : '-'}
                        </td>
                        <td className="border-r border-black py-0.5">-</td>
                        <td className="border-r border-black py-0.5">-</td>
                        <td className="border-r border-black py-0.5">
                          {colabSelected?.jornada_diaria
                            ? decimalToTime(colabSelected.jornada_diaria)
                            : '-'}
                        </td>
                        <td className="py-0.5">{colabSelected?.departamento || 'Suporte'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* REGISTROS DIÁRIOS */}
              <table className="w-full mb-3 border-t border-b border-black">
                <thead>
                  <tr className="border-b border-black print-bg-gray">
                    <th className="text-left font-semibold py-1 px-1">DIA / MÊS</th>
                    <th className="text-left font-semibold py-1 px-1">PONTOS</th>
                    <th className="text-center font-semibold py-1 px-1">TRABALHADAS</th>
                    <th className="text-center font-semibold py-1 px-1">ABONO</th>
                    <th className="text-center font-semibold py-1 px-1">PREVISTAS</th>
                    <th className="text-center font-semibold py-1 px-1">ATRASO</th>
                    <th className="text-center font-semibold py-1 px-1">EXTRAS</th>
                    <th className="text-center font-semibold py-1 px-1">FALTAS</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const isWknd = isWeekend(r.date)
                    const diaStr = format(r.date, 'dd/MM')
                    const diaSemana = format(r.date, 'EEEE', { locale: ptBR })

                    let pontosStr = '-'
                    if (r.falta) pontosStr = 'FALTA NAO JUSTIFICADA'
                    else if (r.motivoFalta === 'Feriado') pontosStr = 'FERIADO: Feriado'
                    else if (r.motivoFalta) pontosStr = r.motivoFalta.toUpperCase()
                    else if (r.hasPoints) {
                      const times = [r.entrada, r.saidaIntervalo, r.retornoIntervalo, r.saida]
                        .filter(Boolean)
                        .map((d) => format(d!, 'HH:mm'))
                      if (times.length > 0) pontosStr = times.join('  ')
                    }

                    const previstas = !isWknd
                      ? decimalToTime(colabSelected?.jornada_diaria || 8)
                      : '-'
                    const trabalhadas = r.horasNormais > 0 ? decimalToTime(r.horasNormais) : '-'
                    const extras = r.horasExtras > 0 ? decimalToTime(r.horasExtras) : '-'
                    let faltas = '-'
                    if (r.falta && !isWknd) faltas = `-${previstas}`

                    return (
                      <tr key={i} className="border-b border-dashed border-gray-400 last:border-0">
                        <td className="py-0.5 px-1 w-[120px]">
                          {diaStr} <span className="text-gray-500 ml-1">{diaSemana}</span>
                        </td>
                        <td className="py-0.5 px-1">{pontosStr}</td>
                        <td className="text-center py-0.5 px-1">{trabalhadas}</td>
                        <td className="text-center py-0.5 px-1">-</td>
                        <td className="text-center py-0.5 px-1">{previstas}</td>
                        <td className="text-center py-0.5 px-1">-</td>
                        <td className="text-center py-0.5 px-1">{extras}</td>
                        <td className="text-center py-0.5 px-1">{faltas}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* TOTAIS DA TABELA */}
              <div className="flex justify-end gap-16 border-b border-black pb-1 mb-2 font-semibold">
                <div>Total:</div>
                <div className="flex gap-12 mr-[10%]">
                  <div>{decimalToTime(totals.normais)}</div>
                  <div>00:00</div>
                  <div>
                    {decimalToTime(
                      records.filter((r) => !isWeekend(r.date)).length *
                        (colabSelected?.jornada_diaria || 8),
                    )}
                  </div>
                  <div>-{decimalToTime(totals.faltas * (colabSelected?.jornada_diaria || 8))}</div>
                </div>
              </div>
              <div className="flex justify-center gap-16 border-b border-black pb-1 mb-4 font-semibold">
                <div>
                  Trabalhadas + Abono:{' '}
                  <span className="ml-2 font-normal">{decimalToTime(totals.normais)}</span>
                </div>
                <div>
                  Saldo:{' '}
                  <span className="ml-2 font-normal">
                    -{decimalToTime(totals.faltas * (colabSelected?.jornada_diaria || 8))}
                  </span>
                </div>
              </div>

              {/* RODAPÉ RESUMO */}
              <div className="grid grid-cols-2 gap-8 mb-8 text-[11px]">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Hora extra diurna:</span>
                    <span>-</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipo Hora Extra 01:</span>
                    <span>-</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipo Hora Extra 02:</span>
                    <span>-</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipo Hora Extra 03:</span>
                    <span>-</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipo Hora Extra 04:</span>
                    <span>-</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Horas Extras Totais:</span>
                    <span>{decimalToTime(totals.extras)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Atrasos:</span>
                    <span>-</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Dias Faltosos:</span>
                    <span>{totals.faltas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Faltas em Horas:</span>
                    <span>
                      {decimalToTime(totals.faltas * (colabSelected?.jornada_diaria || 8))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horas Sobreaviso:</span>
                    <span>-</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horas Trabalhadas no Sobreaviso:</span>
                    <span>-</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horas Não-Trabalhadas no Sobreaviso:</span>
                    <span>-</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horas Noturnas:</span>
                    <span>{decimalToTime(totals.noturnas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horas Ficta:</span>
                    <span>-</span>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                Reconheço a exatidão e confirmo a frequência constante deste cartão.
              </div>

              <div className="grid grid-cols-2 gap-16 text-center">
                <div>
                  <div className="border-t border-black pt-2 uppercase">{colabSelected?.nome}</div>
                </div>
                <div>
                  <div className="border-t border-black pt-2 uppercase">{empresaNome}</div>
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  )
}
