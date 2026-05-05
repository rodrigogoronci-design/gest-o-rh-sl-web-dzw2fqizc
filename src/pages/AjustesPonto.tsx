import { useState, useEffect } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isWeekend,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AjustesPonto() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState('faltas')

  const [ajustes, setAjustes] = useState<any[]>([])
  const [faltasCalculadas, setFaltasCalculadas] = useState<any[]>([])
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [myColabId, setMyColabId] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [selectedFaltas, setSelectedFaltas] = useState<string[]>([])
  const [selectedPendentes, setSelectedPendentes] = useState<string[]>([])

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkFormData, setBulkFormData] = useState({
    motivo: '',
    horas: '8',
    justificativa: '',
    file: null as File | null,
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newAjusteType, setNewAjusteType] = useState('motivo')
  const [formData, setFormData] = useState({
    colaborador_id: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    hora: '',
    motivo: '',
    horas: '8',
    justificativa: '',
    file: null as File | null,
  })

  const fetchAjustes = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const startStr = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const endStr = format(endOfMonth(currentDate), 'yyyy-MM-dd')

      const { data: myColab, error: myColabErr } = await supabase
        .from('colaboradores')
        .select('id, role, departamento')
        .eq('user_id', user.id)
        .maybeSingle()

      if (myColabErr) throw new Error('Erro ao buscar perfil: ' + myColabErr.message)

      const role = myColab?.role?.toLowerCase() || ''
      const manager = role === 'admin' || role === 'administrador' || role === 'gerente'
      setIsAdmin(manager)
      setMyColabId(myColab?.id || null)

      if (!manager) {
        setIsLoading(false)
        return
      }

      const { data: teamColabs, error: teamErr } = await supabase
        .from('colaboradores')
        .select('id, nome, status, data_admissao, data_demissao')
        .order('nome')

      if (teamErr) throw new Error('Erro ao buscar equipe: ' + teamErr.message)
      setColaboradores(teamColabs || [])

      if (!teamColabs || teamColabs.length === 0) {
        setAjustes([])
        setFaltasCalculadas([])
        setIsLoading(false)
        return
      }

      const [ajustesRes, pontosRes, afastamentosRes, feriadosRes, feriasRes] = await Promise.all([
        supabase
          .from('ajustes_ponto')
          .select('*, colaboradores(nome)')
          .gte('data', startStr)
          .lte('data', endStr)
          .order('created_at', { ascending: false }),
        supabase
          .from('registro_ponto')
          .select('colaborador_id, data_hora')
          .gte('data_hora', `${startStr}T00:00:00.000Z`)
          .lte('data_hora', `${endStr}T23:59:59.999Z`),
        supabase
          .from('afastamentos')
          .select('colaborador_id, data_inicio, data_fim')
          .lte('data_inicio', endStr)
          .gte('data_fim', startStr),
        supabase.from('feriados').select('data').gte('data', startStr).lte('data', endStr),
        supabase
          .from('ferias')
          .select('colaborador_id, data_inicio, data_fim')
          .lte('data_inicio', endStr)
          .gte('data_fim', startStr),
      ])

      const todosAjustes = ajustesRes.data || []
      const pontos = pontosRes.data || []
      const afastamentos = afastamentosRes.data || []
      const feriados = feriadosRes.data?.map((f) => f.data) || []
      const ferias = feriasRes.data || []

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
      const intervalEndStr = endStr > yesterdayStr ? yesterdayStr : endStr

      let faltasArr: any[] = []

      if (startStr <= intervalEndStr) {
        const [sy, sm, sd] = startStr.split('-').map(Number)
        const [ey, em, ed] = intervalEndStr.split('-').map(Number)
        const days = eachDayOfInterval({
          start: new Date(sy, sm - 1, sd),
          end: new Date(ey, em - 1, ed),
        })

        const validColabs = teamColabs.filter((c) => c.status !== 'Inativo')

        for (const day of days) {
          if (isWeekend(day)) continue
          const dayStr = format(day, 'yyyy-MM-dd')
          if (feriados.includes(dayStr)) continue

          for (const colab of validColabs) {
            if (colab.data_admissao && colab.data_admissao > dayStr) continue
            if (colab.data_demissao && colab.data_demissao < dayStr) continue

            const emAfastamento = afastamentos.some(
              (a) =>
                a.colaborador_id === colab.id && dayStr >= a.data_inicio && dayStr <= a.data_fim,
            )
            if (emAfastamento) continue

            const emFerias = ferias.some(
              (f) =>
                f.colaborador_id === colab.id && dayStr >= f.data_inicio && dayStr <= f.data_fim,
            )
            if (emFerias) continue

            const hasPoints = pontos.some((p) => {
              const pDate = format(new Date(p.data_hora), 'yyyy-MM-dd')
              return p.colaborador_id === colab.id && pDate === dayStr
            })
            if (hasPoints) continue

            faltasArr.push({
              id: `falta-${colab.id}-${dayStr}`,
              colaborador_id: colab.id,
              colaboradores: { nome: colab.nome },
              data: dayStr,
              tipo: 'falta',
              motivo: 'Ausência de Marcação',
              justificativa: 'Sistema não localizou ponto neste dia',
              status: 'falta',
              horas: 8,
            })
          }
        }
      }

      const ajustesValidos = todosAjustes.filter(
        (a) => a.status === 'aprovado' || a.status === 'pendente',
      )
      faltasArr = faltasArr.filter(
        (f) =>
          !ajustesValidos.some((a) => a.colaborador_id === f.colaborador_id && a.data === f.data),
      )

      setAjustes(todosAjustes)
      setFaltasCalculadas(faltasArr)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Erro ao carregar ajustes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAjustes()
  }, [currentDate, user])

  useEffect(() => {
    setSelectedFaltas([])
    setSelectedPendentes([])
  }, [activeTab, currentDate])

  const handleBulkJustify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedFaltas.length === 0) return
    if (!bulkFormData.motivo) {
      toast.error('Selecione um motivo')
      return
    }

    setIsSaving(true)
    try {
      let fileUrl = null
      if (bulkFormData.file) {
        const fileExt = bulkFormData.file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('anexos_ajustes')
          .upload(fileName, bulkFormData.file)

        if (!uploadError) {
          const { data } = supabase.storage.from('anexos_ajustes').getPublicUrl(fileName)
          fileUrl = data.publicUrl
        }
      }

      const itemsToInsert = faltasCalculadas
        .filter((f) => selectedFaltas.includes(f.id))
        .map((f) => ({
          colaborador_id: f.colaborador_id,
          data: f.data,
          tipo: 'motivo_ajuste',
          motivo: bulkFormData.motivo,
          horas: bulkFormData.horas ? parseFloat(bulkFormData.horas) : 8,
          justificativa: bulkFormData.justificativa,
          status: isAdmin ? 'aprovado' : 'pendente',
          aprovado_por: isAdmin ? myColabId : null,
          documento_url: fileUrl,
        }))

      const { error } = await supabase.from('ajustes_ponto').insert(itemsToInsert)
      if (error) throw error

      toast.success(`${itemsToInsert.length} ocorrências ajustadas com sucesso`)
      setIsBulkModalOpen(false)
      setSelectedFaltas([])
      setBulkFormData({ motivo: '', horas: '8', justificativa: '', file: null })
      fetchAjustes()
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBulkApprove = async (status: 'aprovado' | 'reprovado') => {
    if (selectedPendentes.length === 0) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('ajustes_ponto')
        .update({ status, aprovado_por: myColabId })
        .in('id', selectedPendentes)

      if (error) throw error

      toast.success(
        `${selectedPendentes.length} solicitações ${status === 'aprovado' ? 'aprovadas' : 'reprovadas'}`,
      )
      setSelectedPendentes([])
      fetchAjustes()
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.colaborador_id) {
      toast.error('Selecione um funcionário')
      return
    }
    if (newAjusteType === 'motivo' && !formData.motivo) {
      toast.error('Selecione um motivo')
      return
    }

    setIsSaving(true)
    try {
      let fileUrl = null
      if (formData.file) {
        const fileExt = formData.file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('anexos_ajustes')
          .upload(fileName, formData.file)
        if (!uploadError) {
          const { data } = supabase.storage.from('anexos_ajustes').getPublicUrl(fileName)
          fileUrl = data.publicUrl
        }
      }

      const tipo = newAjusteType === 'atraso' ? 'ponto_atraso' : 'motivo_ajuste'
      const payload: any = {
        colaborador_id: formData.colaborador_id,
        data: formData.data,
        tipo,
        justificativa: formData.justificativa,
        status: isAdmin ? 'aprovado' : 'pendente',
        aprovado_por: isAdmin ? myColabId : null,
      }

      if (tipo === 'ponto_atraso') {
        payload.motivo = formData.hora
      } else {
        payload.motivo = formData.motivo
        payload.horas = formData.horas ? parseFloat(formData.horas) : null
      }
      if (fileUrl) payload.documento_url = fileUrl

      const { error } = await supabase.from('ajustes_ponto').insert(payload)
      if (error) throw error

      toast.success('Ajuste registrado com sucesso')
      setIsModalOpen(false)
      setFormData((f) => ({ ...f, hora: '', motivo: '', justificativa: '', file: null }))
      fetchAjustes()
    } catch (error: any) {
      toast.error('Erro ao salvar ajuste: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const pendentes = ajustes.filter((a) => a.status === 'pendente')
  const historico = ajustes.filter((a) => a.status === 'aprovado' || a.status === 'reprovado')

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-500 hover:bg-green-600">Aprovado</Badge>
      case 'reprovado':
        return <Badge variant="destructive">Reprovado</Badge>
      case 'falta':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Falta</Badge>
      default:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Pendente</Badge>
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500">
        Acesso negado. Esta área é restrita a gestores e administradores.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ajustes de Ponto</h1>
          <p className="text-slate-500 mt-1">Gestão de não conformidades e correções de ponto.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold text-center min-w-[140px] capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </div>
          <Button variant="outline" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4 border-l-red-500">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Faltas Identificadas</p>
              <h3 className="text-3xl font-bold text-slate-900">{faltasCalculadas.length}</h3>
            </div>
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-yellow-500">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Ajustes Pendentes</p>
              <h3 className="text-3xl font-bold text-slate-900">{pendentes.length}</h3>
            </div>
            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Ajustes Aprovados</p>
              <h3 className="text-3xl font-bold text-slate-900">
                {historico.filter((a) => a.status === 'aprovado').length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-elevation">
        <CardHeader className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-100/80 p-1 flex-wrap h-auto justify-start">
              <TabsTrigger value="faltas" className="gap-2">
                Faltas ({faltasCalculadas.length})
              </TabsTrigger>
              <TabsTrigger value="pendentes" className="gap-2">
                Pendentes ({pendentes.length})
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                Histórico ({historico.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setIsModalOpen(true)} className="shrink-0" variant="secondary">
            <Plus className="w-4 h-4 mr-2" /> Novo Ajuste Manual
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === 'faltas' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 pl-6">
                        <Checkbox
                          checked={
                            faltasCalculadas.length > 0 &&
                            selectedFaltas.length === faltasCalculadas.length
                          }
                          onCheckedChange={(c) =>
                            c
                              ? setSelectedFaltas(faltasCalculadas.map((f) => f.id))
                              : setSelectedFaltas([])
                          }
                        />
                      </TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Detalhes</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faltasCalculadas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                          Nenhuma falta identificada no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      faltasCalculadas.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="pl-6">
                            <Checkbox
                              checked={selectedFaltas.includes(f.id)}
                              onCheckedChange={(c) =>
                                c
                                  ? setSelectedFaltas([...selectedFaltas, f.id])
                                  : setSelectedFaltas(selectedFaltas.filter((id) => id !== f.id))
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(new Date(f.data), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>{f.colaboradores?.nome}</TableCell>
                          <TableCell className="text-slate-500">{f.motivo}</TableCell>
                          <TableCell>
                            <StatusBadge status={f.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              {activeTab === 'pendentes' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 pl-6">
                        <Checkbox
                          checked={
                            pendentes.length > 0 && selectedPendentes.length === pendentes.length
                          }
                          onCheckedChange={(c) =>
                            c
                              ? setSelectedPendentes(pendentes.map((p) => p.id))
                              : setSelectedPendentes([])
                          }
                        />
                      </TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Solicitação</TableHead>
                      <TableHead>Comprovante</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendentes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                          Nenhuma solicitação pendente no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendentes.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="pl-6">
                            <Checkbox
                              checked={selectedPendentes.includes(p.id)}
                              onCheckedChange={(c) =>
                                c
                                  ? setSelectedPendentes([...selectedPendentes, p.id])
                                  : setSelectedPendentes(
                                      selectedPendentes.filter((id) => id !== p.id),
                                    )
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(new Date(p.data), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>{p.colaboradores?.nome}</TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {p.tipo === 'ponto_atraso' ? `Atraso: ${p.motivo}` : p.motivo}
                            </div>
                            <div className="text-xs text-slate-500">{p.justificativa}</div>
                          </TableCell>
                          <TableCell>
                            {p.documento_url ? (
                              <a
                                href={p.documento_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline flex items-center text-sm"
                              >
                                <FileText className="w-4 h-4 mr-1" /> Ver anexo
                              </a>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={p.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              {activeTab === 'historico' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Data</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Ajuste Realizado</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historico.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                          Nenhum histórico para o período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      historico.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="pl-6 font-medium whitespace-nowrap">
                            {format(new Date(h.data), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>{h.colaboradores?.nome}</TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {h.tipo === 'ponto_atraso' ? `Atraso: ${h.motivo}` : h.motivo}
                            </div>
                            <div className="text-xs text-slate-500">{h.justificativa}</div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={h.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {((activeTab === 'faltas' && selectedFaltas.length > 0) ||
        (activeTab === 'pendentes' && selectedPendentes.length > 0)) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 shadow-2xl shadow-slate-900/20 rounded-full px-4 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in text-white">
          <Badge className="bg-slate-800 hover:bg-slate-800 text-white font-medium border-0 px-3 py-1">
            {activeTab === 'faltas' ? selectedFaltas.length : selectedPendentes.length} selecionados
          </Badge>
          <div className="h-6 w-px bg-slate-700"></div>

          {activeTab === 'faltas' && (
            <Button
              onClick={() => setIsBulkModalOpen(true)}
              size="sm"
              className="rounded-full px-6 bg-white text-slate-900 hover:bg-slate-100 shadow-none"
            >
              Justificar Lote
            </Button>
          )}

          {activeTab === 'pendentes' && (
            <>
              <Button
                size="sm"
                onClick={() => handleBulkApprove('aprovado')}
                className="rounded-full bg-green-500 hover:bg-green-600 text-white border-0 shadow-none"
              >
                <Check className="w-4 h-4 mr-2" /> Aprovar
              </Button>
              <Button
                size="sm"
                onClick={() => handleBulkApprove('reprovado')}
                variant="destructive"
                className="rounded-full shadow-none border-0"
              >
                <X className="w-4 h-4 mr-2" /> Reprovar
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              activeTab === 'faltas' ? setSelectedFaltas([]) : setSelectedPendentes([])
            }
            className="rounded-full h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Bulk Justify Modal */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="w-[90vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Justificar Faltas em Lote</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkJustify} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Motivo / Ação</Label>
              <Select
                value={bulkFormData.motivo}
                onValueChange={(v) => setBulkFormData((f) => ({ ...f, motivo: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Abono">Abono (Justificado)</SelectItem>
                  <SelectItem value="Compensação">Compensação</SelectItem>
                  <SelectItem value="Desconto">Desconto em Folha</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Horas por registro (Opcional)</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={bulkFormData.horas}
                onChange={(e) => setBulkFormData((f) => ({ ...f, horas: e.target.value }))}
                placeholder="Ex: 8"
              />
            </div>
            <div className="space-y-2">
              <Label>Justificativa Geral</Label>
              <Textarea
                required
                rows={3}
                value={bulkFormData.justificativa}
                onChange={(e) => setBulkFormData((f) => ({ ...f, justificativa: e.target.value }))}
                placeholder="Informe o motivo da alteração em lote"
              />
            </div>
            <div className="space-y-2">
              <Label>Documento (Opcional)</Label>
              <Input
                type="file"
                onChange={(e) =>
                  setBulkFormData((f) => ({ ...f, file: e.target.files?.[0] || null }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBulkModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Aplicar Ajuste'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Single Manual Adjustment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[90vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Ajuste de Ponto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManualSubmit} className="space-y-4 mt-2">
            <Tabs value={newAjusteType} onValueChange={setNewAjusteType} className="w-full mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="motivo">Lançamento Lote/Dia</TabsTrigger>
                <TabsTrigger value="atraso">Ponto Atrasado</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label>Funcionário</Label>
              <Select
                value={formData.colaborador_id}
                onValueChange={(v) => setFormData((f) => ({ ...f, colaborador_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Ocorrência</Label>
                <Input
                  type="date"
                  required
                  value={formData.data}
                  onChange={(e) => setFormData((f) => ({ ...f, data: e.target.value }))}
                />
              </div>

              {newAjusteType === 'atraso' ? (
                <div className="space-y-2">
                  <Label>Hora do Atraso</Label>
                  <Input
                    type="time"
                    required
                    value={formData.hora}
                    onChange={(e) => setFormData((f) => ({ ...f, hora: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Quantidade de Horas</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.horas}
                    onChange={(e) => setFormData((f) => ({ ...f, horas: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {newAjusteType === 'motivo' && (
              <div className="space-y-2">
                <Label>Ação/Motivo</Label>
                <Select
                  value={formData.motivo}
                  onValueChange={(v) => setFormData((f) => ({ ...f, motivo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Abono">Abono</SelectItem>
                    <SelectItem value="Compensação">Compensação</SelectItem>
                    <SelectItem value="Desconto">Desconto</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Justificativa do Ajuste</Label>
              <Textarea
                required
                rows={3}
                value={formData.justificativa}
                onChange={(e) => setFormData((f) => ({ ...f, justificativa: e.target.value }))}
                placeholder="Ex: Esqueceu de bater o ponto, trânsito..."
              />
            </div>

            <div className="space-y-2">
              <Label>Anexar Documento (Opcional)</Label>
              <Input
                type="file"
                onChange={(e) => setFormData((f) => ({ ...f, file: e.target.files?.[0] || null }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Processando...' : 'Confirmar Ajuste'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
