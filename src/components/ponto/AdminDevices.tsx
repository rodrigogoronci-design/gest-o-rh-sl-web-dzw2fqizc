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

export function AdminDevices() {
  const [devices, setDevices] = useState<any[]>([])

  const fetchDevices = async () => {
    const { data } = await supabase
      .from('dispositivos_autorizados')
      .select('*, colaboradores(nome)')
      .order('created_at', { ascending: false })
    setDevices(data || [])
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('dispositivos_autorizados').update({ status }).eq('id', id)
    toast.success('Status atualizado')
    fetchDevices()
  }

  return (
    <Card>
      <CardHeader className="border-b pb-6">
        <CardTitle>Gestão de Dispositivos</CardTitle>
        <CardDescription>Autorize ou bloqueie dispositivos para registro de ponto.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data Solicitação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.colaboradores?.nome}</TableCell>
                <TableCell>{d.tipo}</TableCell>
                <TableCell>{format(new Date(d.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      d.status === 'aprovado'
                        ? 'default'
                        : d.status === 'bloqueado'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {d.status !== 'aprovado' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(d.id, 'aprovado')}
                    >
                      Aprovar
                    </Button>
                  )}
                  {d.status !== 'bloqueado' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateStatus(d.id, 'bloqueado')}
                    >
                      Bloquear
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum dispositivo encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
