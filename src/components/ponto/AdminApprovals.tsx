import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { format } from 'date-fns'

export function AdminApprovals() {
  const [pontos, setPontos] = useState<any[]>([])

  const fetchPontos = async () => {
    const { data } = await supabase
      .from('registro_ponto')
      .select('*, colaboradores(nome)')
      .in('status', ['pendente', 'inconsistencia'])
      .order('data_hora', { ascending: false })
    setPontos(data || [])
  }

  useEffect(() => {
    fetchPontos()
  }, [])

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('registro_ponto').update({ status }).eq('id', id)
    toast.success('Ponto atualizado com sucesso')
    fetchPontos()
  }

  return (
    <Card>
      <CardHeader className="border-b pb-6">
        <CardTitle>Validação de Inconsistências</CardTitle>
        <CardDescription>
          Aprove ou rejeite pontos marcados com inconsistência de localização ou pendentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Comprovações</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pontos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.colaboradores?.nome}</TableCell>
                <TableCell>{format(new Date(p.data_hora), 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell className="capitalize">{p.tipo_registro}</TableCell>
                <TableCell>
                  <Badge variant={p.status === 'inconsistencia' ? 'destructive' : 'secondary'}>
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-3 items-center">
                    {p.foto_url && (
                      <a
                        href={p.foto_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Ver Foto
                      </a>
                    )}
                    {p.latitude && (
                      <a
                        href={`https://maps.google.com/maps?q=${p.latitude},${p.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Ver Mapa
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" onClick={() => updateStatus(p.id, 'aprovado')}>
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => updateStatus(p.id, 'rejeitado')}
                  >
                    Rejeitar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {pontos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma pendência ou inconsistência encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
