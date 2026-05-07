import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Lock, Unlock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'

export function FechamentoFolhaTab() {
  const { user } = useAuth()
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [periodoAtual, setPeriodoAtual] = useState<any>(null)
  const [historico, setHistorico] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [myColabId, setMyColabId] = useState<string | null>(null)

  const fetchDados = async () => {
    setLoading(true)
    try {
      if (user) {
        const { data: colab } = await supabase
          .from('colaboradores')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (colab) setMyColabId(colab.id)
      }

      const { data: periodo } = await supabase
        .from('periodos_folha')
        .select('*')
        .eq('mes', mes)
        .eq('ano', ano)
        .maybeSingle()
      setPeriodoAtual(periodo)

      const { data: hist } = await supabase
        .from('periodos_folha')
        .select('*, colaboradores(nome)')
        .order('ano', { ascending: false })
        .order('mes', { ascending: false })
      setHistorico(hist || [])
    } catch (e: any) {
      toast.error('Erro ao carregar períodos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDados()
  }, [mes, ano, user])

  const handleFechar = async () => {
    setIsSaving(true)
    try {
      const start = format(startOfMonth(new Date(ano, mes - 1)), 'yyyy-MM-dd')
      const end = format(endOfMonth(new Date(ano, mes - 1)), 'yyyy-MM-dd')

      if (periodoAtual) {
        await supabase
          .from('periodos_folha')
          .update({
            status: 'fechado',
            fechado_por: myColabId,
            data_fechamento: new Date().toISOString(),
          })
          .eq('id', periodoAtual.id)
          .throwOnError()
      } else {
        await supabase
          .from('periodos_folha')
          .insert({
            mes,
            ano,
            data_inicio: start,
            data_fim: end,
            status: 'fechado',
            fechado_por: myColabId,
            data_fechamento: new Date().toISOString(),
          })
          .throwOnError()
      }

      toast.success('Período fechado com sucesso')
      setIsModalOpen(false)
      fetchDados()
    } catch (e: any) {
      toast.error('Erro ao fechar período: ' + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const isFechado = periodoAtual?.status === 'fechado'

  const meses = Array.from({ length: 12 }, (_, i) => i + 1)
  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Controle de Período</CardTitle>
          <CardDescription>Selecione o mês e ano para gerenciar o fechamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 w-full">
              <div className="w-full sm:w-1/2 space-y-2">
                <Label>Mês</Label>
                <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        <span className="capitalize">
                          {format(new Date(2024, m - 1, 1), 'MMMM', { locale: ptBR })}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-1/2 space-y-2">
                <Label>Ano</Label>
                <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((a) => (
                      <SelectItem key={a} value={a.toString()}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div
              className={`p-6 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 ${isFechado ? 'bg-slate-50 border-slate-200' : 'bg-green-50 border-green-200'}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${isFechado ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-600'}`}
                >
                  {isFechado ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {isFechado ? 'Período Fechado' : 'Período Aberto'}
                  </h3>
                  <p className="text-sm text-slate-500 capitalize">
                    {format(new Date(ano, mes - 1, 1), 'MMMM yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>
              <Button
                className="w-full sm:w-auto"
                variant={isFechado ? 'secondary' : 'default'}
                disabled={isFechado}
                onClick={() => setIsModalOpen(true)}
              >
                {isFechado ? 'Já Fechado' : 'Fechar Período'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Fechamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Período</TableHead>
                <TableHead>Data Fechamento</TableHead>
                <TableHead>Fechado por</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    Nenhum período fechado
                  </TableCell>
                </TableRow>
              ) : (
                historico.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="pl-6 font-medium capitalize whitespace-nowrap">
                      {format(new Date(h.ano, h.mes - 1, 1), 'MMMM yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {h.data_fechamento
                        ? format(new Date(h.data_fechamento), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>{h.colaboradores?.nome || '-'}</TableCell>
                    <TableCell>
                      {h.status === 'fechado' ? (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                          Fechado
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">Aberto</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] md:w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fechar Período</DialogTitle>
            <DialogDescription className="pt-2">
              Tem certeza que deseja fechar o período de{' '}
              <strong className="capitalize">
                {format(new Date(ano, mes - 1, 1), 'MMMM yyyy', { locale: ptBR })}
              </strong>
              ?
              <br />
              <br />
              Nenhuma alteração (ajustes de ponto, novos atestados ou edições de batidas) será
              permitida para as datas deste mês.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFechar} disabled={isSaving}>
              {isSaving ? 'Fechando...' : 'Confirmar Fechamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
