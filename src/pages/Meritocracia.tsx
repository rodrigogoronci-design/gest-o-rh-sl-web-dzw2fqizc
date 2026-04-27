import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
import {
  Star,
  Award,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function MeritocraciaDetailSheet({ user, onClose }: { user: any; onClose: () => void }) {
  if (!user) return null

  const isSuporte = user.departamento?.toUpperCase() === 'SUPORTE'

  const seed = user.nome || 'A'
  const getMockScore = (max: number, offset: number) => {
    const val = (seed.charCodeAt(0) + seed.charCodeAt(seed.length - 1) + offset) % max
    return max - val
  }

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
  const desconto = getMockScore(30, 8) > 20 ? 15 : 0
  const valorBase = 700

  const multiplier = valorBase / totalMax
  const valorTotal = totalObtido * multiplier - desconto * multiplier

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
                          Erros críticos/Retenção de Clientes
                        </TableCell>
                        <TableCell className="text-center text-slate-500">15</TableCell>
                        <TableCell className="text-center text-slate-500">30</TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {desconto}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-red-50">
                        <TableCell className="font-bold text-right text-red-900" colSpan={3}>
                          TOTAL GERAL (Pontos)
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg text-red-700">
                          {totalObtido - desconto}
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

function ImportBox({ title, id }: { title: string; id: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)

  const handleUpload = () => {
    if (!file) return
    setUploading(true)
    setTimeout(() => {
      setUploading(false)
      setUploaded(true)
    }, 1500)
  }

  return (
    <div className="border rounded-lg p-3 flex flex-col gap-2 bg-white shadow-sm hover:border-green-200 transition-colors">
      <label htmlFor={id} className="font-medium text-xs text-slate-700 line-clamp-1" title={title}>
        {title}
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="file"
          accept=".xlsx,.xls"
          className="text-[10px] h-8 px-2 py-1 file:text-[10px] file:font-medium file:text-slate-600 file:border-0 file:bg-transparent file:mr-2 cursor-pointer"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null)
            setUploaded(false)
          }}
        />
        <Button
          size="icon"
          variant={uploaded ? 'default' : 'secondary'}
          className={cn('shrink-0 h-8 w-8', uploaded && 'bg-green-600 hover:bg-green-700')}
          onClick={handleUpload}
          disabled={!file || uploading || uploaded}
          title="Importar Planilha"
        >
          {uploaded ? (
            <CheckCircle2 className="w-4 h-4 text-white" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

export default function Meritocracia() {
  const { currentUser } = useAppStore()
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)

  const currentDate = new Date()
  const initialMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)

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

  if (loading)
    return <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meritocracia</h1>
          <p className="text-muted-foreground">Avaliação de desempenho e indicadores por setor.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40 h-9"
          />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <ImportBox id="imp-satisfacao" title="Resultados da Pesq. de Satisfação" />
                    <ImportBox id="imp-sonax" title="Sonax Chamadas Entrantes" />
                    <ImportBox id="imp-perm-tickets" title="Tempo de Perm. dos Tickets por Resp." />
                    <ImportBox id="imp-trab-tickets" title="Tempo Trabalhado nos Tickets" />
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <h2 className="text-lg font-semibold mb-3 text-slate-800">Equipe de {sector}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {getSectorUsers(sector).map((user) => (
                  <Card
                    key={user.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
                    onClick={() => setSelectedUser(user)}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                      <Avatar className="w-14 h-14 border-2 border-slate-100 shadow-sm">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                          {user.nome?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="w-full">
                        <h3 className="font-semibold text-sm line-clamp-1" title={user.nome}>
                          {user.nome}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="mt-1 text-[10px] px-1.5 py-0 font-normal line-clamp-1 border-slate-200 h-4"
                        >
                          {user.cargo || 'Membro da Equipe'}
                        </Badge>
                      </div>
                      <div className="w-full pt-2 mt-1 border-t border-slate-100 flex justify-between items-center text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <Star className="w-3 h-3 text-amber-400" />
                          <span>Pontuação</span>
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
          </TabsContent>
        ))}
      </Tabs>

      <MeritocraciaDetailSheet user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  )
}
