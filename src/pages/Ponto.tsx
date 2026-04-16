import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, Play, Square, Check, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export default function Ponto() {
  const { user } = useAuth()
  const [colaborador, setColaborador] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      supabase
        .from('colaboradores')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setColaborador(data)
          setIsAdmin(data?.role === 'Admin' || data?.role === 'Gerente')
          setLoading(false)
        })
    }
  }, [user])

  if (loading) return null

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Ponto</h1>
          <p className="text-muted-foreground">
            Gerencie e visualize seus registros de ponto diários.
          </p>
        </div>
      </div>

      {isAdmin ? <AdminPonto /> : <EmployeePonto colaborador={colaborador} />}
    </div>
  )
}

function AdminPonto() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [registros, setRegistros] = useState<any[]>([])

  const fetchRegistros = async () => {
    const { data: colabs } = await supabase
      .from('colaboradores')
      .select('id, nome, cargo')
      .eq('status', 'Ativo')
      .eq('role', 'Colaborador')
    const { data: pts } = await supabase.from('ponto').select('*').eq('data', date)

    if (colabs) {
      const merged = colabs.map((c) => {
        const p = pts?.find((x) => x.colaborador_id === c.id)
        return {
          id: c.id,
          nome: c.nome,
          cargo: c.cargo,
          hora_entrada: p?.hora_entrada,
          hora_saida: p?.hora_saida,
        }
      })
      setRegistros(merged)
    }
  }

  useEffect(() => {
    fetchRegistros()
  }, [date])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Espelho de Ponto Diário</CardTitle>
          <CardDescription>Acompanhe as entradas e saídas da equipe.</CardDescription>
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
      <CardContent>
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
                  Nenhum colaborador encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function EmployeePonto({ colaborador }: { colaborador: any }) {
  const [time, setTime] = useState(new Date())
  const [pontoToday, setPontoToday] = useState<any>(null)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchPonto = async () => {
    if (!colaborador) return
    const { data } = await supabase
      .from('ponto')
      .select('*')
      .eq('colaborador_id', colaborador.id)
      .eq('data', today)
      .single()
    setPontoToday(data)
  }

  useEffect(() => {
    fetchPonto()
  }, [colaborador])

  const registrar = async (tipo: 'entrada' | 'saida') => {
    const hora = new Date().toLocaleTimeString('pt-BR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })
    try {
      if (tipo === 'entrada') {
        const { error } = await supabase
          .from('ponto')
          .insert({ colaborador_id: colaborador.id, data: today, hora_entrada: hora })
        if (error) throw error
        toast.success('Entrada registrada com sucesso!')
      } else {
        const { error } = await supabase
          .from('ponto')
          .update({ hora_saida: hora })
          .eq('id', pontoToday.id)
        if (error) throw error
        toast.success('Saída registrada com sucesso!')
      }
      fetchPonto()
    } catch (error) {
      toast.error('Erro ao registrar ponto')
    }
  }

  return (
    <Card className="max-w-md mx-auto text-center shadow-lg">
      <CardHeader>
        <CardTitle className="flex justify-center items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Registro de Ponto
        </CardTitle>
        <CardDescription className="capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="text-6xl font-bold font-mono tracking-tight text-primary">
          {time.toLocaleTimeString('pt-BR')}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-6 border-t">
          <div className="bg-muted/30 p-4 rounded-xl">
            <p className="text-sm font-medium text-muted-foreground mb-2">Entrada</p>
            <p className="text-2xl font-semibold font-mono">
              {pontoToday?.hora_entrada || '--:--'}
            </p>
          </div>
          <div className="bg-muted/30 p-4 rounded-xl">
            <p className="text-sm font-medium text-muted-foreground mb-2">Saída</p>
            <p className="text-2xl font-semibold font-mono">{pontoToday?.hora_saida || '--:--'}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center pb-8">
        {!pontoToday?.hora_entrada ? (
          <Button size="lg" className="w-full h-14 text-lg" onClick={() => registrar('entrada')}>
            <Play className="w-6 h-6 mr-2" /> Registrar Entrada
          </Button>
        ) : !pontoToday?.hora_saida ? (
          <Button
            size="lg"
            variant="secondary"
            className="w-full h-14 text-lg"
            onClick={() => registrar('saida')}
          >
            <Square className="w-6 h-6 mr-2" /> Registrar Saída
          </Button>
        ) : (
          <div className="flex items-center text-green-600 bg-green-50 px-6 py-3 rounded-full font-medium text-lg w-full justify-center border border-green-100">
            <Check className="w-6 h-6 mr-2" /> Jornada Concluída
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
