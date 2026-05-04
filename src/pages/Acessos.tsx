import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert } from 'lucide-react'

export default function Acessos() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('auditoria_acessos' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        const userIds = [...new Set(data.map((d: any) => d.user_id))]
        const { data: colabs } = await supabase
          .from('colaboradores')
          .select('user_id, nome')
          .in('user_id', userIds)

        const colabMap = Object.fromEntries((colabs || []).map((c) => [c.user_id, c.nome]))

        const logsWithNames = data.map((d: any) => ({
          ...d,
          colaborador_nome: colabMap[d.user_id] || 'Desconhecido',
        }))

        setLogs(logsWithNames)
      }
      setLoading(false)
    }

    fetchLogs()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de Acessos</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico Recente de Acessos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      Carregando acessos...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.colaborador_nome}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.acao === 'login'
                              ? 'default'
                              : log.acao === 'timeout'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="capitalize"
                        >
                          {log.acao}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", {
                          locale: ptBR,
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
