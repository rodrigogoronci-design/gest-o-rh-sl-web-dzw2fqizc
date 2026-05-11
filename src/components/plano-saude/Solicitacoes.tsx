import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getSolicitacoes, responderSolicitacao, processarAprovacao } from '@/services/plano-saude'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

export function Solicitacoes({ adminId }: { adminId: string }) {
  const [solicitacoes, setSolicitacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const data = await getSolicitacoes()
      setSolicitacoes(data)
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleAction = async (solic: any, status: 'aprovado' | 'rejeitado') => {
    if (!confirm(`Confirmar status como ${status}?`)) return
    try {
      await responderSolicitacao(solic.id, status, adminId)
      if (status === 'aprovado') {
        await processarAprovacao(solic)
      }
      toast({ title: 'Sucesso', description: `Solicitação ${status}` })
      load()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const formatTipo = (tipo: string) => {
    const map: any = {
      adesao: 'Adesão ao Plano',
      cancelamento: 'Cancelamento',
      add_dependente: 'Incluir Dependente',
      rem_dependente: 'Excluir Dependente',
    }
    return map[tipo] || tipo
  }

  if (loading) return <div>Carregando...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitações Pendentes</CardTitle>
      </CardHeader>
      <CardContent>
        {solicitacoes.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma solicitação pendente.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitacoes.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.data_solicitacao).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{s.colaborador?.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatTipo(s.tipo)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.tipo === 'adesao' && `Plano ID: ${s.detalhes.plano_id}`}
                    {s.tipo === 'add_dependente' &&
                      `Nome: ${s.detalhes.nome} (${s.detalhes.parentesco})`}
                    {s.tipo === 'rem_dependente' && `Dep ID: ${s.detalhes.id}`}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" onClick={() => handleAction(s, 'aprovado')}>
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(s, 'rejeitado')}
                    >
                      Rejeitar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
