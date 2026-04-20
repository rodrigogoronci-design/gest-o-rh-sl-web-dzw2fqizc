import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import { supabase } from '@/lib/supabase/client'
import useAppStore from '@/stores/useAppStore'
import { Star, Award, TrendingUp, AlertTriangle } from 'lucide-react'

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

export default function Meritocracia() {
  const { currentUser } = useAppStore()
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)

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

  if (loading)
    return <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meritocracia</h1>
        <p className="text-muted-foreground">Avaliação de desempenho e indicadores por setor.</p>
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
          <TabsContent key={sector} value={sector} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {getSectorUsers(sector).map((user) => (
                <Card
                  key={user.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedUser(user)}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                    <Avatar className="w-20 h-20 border-2 border-slate-100 shadow-sm">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {user.nome?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg line-clamp-1">{user.nome}</h3>
                      <Badge variant="outline" className="mt-1">
                        {user.cargo || 'Membro da Equipe'}
                      </Badge>
                    </div>
                    <div className="w-full pt-4 border-t flex justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400" /> Pontuação
                      </span>
                      <span className="font-medium text-foreground">Ver Detalhes</span>
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
          </TabsContent>
        ))}
      </Tabs>

      <MeritocraciaDetailSheet user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  )
}
