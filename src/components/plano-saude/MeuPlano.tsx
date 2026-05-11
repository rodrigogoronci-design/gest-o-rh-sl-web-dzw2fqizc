import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getColaboradorPlano,
  getDependentes,
  getPlanos,
  solicitarAdesao,
  solicitarCancelamento,
  solicitarDependente,
} from '@/services/plano-saude'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function MeuPlano({ colaboradorId }: { colaboradorId: string }) {
  const [meuPlano, setMeuPlano] = useState<any>(null)
  const [dependentes, setDependentes] = useState<any[]>([])
  const [planos, setPlanos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [depForm, setDepForm] = useState({ nome: '', cpf: '', parentesco: '', data_nascimento: '' })

  const loadData = async () => {
    try {
      const [plano, deps, allPlanos] = await Promise.all([
        getColaboradorPlano(colaboradorId),
        getDependentes(colaboradorId),
        getPlanos(),
      ])
      setMeuPlano(plano)
      setDependentes(deps)
      setPlanos(allPlanos)
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAdesao = async (planoId: string) => {
    try {
      await solicitarAdesao(colaboradorId, planoId)
      toast({
        title: 'Solicitação enviada',
        description: 'Sua solicitação de adesão está em análise.',
      })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handleCancelamento = async () => {
    if (!confirm('Deseja mesmo solicitar o cancelamento?')) return
    try {
      await solicitarCancelamento(colaboradorId)
      toast({ title: 'Solicitação enviada', description: 'Cancelamento em análise.' })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handleAddDep = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await solicitarDependente(colaboradorId, depForm, 'add_dependente')
      toast({ title: 'Solicitação enviada', description: 'Inclusão de dependente em análise.' })
      setDepForm({ nome: '', cpf: '', parentesco: '', data_nascimento: '' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleRemDep = async (dep: any) => {
    if (!confirm('Solicitar exclusão deste dependente?')) return
    try {
      await solicitarDependente(colaboradorId, dep, 'rem_dependente')
      toast({ title: 'Solicitação enviada', description: 'Exclusão em análise.' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Meu Plano Atual</CardTitle>
        </CardHeader>
        <CardContent>
          {meuPlano ? (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-lg">{meuPlano.plano.descricao}</p>
                <p className="text-sm text-muted-foreground">Código: {meuPlano.plano.codigo}</p>
                <p className="text-sm text-muted-foreground">
                  Adesão: {new Date(meuPlano.data_adesao).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <Button variant="destructive" onClick={handleCancelamento}>
                Solicitar Cancelamento
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Você ainda não possui um plano de saúde ativo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {planos.map((p) => (
                  <Card key={p.id} className="p-4 border">
                    <h3 className="font-bold">{p.descricao}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Valor Titular: R$ {p.valor_titular}
                    </p>
                    <Button onClick={() => handleAdesao(p.id)}>Solicitar Adesão</Button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {meuPlano && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Meus Dependentes</CardTitle>
              <CardDescription>Gerencie seus dependentes ativos</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Adicionar Dependente</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Solicitar Inclusão de Dependente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddDep} className="space-y-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input
                      value={depForm.nome}
                      onChange={(e) => setDepForm({ ...depForm, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={depForm.cpf}
                      onChange={(e) => setDepForm({ ...depForm, cpf: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Parentesco</Label>
                    <Input
                      value={depForm.parentesco}
                      onChange={(e) => setDepForm({ ...depForm, parentesco: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={depForm.data_nascimento}
                      onChange={(e) => setDepForm({ ...depForm, data_nascimento: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit">Enviar Solicitação</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {dependentes.length === 0 ? (
              <p className="text-muted-foreground">Nenhum dependente cadastrado.</p>
            ) : (
              <ul className="space-y-2">
                {dependentes.map((d) => (
                  <li key={d.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-semibold">{d.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.parentesco} - CPF: {d.cpf}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRemDep(d)}>
                      Remover
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
