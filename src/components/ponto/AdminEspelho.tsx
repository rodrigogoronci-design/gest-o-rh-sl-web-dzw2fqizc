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
        .select('id, nome, cargo, role')
        .eq('status', 'Ativo')
      const { data: pts } = await supabase
        .from('registro_ponto')
        .select('*')
        .gte('data_hora', start)
        .lte('data_hora', end)

      if (colabs) {
        const filteredColabs = colabs.filter((c) => {
          const nome = (c.nome || '').toLowerCase()
          const role = (c.role || '').toLowerCase()

          if (
            nome.includes('administrador geral') ||
            nome.includes('rodrigo') ||
            nome.includes('ismael bomfim')
          ) {
            return false
          }

          if (role === 'admin' || role === 'administrador') {
            return false
          }

          return true
        })

        const merged = filteredColabs.map((c) => {
          const cPts =
            pts?.filter(
              (p) =>
                p.colaborador_id === c.id && (p.status === 'aprovado' || p.status === 'validado'),
            ) || []

          const entradas = cPts
            .filter((p) => p.tipo_registro === 'entrada')
            .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
          const saidasIntervalo = cPts
            .filter(
              (p) => p.tipo_registro === 'saida_intervalo' || p.tipo_registro === 'intervalo_saida',
            )
            .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
          const retornosIntervalo = cPts
            .filter(
              (p) =>
                p.tipo_registro === 'retorno_intervalo' || p.tipo_registro === 'intervalo_retorno',
            )
            .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
          const saidas = cPts
            .filter((p) => p.tipo_registro === 'saida')
            .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())

          const formatTime = (records: any[]) =>
            records.length > 0
              ? new Date(records[0].data_hora).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null

          return {
            id: c.id,
            nome: c.nome,
            cargo: c.cargo,
            hora_entrada: formatTime(entradas),
            hora_saida_intervalo: formatTime(saidasIntervalo),
            hora_retorno_intervalo: formatTime(retornosIntervalo),
            hora_saida: formatTime(saidas),
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
              <TableHead className="text-center">Saída Intervalo</TableHead>
              <TableHead className="text-center">Retorno Intervalo</TableHead>
              <TableHead className="text-center">Saída</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.map((r) => {
              const isComplete =
                r.hora_entrada && r.hora_saida_intervalo && r.hora_retorno_intervalo && r.hora_saida
              const hasAny =
                r.hora_entrada || r.hora_saida_intervalo || r.hora_retorno_intervalo || r.hora_saida

              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell>{r.cargo || '-'}</TableCell>
                  <TableCell className="text-center font-mono">
                    {r.hora_entrada || '--:--'}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {r.hora_saida_intervalo || '--:--'}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {r.hora_retorno_intervalo || '--:--'}
                  </TableCell>
                  <TableCell className="text-center font-mono">{r.hora_saida || '--:--'}</TableCell>
                  <TableCell className="text-right">
                    {isComplete ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        Completo
                      </Badge>
                    ) : hasAny ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Em andamento
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Ausente</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {registros.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
