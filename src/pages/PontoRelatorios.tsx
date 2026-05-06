import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { DailyRecord, exportToCSV, formatTime, formatHours } from '@/lib/ponto-utils'
import { FolhaPontoTab } from '@/components/ponto/FolhaPontoTab'
import { HorasExtrasTab } from '@/components/ponto/HorasExtrasTab'

export default function PontoRelatorios() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [colaboradorId, setColaboradorId] = useState('all')
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [heType, setHeType] = useState('todas')

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        let colabs = colaboradores
        if (colabs.length === 0) {
          const { data } = await supabase
            .from('colaboradores')
            .select('id, nome, salario')
            .order('nome')
          if (data) {
            colabs = data
            setColaboradores(data)
          }
        }

        const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
        const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

        const [pontoRes, faltasRes] = await Promise.all([
          supabase
            .from('registro_ponto')
            .select('*')
            .gte('data_hora', start)
            .lte('data_hora', end + 'T23:59:59'),
          supabase.from('faltas').select('*').gte('data', start).lte('data', end),
        ])

        const records = pontoRes.data || []
        const faltas = faltasRes.data || []
        const days = eachDayOfInterval({
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        })

        let finalRecords: DailyRecord[] = []
        const targetColabs =
          colaboradorId === 'all' ? colabs : colabs.filter((c) => c.id === colaboradorId)

        targetColabs.forEach((colab) => {
          const colabFaltas = faltas.filter((f) => f.colaborador_id === colab.id)
          const colabPonto = records.filter((r) => r.colaborador_id === colab.id)

          days.forEach((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayPonto = colabPonto.filter((p) => p.data_hora.startsWith(dayStr))
            const faltou = colabFaltas.some((f) => f.data === dayStr)

            if (dayPonto.length === 0 && !faltou) return

            const entrada = dayPonto.find((p) => p.tipo_registro === 'entrada')?.data_hora
            const saidaIntervalo = dayPonto.find(
              (p) => p.tipo_registro === 'saida_intervalo' || p.tipo_registro === 'intervalo_saida',
            )?.data_hora
            const retornoIntervalo = dayPonto.find(
              (p) =>
                p.tipo_registro === 'retorno_intervalo' || p.tipo_registro === 'intervalo_retorno',
            )?.data_hora
            const saida = dayPonto.find((p) => p.tipo_registro === 'saida')?.data_hora

            let workedMs = 0
            let intervalMs = 0
            if (entrada && saida) {
              workedMs = new Date(saida).getTime() - new Date(entrada).getTime()
              if (saidaIntervalo && retornoIntervalo) {
                intervalMs =
                  new Date(retornoIntervalo).getTime() - new Date(saidaIntervalo).getTime()
                workedMs -= intervalMs
              }
            }
            const workedHours = workedMs / (1000 * 60 * 60)
            let horasNormais = 0
            let horasExtras = 0
            if (workedHours > 0) {
              if (workedHours > 8) {
                horasNormais = 8
                horasExtras = workedHours - 8
              } else {
                horasNormais = workedHours
              }
            }

            let horasNoturnas = 0
            if (saida && new Date(saida).getHours() >= 22) {
              const outDate = new Date(saida)
              horasNoturnas = outDate.getHours() - 22 + outDate.getMinutes() / 60
              if (horasNoturnas < 0) horasNoturnas = 0
            }

            let intervaloStr = '-'
            if (intervalMs > 0) {
              const im = Math.floor(intervalMs / 60000)
              intervaloStr = `${Math.floor(im / 60)}h ${im % 60}m`
            }

            finalRecords.push({
              colaboradorId: colab.id,
              colaboradorNome: colab.nome,
              salario: colab.salario || 1500,
              data: dayStr,
              entrada,
              saidaIntervalo,
              retornoIntervalo,
              saida,
              intervalo: intervaloStr,
              horasNormais,
              horasExtras,
              horasNoturnas,
              faltou,
              observacoes: faltou ? 'Falta Registrada' : '',
            })
          })
        })

        finalRecords.sort((a, b) => a.data.localeCompare(b.data))
        setDailyRecords(finalRecords)
      } catch (err) {
        console.error(err)
        toast.error('Erro ao carregar dados.')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [currentDate, colaboradorId])

  const handleExportPDF = () => {
    toast.success('Relatório gerado com sucesso!')
    window.print()
  }

  const handleExportExcel = () => {
    const headers = [
      'Data',
      'Colaborador',
      'Entrada',
      'Saída',
      'Intervalo',
      'H. Normais',
      'H. Extras',
      'Faltas',
    ]
    const rows = dailyRecords.map((r) => [
      format(new Date(r.data), 'dd/MM/yyyy'),
      r.colaboradorNome,
      formatTime(r.entrada),
      formatTime(r.saida),
      r.intervalo,
      formatHours(r.horasNormais),
      formatHours(r.horasExtras),
      r.faltou ? 'Sim' : 'Não',
    ])
    exportToCSV(headers, rows, `relatorio_ponto_${format(currentDate, 'yyyy-MM')}.csv`)
    toast.success('Relatório Excel gerado com sucesso!')
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in-up pb-24">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col xl:flex-row justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Relatórios de Ponto</h1>
          <p className="text-slate-500">Folha de ponto e horas extras detalhadas.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1 shadow-sm h-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentDate((d) => subMonths(d, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-4 font-medium min-w-[140px] text-center capitalize">
              {format(currentDate, 'MMM yyyy', { locale: ptBR })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentDate((d) => addMonths(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select value={colaboradorId} onValueChange={setColaboradorId}>
            <SelectTrigger className="w-full sm:w-[220px] h-10 bg-white shadow-sm border-slate-200">
              <SelectValue placeholder="Selecione o funcionário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Funcionários</SelectItem>
              {colaboradores.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" className="h-10 bg-white" onClick={handleExportPDF}>
              <Printer className="w-4 h-4 mr-2" /> Gerar PDF
            </Button>
            <Button variant="default" className="h-10" onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-2" /> Gerar Excel
            </Button>
          </div>
        </div>
      </div>

      <div id="print-area">
        <div className="hidden print:block mb-8 border-b pb-4">
          <h2 className="text-2xl font-bold">Relatório de Ponto</h2>
          <p className="text-slate-600 capitalize">
            Período: {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </p>
          {colaboradorId !== 'all' && (
            <p className="text-slate-600">
              Colaborador: {colaboradores.find((c) => c.id === colaboradorId)?.nome}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4 no-print">
            <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
        ) : (
          <Tabs defaultValue="folha" className="w-full">
            <TabsList className="mb-4 no-print w-full sm:w-auto grid grid-cols-2">
              <TabsTrigger value="folha">Folha de Ponto</TabsTrigger>
              <TabsTrigger value="extras">Horas Extras</TabsTrigger>
            </TabsList>
            <TabsContent value="folha">
              <FolhaPontoTab
                records={dailyRecords}
                isCompact={isCompact}
                setIsCompact={setIsCompact}
                colaboradorId={colaboradorId}
              />
            </TabsContent>
            <TabsContent value="extras">
              <HorasExtrasTab
                records={dailyRecords}
                heType={heType}
                setHeType={setHeType}
                colaboradorId={colaboradorId}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
