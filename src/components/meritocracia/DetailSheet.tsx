import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TrendingUp, AlertTriangle, Award, Star } from 'lucide-react'

export function DetailSheet({
  user,
  valorBase,
  cycleData,
  onClose,
}: {
  user: any
  valorBase: number
  cycleData: { faltas: any[]; atestados: any[]; temCancelamento: boolean }
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
      detalhe: 'ANALISE CRITICA - Resolução em 24h',
      peso: 5,
      max: 20,
      obtido: getMockScore(20, 1),
    },
    {
      detalhe: 'Qualidade do Atendimento (Nota > 9)',
      peso: 20,
      max: 20,
      obtido: getMockScore(20, 2),
    },
    { detalhe: 'Acompanhamento de tickets', peso: 20, max: 20, obtido: getMockScore(20, 3) },
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

  const descontoFaltas = totalFaltas * 10
  const descontoAtestados = totalAtestados * 5
  const descontoErros = getMockScore(30, 8) > 20 ? 15 : 0
  const descontoPontos = descontoFaltas + descontoAtestados + descontoErros

  const multiplier = valorBase / totalMax
  const valorProporcional = Math.max(0, totalObtido * multiplier - descontoPontos * multiplier)

  const descontoCancelamento = cycleData.temCancelamento ? 105 : 0
  const valorFinal = Math.max(0, valorProporcional - descontoCancelamento)

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
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                    <div className="text-sm text-blue-800 font-medium">Pontuação</div>
                    <div className="text-3xl font-bold text-blue-900">
                      {totalObtido} <span className="text-lg text-blue-700/70">/ 100</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-100">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="w-8 h-8 text-red-600 mb-2" />
                    <div className="text-sm text-red-800 font-medium">Descontos Fixos</div>
                    <div className="text-3xl font-bold text-red-900">
                      R$ {descontoCancelamento.toFixed(2).replace('.', ',')}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Award className="w-8 h-8 text-emerald-600 mb-2" />
                    <div className="text-sm text-emerald-800 font-medium">Total a Receber</div>
                    <div className="text-3xl font-bold text-emerald-900">
                      R$ {valorFinal.toFixed(2).replace('.', ',')}
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
                        <TableHead className="text-center">Pts Max</TableHead>
                        <TableHead className="text-right">Obtido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SUPORTE_METRICS.map((m, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-slate-700">{m.detalhe}</TableCell>
                          <TableCell className="text-center text-slate-500">{m.max}</TableCell>
                          <TableCell className="text-right font-bold text-blue-700">
                            {m.obtido}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-red-700">
                  Penalidades e Descontos
                </h3>
                <div className="border rounded-lg overflow-hidden border-red-100">
                  <Table>
                    <TableHeader className="bg-red-50">
                      <TableRow>
                        <TableHead className="w-[50%] text-red-800">Critério</TableHead>
                        <TableHead className="text-center text-red-800">Perda de Pts</TableHead>
                        <TableHead className="text-right text-red-800">
                          Desconto Monetário
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-slate-700">
                          Faltas ({totalFaltas} dias)
                        </TableCell>
                        <TableCell className="text-center font-bold text-red-600">
                          {descontoFaltas}
                        </TableCell>
                        <TableCell className="text-right text-slate-500">-</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-slate-700">
                          Atestados ({totalAtestados} dias)
                        </TableCell>
                        <TableCell className="text-center font-bold text-red-600">
                          {descontoAtestados}
                        </TableCell>
                        <TableCell className="text-right text-slate-500">-</TableCell>
                      </TableRow>
                      <TableRow className={cycleData.temCancelamento ? 'bg-red-100/50' : ''}>
                        <TableCell className="font-medium text-slate-700">
                          Cancelamento de Cliente no Ciclo
                        </TableCell>
                        <TableCell className="text-center text-slate-500">-</TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          R$ {descontoCancelamento.toFixed(2).replace('.', ',')}
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
                  A meritocracia detalhada para <strong>{user.departamento || 'este setor'}</strong>{' '}
                  está sendo mapeada.
                </p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
