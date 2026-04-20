import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon } from 'lucide-react'

export function AdminEspelho() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [registros, setRegistros] = useState<any[]>([])

  useEffect(() => {
    const fetchRegistros = async () => {
      const start = new Date(date + 'T00:00:00').toISOString()
      const end = new Date(date + 'T23:59:59').toISOString()

      const { data: colabs } = await supabase
        .from('colaboradores')
        .select('id, nome, cargo')
        .eq('status', 'Ativo')
      const { data: pts } = await supabase
        .from('registro_ponto')
        .select('*')
        .gte('data_hora', start)
        .lte('data_hora', end)

      if (colabs) {
        const merged = colabs.map((c) => {
          const cPts = pts?.filter((p) => p.colaborador_id === c.id) || []
          const entradas = cPts
            .filter((p) => p.tipo_registro === 'entrada')
            .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
          const saidas = cPts
            .filter((p) => p.tipo_registro === 'saida')
            .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())

          return {
            id: c.id,
            nome: c.nome,
            cargo: c.cargo,
            hora_entrada:
              entradas.length > 0
                ? new Date(entradas[0].data_hora).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null,
            hora_saida:
              saidas.length > 0
                ? new Date(saidas[0].data_hora).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null,
          }
        })
        setRegistros(merged)
      }
    }
    fetchRegistros()
  }, [date])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
        <div>
          <CardTitle>Espelho de Ponto Diário</CardTitle>
          <CardDescription>Acompanhe as entradas e saídas consolidadas da equipe.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[150px]"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-center">Entrada</TableHead>
              <TableHead className="text-center">Saída</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell>{r.cargo || '-'}</TableCell>
                <TableCell className="text-center font-mono">{r.hora_entrada || '--:--'}</TableCell>
                <TableCell className="text-center font-mono">{r.hora_saida || '--:--'}</TableCell>
                <TableCell className="text-right">
                  {r.hora_entrada && r.hora_saida ? (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      Completo
                    </Badge>
                  ) : r.hora_entrada ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Em andamento
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Ausente</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {registros.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum colaborador encontrado para esta data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
