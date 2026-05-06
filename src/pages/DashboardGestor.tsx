import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

import { ApprovalModal } from '@/components/dashboard-gestor/ApprovalModal'
import { PontosTab } from '@/components/dashboard-gestor/PontosTab'
import { AjustesTab } from '@/components/dashboard-gestor/AjustesTab'
import { AfastamentosTab } from '@/components/dashboard-gestor/AfastamentosTab'

export default function DashboardGestor() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'))
  const [statusFilter, setStatusFilter] = useState('pendente')
  const [colabFilter, setColabFilter] = useState('todos')
  const [activeTab, setActiveTab] = useState('pontos')

  const [points, setPoints] = useState<any[]>([])
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [absences, setAbsences] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [isApprove, setIsApprove] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    setError(false)
    try {
      const startStr = format(startOfMonth(parseISO(`${period}-01`)), 'yyyy-MM-dd')
      const endStr = format(endOfMonth(parseISO(`${period}-01`)), 'yyyy-MM-dd')

      const [resPoints, resAdjusts, resAbsences, resTeam, resFaltas, resPeriodos] =
        await Promise.all([
          supabase
            .from('registro_ponto')
            .select('*, colaboradores(nome)')
            .gte('data_hora', `${startStr}T00:00:00Z`)
            .lte('data_hora', `${endStr}T23:59:59Z`)
            .order('data_hora', { ascending: false }),
          supabase
            .from('ajustes_ponto')
            .select('*, colaboradores(nome)')
            .gte('data', startStr)
            .lte('data', endStr)
            .order('data', { ascending: false }),
          supabase
            .from('afastamentos')
            .select('*, colaboradores(nome)')
            .gte('data_inicio', startStr)
            .lte('data_inicio', endStr)
            .order('data_inicio', { ascending: false }),
          supabase.from('colaboradores').select('id, nome').order('nome'),
          supabase
            .from('faltas')
            .select('colaborador_id, data, colaboradores(nome)')
            .gte('data', startStr)
            .lte('data', endStr),
          supabase
            .from('periodos_folha')
            .select('id')
            .gte('data_inicio', startStr)
            .lte('data_inicio', endStr),
        ])

      setPoints(resPoints.data || [])
      setAdjustments(resAdjusts.data || [])
      setAbsences(resAbsences.data || [])
      setTeamMembers(resTeam.data || [])

      const periodIds = resPeriodos.data?.map((p) => p.id) || []
      let calcHoras: any[] = []
      if (periodIds.length > 0) {
        const { data } = await supabase
          .from('calculos_horas')
          .select('colaborador_id, horas_extras, colaboradores(nome)')
          .in('periodo_id', periodIds)
        calcHoras = data || []
      }

      const fCount: Record<string, { nome: string; count: number }> = {}
      resFaltas.data?.forEach((f) => {
        const cId = f.colaborador_id
        if (!fCount[cId]) fCount[cId] = { nome: (f.colaboradores as any)?.nome || '', count: 0 }
        fCount[cId].count++
      })

      const newAlerts: any[] = []
      Object.values(fCount).forEach((f) => {
        if (f.count >= 3)
          newAlerts.push({ type: 'warning', text: `${f.nome} com ${f.count} faltas no mês` })
      })

      calcHoras.forEach((c) => {
        if ((c.horas_extras || 0) >= 15)
          newAlerts.push({
            type: 'critical',
            text: `${(c.colaboradores as any)?.nome} com ${c.horas_extras}h extras`,
          })
      })

      setAlerts(newAlerts)
    } catch (e) {
      console.error(e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [period])

  const openModal = (record: any, table: string, approve: boolean) => {
    setSelectedRecord({ ...record, table })
    setIsApprove(approve)
    setModalOpen(true)
  }

  const handleConfirm = async (comment: string) => {
    if (!selectedRecord) return
    const newStatus = isApprove ? 'aprovado' : 'reprovado'
    try {
      if (selectedRecord.table === 'registro_ponto') {
        await supabase
          .from('registro_ponto')
          .update({ status: newStatus })
          .eq('id', selectedRecord.id)
        setPoints((prev) =>
          prev.map((p) => (p.id === selectedRecord.id ? { ...p, status: newStatus } : p)),
        )
      } else if (selectedRecord.table === 'ajustes_ponto') {
        await supabase
          .from('ajustes_ponto')
          .update({ status: newStatus, aprovado_por: user?.id })
          .eq('id', selectedRecord.id)
        setAdjustments((prev) =>
          prev.map((a) => (a.id === selectedRecord.id ? { ...a, status: newStatus } : a)),
        )
      } else if (selectedRecord.table === 'afastamentos') {
        await supabase
          .from('afastamentos')
          .update({ status: newStatus, aprovado_por: user?.id })
          .eq('id', selectedRecord.id)
        setAbsences((prev) =>
          prev.map((a) => (a.id === selectedRecord.id ? { ...a, status: newStatus } : a)),
        )
      }

      if (comment) {
        await supabase.from('historico_ajustes').insert({
          acao: `${newStatus}_${selectedRecord.table}`,
          detalhes: { id: selectedRecord.id, comentario: comment },
          user_id: user?.id,
        })
      }

      toast({ title: `Registro ${newStatus} com sucesso!` })
      setModalOpen(false)
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' })
    }
  }

  const applyFilters = (data: any[]) =>
    data.filter((item) => {
      if (statusFilter !== 'todos') {
        const s = item.status?.toLowerCase() || ''
        if (statusFilter === 'aprovado' && !['aprovado', 'validado'].includes(s)) return false
        if (statusFilter === 'reprovado' && s !== 'reprovado') return false
        if (statusFilter === 'pendente' && !['pendente'].includes(s)) return false
      }
      if (colabFilter !== 'todos' && item.colaborador_id !== colabFilter) return false
      return true
    })

  const filteredPoints = useMemo(() => applyFilters(points), [points, statusFilter, colabFilter])
  const filteredAdjustments = useMemo(
    () => applyFilters(adjustments),
    [adjustments, statusFilter, colabFilter],
  )
  const filteredAbsences = useMemo(
    () => applyFilters(absences),
    [absences, statusFilter, colabFilter],
  )

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-4 animate-in fade-in duration-500 p-4 md:p-0">
        <div className="h-12 w-64 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="flex-1 bg-slate-100 rounded-lg animate-pulse mt-4" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
        <AlertCircle className="w-12 h-12 text-slate-300" />
        <p>Erro ao carregar dados</p>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard do Gestor</h1>
          <p className="text-muted-foreground mt-1">
            Aprovações e alertas ({format(parseISO(`${period}-01`), 'MMMM yyyy', { locale: ptBR })})
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full sm:w-[150px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="aprovado">Aprovados</SelectItem>
              <SelectItem value="reprovado">Reprovados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={colabFilter} onValueChange={setColabFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Toda a Equipe</SelectItem>
              {teamMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pontos Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {points.filter((p) => p.status === 'pendente').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ajustes Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {adjustments.filter((a) => a.status === 'pendente').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Afastamentos Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {absences.filter((a) => a.status?.toLowerCase() === 'pendente').length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Alertas Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{alerts.length}</div>
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-col gap-2 shrink-0">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={cn(
                'px-4 py-3 rounded-lg border flex items-center gap-3',
                a.type === 'critical'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800',
              )}
            >
              {a.type === 'critical' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span className="font-medium text-sm">{a.text}</span>
            </div>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-fit mb-2 shrink-0">
          <TabsTrigger value="pontos">Pontos Pendentes</TabsTrigger>
          <TabsTrigger value="ajustes">Ajustes Pendentes</TabsTrigger>
          <TabsTrigger value="afastamentos">Afastamentos Pendentes</TabsTrigger>
        </TabsList>
        <TabsContent
          value="pontos"
          className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden m-0 mt-2"
        >
          <PontosTab data={filteredPoints} onOpenModal={openModal} />
        </TabsContent>
        <TabsContent
          value="ajustes"
          className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden m-0 mt-2"
        >
          <AjustesTab data={filteredAdjustments} onOpenModal={openModal} />
        </TabsContent>
        <TabsContent
          value="afastamentos"
          className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden m-0 mt-2"
        >
          <AfastamentosTab data={filteredAbsences} onOpenModal={openModal} />
        </TabsContent>
      </Tabs>

      <ApprovalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        isApprove={isApprove}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
