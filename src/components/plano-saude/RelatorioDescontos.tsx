import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

export function RelatorioDescontos() {
  const [descontos, setDescontos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const { data: planosColab, error: err1 } = await supabase
        .from('colaborador_planos')
        .select('*, colaborador:colaborador_id(nome), plano:plano_id(*)')
        .eq('status', 'ativo')
      if (err1) throw err1

      const { data: dependentes, error: err2 } = await supabase
        .from('dependentes_plano')
        .select('*')
        .eq('status', 'ativo')
      if (err2) throw err2

      const relatorio = planosColab.map((pc) => {
        const deps = dependentes.filter((d) => d.colaborador_id === pc.colaborador_id)
        const valTitular = pc.plano.valor_titular || 0
        const valDep = pc.plano.valor_dependente || 0
        const totalDeps = deps.length * valDep
        return {
          id: pc.id,
          nome: pc.colaborador.nome,
          plano: pc.plano.descricao,
          valTitular,
          qtdDeps: deps.length,
          totalDeps,
          total: valTitular + totalDeps,
        }
      })

      setDescontos(relatorio)
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <div>Carregando...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Descontos - Fechamento (Mês Vigente)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Vlr Titular</TableHead>
              <TableHead>Dependentes</TableHead>
              <TableHead>Vlr Dependentes</TableHead>
              <TableHead className="font-bold">Total a Descontar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {descontos.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.nome}</TableCell>
                <TableCell>{d.plano}</TableCell>
                <TableCell>R$ {d.valTitular.toFixed(2)}</TableCell>
                <TableCell>{d.qtdDeps}</TableCell>
                <TableCell>R$ {d.totalDeps.toFixed(2)}</TableCell>
                <TableCell className="font-bold">R$ {d.total.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {descontos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Nenhum plano ativo encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
