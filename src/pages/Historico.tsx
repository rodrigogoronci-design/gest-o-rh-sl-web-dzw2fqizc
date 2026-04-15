import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function Historico() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('historico_ajustes')
      .select('*, colaboradores(nome)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLogs(data || [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Histórico de Ajustes</h1>
        <p className="text-muted-foreground mt-1">Auditoria de alterações globais do sistema</p>
      </div>
      <Card className="flex-1 overflow-hidden border-0 shadow-sm flex flex-col">
        <CardContent className="p-0 overflow-auto flex-1 bg-white">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
              <TableRow className="uppercase text-xs tracking-wider text-slate-500 hover:bg-slate-50">
                <TableHead className="w-[180px]">Data / Hora</TableHead>
                <TableHead className="w-[200px]">Usuário</TableHead>
                <TableHead className="w-[250px]">Ação</TableHead>
                <TableHead>Detalhes da Alteração</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Carregando histórico...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum registro de alteração encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-sm text-slate-600">
                      {format(parseISO(log.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-700">
                      {log.colaboradores?.nome || 'Sistema'}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-700">
                      {log.acao}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {log.detalhes?.antigo !== undefined && (
                        <span className="text-slate-400 line-through mr-2">
                          R$ {Number(log.detalhes.antigo).toFixed(2).replace('.', ',')}
                        </span>
                      )}
                      {log.detalhes?.novo !== undefined && (
                        <span className="text-emerald-600 font-medium">
                          R$ {Number(log.detalhes.novo).toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
