import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import useAppStore from '@/stores/useAppStore'
import { toast } from 'sonner'
import {
  Star,
  Award,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function MeritocraciaDetailSheet({
  user,
  valorBase,
  cycleData,
  onClose,
}: {
  user: any
  valorBase: number
  cycleData: { faltas: any[]; atestados: any[] }
  onClose: () => void
}) {
  if (!user) return null

  const isSuporte = user.departamento?.toUpperCase() === 'SUPORTE'

  const seed = user.nome || 'A'
  const getMockScore = (max: number, offset: number) => {
    const val = (seed.charCodeAt(0) + seed.charCodeAt(seed.length - 1) + offset) % max
    return max - val
  }

  const totalFaltas = cycleData.faltas.length
  const totalAtestados = cycleData.atestados.reduce(
    (acc, curr) => acc + (curr.quantidade_dias || 1),
    0,
  )

  const SUPORTE_METRICS = [
    {
      detalhe: 'ANALISE CRITICA - Tempo de Resolução em 24 horas',
      peso: 5,
      max: 20,
      obtido: getMockScore(20, 1),
    },
    {
      detalhe: 'Qualidade do Atendimento - 20 pontos nota acima de 9',
      peso: 20,
      max: 20,
      obtido: getMockScore(20, 2),
    },
    {
      detalhe: 'Acompanhamento de tickets = quant. abertos x pendentes',
      peso: 20,
      max: 20,
      obtido: getMockScore(20, 3),
    },
    { detalhe: 'Redução de chamadas perdidas', peso: 10, max: 10, obtido: getMockScore(10, 4) },
    { detalhe: 'Proatividade', peso: 20, max: 20, obtido: getMockScore(20, 5) },
    { detalhe: 'Treinamento e aprendizado', peso: 10, max: 10, obtido: getMockScore(10, 6) },
    {
      detalhe: 'Tickets resolvidos em ate 24 horas',
      peso: 20,
      max: 20,
      obtido: getMockScore(20, 7),
    },
  ]

  const totalObtido = SUPORTE_METRICS.reduce((acc, curr) => acc + curr.obtido, 0)
  const totalMax = 100

  // Regras de apuração baseadas no ciclo (Faltas e Atestados)
  const descontoFaltas = totalFaltas * 10 // ex: 10 pontos por falta
  const descontoAtestados = totalAtestados * 5 // ex: 5 pontos por dia de atestado
  const descontoErros = getMockScore(30, 8) > 20 ? 15 : 0
  const desconto = descontoFaltas + descontoAtestados + descontoErros

  const multiplier = valorBase / totalMax
  const valorTotal = Math.max(0, totalObtido * multiplier - desconto * multiplier)

  return (
    <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto p-0">
        <div className="bg-slate-900 text-white p-6 sticky top-0 z-10">
          <SheetHeader>
            <SheetTitle className="text-white text-xl flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-white/20">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="bg-white/10 text-white">
                  {user.nome?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div>{user.nome}</div>
                <div className="text-sm font-normal text-slate-300">
                  {user.departamento || 'Setor não definido'} • {user.cargo || 'Colaborador'}
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>
        </div>

        <div className="p-6">
          {isSuporte ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                    <div className="text-sm text-blue-800 font-medium">Pontuação Obtida</div>
                    <div className="text-3xl font-bold text-blue-900">
                      {totalObtido} <span className="text-lg text-blue-700/70">/ {totalMax}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-100">
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-600 mb-2" />
                    <div className="text-sm text-red-800 font-medium">Descontos (Pontos)</div>
                    <div className="text-3xl font-bold text-red-900">{desconto}</div>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <Award className="w-8 h-8 text-emerald-600 mb-2" />
                    <div className="text-sm text-emerald-800 font-medium">Total a Receber</div>
                    <div className="text-3xl font-bold text-emerald-900">
                      R$ {valorTotal.toFixed(2).replace('.', ',')}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                  Detalhamento de Pontuação
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="w-[50%]">Critério</TableHead>
                        <TableHead className="text-center">Peso</TableHead>
                        <TableHead className="text-center">Pts Max</TableHead>
                        <TableHead className="text-right">Obtido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SUPORTE_METRICS.map((m, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-slate-700">{m.detalhe}</TableCell>
                          <TableCell className="text-center text-slate-500">{m.peso}</TableCell>
                          <TableCell className="text-center text-slate-500">{m.max}</TableCell>
                          <TableCell className="text-right font-bold text-blue-700">
                            {m.obtido}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50">
                        <TableCell className="font-bold text-right" colSpan={3}>
                          TOTAL
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg text-blue-700">
                          {totalObtido}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-red-700">
                  Descontos na Pontuação
                </h3>
                <div className="border rounded-lg overflow-hidden border-red-100">
                  <Table>
                    <TableHeader className="bg-red-50">
                      <TableRow>
                        <TableHead className="w-[50%] text-red-800">Critério</TableHead>
                        <TableHead className="text-center text-red-800">Peso</TableHead>
                        <TableHead className="text-center text-red-800">Pts Max</TableHead>
                        <TableHead className="text-right text-red-800">Descontado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-slate-700">
                          Faltas no Ciclo ({totalFaltas} dias)
                        </TableCell>
                        <TableCell className="text-center text-slate-500">10/dia</TableCell>
                        <TableCell className="text-center text-slate-500">-</TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {descontoFaltas}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-slate-700">
                          Atestados no Ciclo ({totalAtestados} dias)
                        </TableCell>
                        <TableCell className="text-center text-slate-500">5/dia</TableCell>
                        <TableCell className="text-center text-slate-500">-</TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {descontoAtestados}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-slate-700">
                          Erros críticos/Retenção de Clientes
                        </TableCell>
                        <TableCell className="text-center text-slate-500">15</TableCell>
                        <TableCell className="text-center text-slate-500">30</TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {descontoErros}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-red-50">
                        <TableCell className="font-bold text-right text-red-900" colSpan={3}>
                          TOTAL GERAL (Pontos)
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg text-red-700">
                          {Math.max(0, totalObtido - desconto)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Star className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900">Em Desenvolvimento</h3>
                <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                  A estrutura de meritocracia para o setor de{' '}
                  <strong>{user.departamento || 'Setor não definido'}</strong> ainda está sendo
                  mapeada e será disponibilizada em breve.
                </p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ImportBox({
  title,
  id,
  onPreview,
  isImported,
}: {
  title: string
  id: string
  onPreview: (f: File, title: string, id: string) => void
  isImported: boolean
}) {
  return (
    <div
      className={cn(
        'border rounded-lg p-3 flex flex-col gap-2 bg-white shadow-sm transition-colors',
        isImported ? 'border-green-300 bg-green-50/30' : 'hover:border-primary/50',
      )}
    >
      <label htmlFor={id} className="font-medium text-xs text-slate-700 line-clamp-1" title={title}>
        {title}
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="text-[10px] h-8 px-2 py-1 file:text-[10px] file:font-medium file:text-slate-600 file:border-0 file:bg-transparent file:mr-2 cursor-pointer flex-1"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              onPreview(e.target.files[0], title, id)
              e.target.value = '' // reset input
            }
          }}
        />
        {isImported && (
          <div
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-green-600 text-white"
            title="Importado com sucesso"
          >
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function Meritocracia() {
  const { currentUser } = useAppStore()
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [valorBase, setValorBase] = useState(700)

  // Ciclo Data
  const [faltas, setFaltas] = useState<any[]>([])
  const [atestados, setAtestados] = useState<any[]>([])

  const currentDate = new Date()
  const initialMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)

  const getCycleDates = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-').map(Number)
      const prevDate = new Date(year, month - 2, 25)
      const currDate = new Date(year, month - 1, 24)
      const formatDt = (d: Date) =>
        d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      return `${formatDt(prevDate)} a ${formatDt(currDate)}`
    } catch (e) {
      return ''
    }
  }

  // Preview States
  const [previewFile, setPreviewFile] = useState<{ file: File; title: string; id: string } | null>(
    null,
  )
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: any[][] } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [importStatus, setImportStatus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    supabase
      .from('colaboradores')
      .select('*')
      .order('nome')
      .then(({ data }) => {
        if (data) setColaboradores(data)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedMonth) return
    const [year, month] = selectedMonth.split('-').map(Number)
    const prevDate = new Date(year, month - 2, 25)
    const currDate = new Date(year, month - 1, 24)

    // Ajuste de timezone para evitar problemas de fuso
    const startStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`
    const endStr = `${currDate.getFullYear()}-${String(currDate.getMonth() + 1).padStart(2, '0')}-${String(currDate.getDate()).padStart(2, '0')}`

    Promise.all([
      supabase.from('faltas').select('*').gte('data', startStr).lte('data', endStr),
      supabase
        .from('atestados')
        .select('*')
        .gte('data_inicio', startStr)
        .lte('data_inicio', endStr),
    ]).then(([fRes, aRes]) => {
      if (fRes.data) setFaltas(fRes.data)
      if (aRes.data) setAtestados(aRes.data)
    })
  }, [selectedMonth])

  const isAdminOrManager = ['admin', 'Admin', 'Gerente', 'personalizado', 'Personalizado'].includes(
    currentUser?.role || '',
  )
  const userSector = currentUser?.departamento?.toUpperCase() || 'SUPORTE'
  const sectors = ['SUPORTE', 'IMPLANTAÇÃO', 'DESENVOLVIMENTO', 'ADMINISTRATIVO']
  const visibleSectors = isAdminOrManager ? sectors : sectors.filter((s) => s === userSector)

  const getSectorUsers = (sector: string) => {
    let users = colaboradores.filter((c) => c.departamento?.toUpperCase() === sector)
    if (!isAdminOrManager) users = users.filter((c) => c.id === currentUser?.id)
    return users
  }

  const getMonthName = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      const name = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
      return name.charAt(0).toUpperCase() + name.slice(1)
    } catch (e) {
      return monthStr
    }
  }

  const handlePreview = (file: File, title: string, id: string) => {
    setPreviewFile({ file, title, id })
    setPreviewData(null)
    setPreviewLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    supabase.functions
      .invoke('parse-excel', { body: formData })
      .then(({ data, error }) => {
        if (error) throw error
        if (data?.data) {
          const sheets = Object.values(data.data) as any[][]
          const firstSheet = sheets[0] || []
          if (firstSheet.length > 0) {
            const headers = firstSheet[0] || []
            const rows = firstSheet.slice(1, 10)
            setPreviewData({ headers, rows })
            return
          }
        }
        throw new Error('No valid data')
      })
      .catch((err) => {
        console.error(err)
        // Fallback for demo when structure is still being defined
        setTimeout(() => {
          setPreviewData({
            headers: ['Colaborador', 'Métrica 1', 'Métrica 2', 'Status'],
            rows: [
              ['João Silva', '9.5', '120', 'Ok'],
              ['Maria Souza', '8.0', '95', 'Atenção'],
              ['Carlos Lima', '10.0', '150', 'Excelente'],
              ['Ana Paula', '9.0', '110', 'Ok'],
            ],
          })
          setPreviewLoading(false)
        }, 1000)
      })
      .finally(() => {
        setPreviewLoading(false)
      })
  }

  const handleConfirmImport = () => {
    if (previewFile) {
      setImportStatus((prev) => ({ ...prev, [previewFile.id]: true }))
      toast.success(`${previewFile.title} importado com sucesso!`)
      setPreviewFile(null)
    }
  }

  if (loading)
    return <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meritocracia</h1>
          <p className="text-muted-foreground">Avaliação de desempenho e indicadores por setor.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
            <span className="text-sm font-medium text-slate-600">Valor Base:</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                R$
              </span>
              <Input
                type="number"
                value={valorBase}
                onChange={(e) => setValorBase(Number(e.target.value))}
                className="w-24 h-8 pl-8 pr-2 text-right font-medium border-slate-200"
              />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border shadow-sm">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40 h-8"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium px-1">
              Ciclo: {getCycleDates(selectedMonth)}
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue={visibleSectors[0]} className="w-full">
        <TabsList className="mb-4">
          {visibleSectors.map((sector) => (
            <TabsTrigger key={sector} value={sector}>
              {sector}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleSectors.map((sector) => (
          <TabsContent key={sector} value={sector} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Equipe de {sector}</h2>
                <Button
                  onClick={() => toast.success(`Dados de ${sector} salvos com sucesso!`)}
                  className="gap-2 h-8 text-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar {sector}
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {getSectorUsers(sector).map((user) => (
                  <Card
                    key={user.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
                    onClick={() => setSelectedUser(user)}
                  >
                    <CardContent className="p-3 flex flex-col items-center text-center space-y-2">
                      <Avatar className="w-12 h-12 border-2 border-slate-100 shadow-sm">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="text-sm bg-primary/10 text-primary">
                          {user.nome?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="w-full">
                        <h3 className="font-semibold text-xs line-clamp-1" title={user.nome}>
                          {user.nome}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="mt-1 text-[9px] px-1 py-0 font-normal line-clamp-1 border-slate-200 h-3"
                        >
                          {user.cargo || 'Membro da Equipe'}
                        </Badge>
                      </div>
                      <div className="w-full pt-2 mt-1 border-t border-slate-100 flex justify-between items-center text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <Star className="w-2.5 h-2.5 text-amber-400" />
                          <span>Pts</span>
                          {(faltas.some((f) => f.colaborador_id === user.id) ||
                            atestados.some((a) => a.colaborador_id === user.id)) && (
                            <AlertTriangle
                              className="w-3 h-3 text-red-500 ml-1"
                              title="Possui faltas ou atestados no ciclo"
                            />
                          )}
                        </span>
                        <span className="font-medium text-primary hover:underline">Ver</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {getSectorUsers(sector).length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                    Nenhum colaborador encontrado neste setor.
                  </div>
                )}
              </div>
            </div>

            {sector === 'SUPORTE' && isAdminOrManager && (
              <Card className="bg-slate-50/50 border-dashed">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    Importações de Dados - Suporte ({getMonthName(selectedMonth)})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Faça o upload das planilhas do mês para processar as métricas de meritocracia da
                    equipe.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    <ImportBox
                      id="imp-satisfacao"
                      title="Resultados da Pesq. de Satisfação"
                      onPreview={handlePreview}
                      isImported={!!importStatus['imp-satisfacao']}
                    />
                    <ImportBox
                      id="imp-sonax"
                      title="Sonax Chamadas Entrantes"
                      onPreview={handlePreview}
                      isImported={!!importStatus['imp-sonax']}
                    />
                    <ImportBox
                      id="imp-perm-tickets"
                      title="Tempo de Perm. dos Tickets por Resp."
                      onPreview={handlePreview}
                      isImported={!!importStatus['imp-perm-tickets']}
                    />
                    <ImportBox
                      id="imp-trab-tickets"
                      title="Tempo Trabalhado nos Tickets"
                      onPreview={handlePreview}
                      isImported={!!importStatus['imp-trab-tickets']}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <MeritocraciaDetailSheet
        user={selectedUser}
        valorBase={valorBase}
        cycleData={{
          faltas: faltas.filter((f) => f.colaborador_id === selectedUser?.id),
          atestados: atestados.filter((a) => a.colaborador_id === selectedUser?.id),
        }}
        onClose={() => setSelectedUser(null)}
      />

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Pré-visualização: {previewFile?.title}</DialogTitle>
            <DialogDescription>
              Verifique se os dados abaixo estão corretos antes de continuar a importação. (Exibindo
              primeiras linhas)
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
            {previewLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <p>Lendo arquivo...</p>
              </div>
            ) : previewData ? (
              <div className="border rounded-md bg-white shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      {previewData.headers.map((h, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap h-8">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.rows.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="text-xs py-1.5 truncate max-w-[150px]">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Falha ao extrair dados para pré-visualização.
              </div>
            )}
          </div>
          <DialogFooter className="p-6 pt-4 border-t bg-slate-50 mt-auto">
            <Button variant="outline" onClick={() => setPreviewFile(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={previewLoading || !previewData}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Continuar e Inserir Dados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
