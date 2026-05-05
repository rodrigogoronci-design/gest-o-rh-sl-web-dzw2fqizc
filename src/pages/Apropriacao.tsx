import { useState, useEffect } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isWeekend,
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

export default function Apropriacao() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [selectedColab, setSelectedColab] = useState<string>('')
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      let query = supabase.from('colaboradores').select('id, nome, jornada_diaria, departamento')
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

      for (const day of days) {
        const dayStr = format(day, 'yyyy-MM-dd')
        const isWknd = isWeekend(day)

        const dayPoints =
          pontoRes.data?.filter((p) => format(new Date(p.data_hora), 'yyyy-MM-dd') === dayStr) || []

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

        if (dayPoints.length === 0 && !isWknd) {
          const feriado = feriadosRes.data?.find((f) => f.data === dayStr)
          const afastamento = afastamentosRes.data?.find(
            (a) => dayStr >= a.data_inicio && dayStr <= a.data_fim,
          )
          const feria = feriasRes.data?.find((f) => dayStr >= f.data_inicio && dayStr <= f.data_fim)

          if (feriado) motivo = 'Feriado'
          else if (afastamento) motivo = 'Afastamento'
          else if (feria) motivo = 'Férias'
          else isFalta = true
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
  const colabName = colaboradores.find((c) => c.id === selectedColab)?.nome || ''

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
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
          <div id="printable-area">
            <div className="hidden print:block mb-8 text-center">
              <h2 className="text-2xl font-bold">Relatório de Apropriação de Horas</h2>
              <p className="text-lg mt-2">Funcionário: {colabName}</p>
              <p className="text-md">
                Período: {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </p>
            </div>

            <Card className="overflow-hidden border-none shadow-none sm:border sm:shadow-sm">
              <CardContent className="p-0 sm:p-0">
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Data</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Saída Int.</TableHead>
                        <TableHead>Retorno Int.</TableHead>
                        <TableHead>Saída</TableHead>
                        <TableHead className="text-right">H. Normais</TableHead>
                        <TableHead className="text-right">H. Extras</TableHead>
                        <TableHead className="text-right">H. Noturnas</TableHead>
                        <TableHead className="text-center">Status</TableHead>
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
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(r.date, 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>{formatTime(r.entrada)}</TableCell>
                          <TableCell>{formatTime(r.saidaIntervalo)}</TableCell>
                          <TableCell>{formatTime(r.retornoIntervalo)}</TableCell>
                          <TableCell>{formatTime(r.saida)}</TableCell>
                          <TableCell className="text-right">
                            {r.horasNormais > 0 ? r.horasNormais.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {r.horasExtras > 0 ? r.horasExtras.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {r.horasNoturnas > 0 ? r.horasNoturnas.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {r.falta ? (
                              <span className="text-red-600 font-semibold text-xs bg-red-100 px-2 py-1 rounded">
                                Falta
                              </span>
                            ) : r.motivoFalta ? (
                              <span className="text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded">
                                {r.motivoFalta}
                              </span>
                            ) : (
                              <span className="text-green-600 text-xs bg-green-100 px-2 py-1 rounded">
                                OK
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter className="bg-slate-900 text-white font-medium">
                      <TableRow>
                        <TableCell colSpan={5}>Totais do Período</TableCell>
                        <TableCell className="text-right">{totals.normais.toFixed(2)}h</TableCell>
                        <TableCell className="text-right">{totals.extras.toFixed(2)}h</TableCell>
                        <TableCell className="text-right">{totals.noturnas.toFixed(2)}h</TableCell>
                        <TableCell className="text-center">{totals.faltas} faltas</TableCell>
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
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3 border-b pb-2">
                          <div className="font-semibold text-slate-800">
                            {format(r.date, 'dd/MM/yyyy')}
                          </div>
                          <div>
                            {r.falta ? (
                              <span className="text-red-600 font-semibold text-xs bg-red-100 px-2 py-1 rounded">
                                Falta
                              </span>
                            ) : r.motivoFalta ? (
                              <span className="text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded">
                                {r.motivoFalta}
                              </span>
                            ) : (
                              <span className="text-green-600 text-xs bg-green-100 px-2 py-1 rounded">
                                OK
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <span className="text-slate-500">Entrada:</span> {formatTime(r.entrada)}
                          </div>
                          <div>
                            <span className="text-slate-500">Saída:</span> {formatTime(r.saida)}
                          </div>
                          <div>
                            <span className="text-slate-500">S. Int:</span>{' '}
                            {formatTime(r.saidaIntervalo)}
                          </div>
                          <div>
                            <span className="text-slate-500">R. Int:</span>{' '}
                            {formatTime(r.retornoIntervalo)}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm bg-slate-100/50 p-2 rounded">
                          <div className="text-center">
                            <div className="text-xs text-slate-500">Normais</div>
                            <div className="font-medium">
                              {r.horasNormais > 0 ? r.horasNormais.toFixed(1) : '-'}
                            </div>
                          </div>
                          <div className="text-center border-l border-r border-slate-200">
                            <div className="text-xs text-slate-500">Extras</div>
                            <div className="font-medium">
                              {r.horasExtras > 0 ? r.horasExtras.toFixed(1) : '-'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-slate-500">Noturnas</div>
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
          </div>
        )
      )}
    </div>
  )
}
