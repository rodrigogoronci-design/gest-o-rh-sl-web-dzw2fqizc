import { useEffect, useState, useMemo } from 'react'
import { format, isToday } from 'date-fns'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, Users, LogIn, Clock, Search, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function Acessos() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  const fetchLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('auditoria_acessos' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (!error && data) {
      const userIds = [...new Set(data.map((d: any) => d.user_id))]
      const { data: colabs } = await supabase
        .from('colaboradores')
        .select('user_id, nome, role')
        .in('user_id', userIds)

      const colabMap = Object.fromEntries(
        (colabs || []).map((c) => [c.user_id, { nome: c.nome, role: c.role }]),
      )

      const logsWithNames = data.map((d: any) => ({
        ...d,
        colaborador_nome: colabMap[d.user_id]?.nome || 'Usuário Desconhecido',
        colaborador_cargo: colabMap[d.user_id]?.role || 'N/A',
      }))

      setLogs(logsWithNames)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch = log.colaborador_nome.toLowerCase().includes(searchTerm.toLowerCase())
      const matchAction = actionFilter === 'all' || log.acao === actionFilter
      const matchDate = dateFilter ? log.created_at.startsWith(dateFilter) : true

      return matchSearch && matchAction && matchDate
    })
  }, [logs, searchTerm, actionFilter, dateFilter])

  const stats = useMemo(() => {
    const todayLogs = logs.filter((log) => isToday(new Date(log.created_at)))
    const loginsToday = todayLogs.filter((log) => log.acao === 'login').length
    const timeoutsToday = todayLogs.filter((log) => log.acao === 'timeout').length
    const uniqueUsersToday = new Set(todayLogs.map((log) => log.user_id)).size

    return {
      loginsToday,
      timeoutsToday,
      uniqueUsersToday,
    }
  }, [logs])

  const clearFilters = () => {
    setSearchTerm('')
    setActionFilter('all')
    setDateFilter('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShieldAlert className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Auditoria de Acessos</h1>
            <p className="text-sm text-muted-foreground">
              Monitoramento e histórico de logins do sistema
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Atualizar Dados
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logins Hoje</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.loginsToday}</div>
            <p className="text-xs text-muted-foreground">Autenticações nas últimas 24h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timeouts Hoje</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.timeoutsToday}</div>
            <p className="text-xs text-muted-foreground">Sessões expiradas por inatividade</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueUsersToday}</div>
            <p className="text-xs text-muted-foreground">Usuários distintos logados hoje</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Acessos</CardTitle>
          <CardDescription>
            Visualize e filtre o histórico completo de autenticações da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por colaborador..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="timeout">Timeout (Inatividade)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[200px]">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            {(searchTerm || actionFilter !== 'all' || dateFilter) && (
              <Button variant="ghost" onClick={clearFilters} className="px-3">
                Limpar Filtros
              </Button>
            )}
          </div>

          <div className="rounded-md border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Data e Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Carregando acessos...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-900">
                        {log.colaborador_nome}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.colaborador_cargo}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.acao === 'login'
                              ? 'default'
                              : log.acao === 'timeout'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="capitalize font-medium"
                        >
                          {log.acao}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">
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
          <div className="text-sm text-muted-foreground text-right">
            Mostrando {filteredLogs.length} de {logs.length} registros recentes
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
