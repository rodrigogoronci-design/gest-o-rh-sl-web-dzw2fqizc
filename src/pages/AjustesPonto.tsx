import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { ChevronLeft, ChevronRight, Plus, Check, X, FileText, FileEdit } from 'lucide-react'
import { toast } from 'sonner'

export default function AjustesPonto() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState('atraso')
  const [statusFilter, setStatusFilter] = useState('todos')

  const [ajustes, setAjustes] = useState<any[]>([])
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    colaborador_id: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    hora: '',
    motivo: '',
    horas: '',
    justificativa: '',
    file: null as File | null,
  })

  useEffect(() => {
    if (user) {
      const fetchColabs = async () => {
        const { data: myColab } = await supabase
          .from('colaboradores')
          .select('role, departamento, id')
          .eq('user_id', user.id)
          .single()

        const role = myColab?.role?.toLowerCase() || ''
        const manager = role === 'admin' || role === 'administrador' || role === 'gerente'
        setIsAdmin(manager)

        let query = supabase.from('colaboradores').select('id, nome').order('nome')
        if (!manager) {
          query = query.eq('id', myColab?.id)
        } else if (role === 'gerente') {
          query = query.eq('departamento', myColab?.departamento)
        }

        const { data } = await query
        setColaboradores(data || [])
        if (data && data.length > 0) {
          setFormData((f) => ({ ...f, colaborador_id: data[0].id }))
        }
      }
      fetchColabs()
    }
  }, [user])

  const fetchAjustes = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const start = startOfMonth(currentDate).toISOString()
      const end = endOfMonth(currentDate).toISOString()

      const { data: myColab } = await supabase
        .from('colaboradores')
        .select('role, departamento, id')
        .eq('user_id', user.id)
        .single()

      const role = myColab?.role?.toLowerCase() || ''
      const manager = role === 'admin' || role === 'administrador' || role === 'gerente'

      let query = supabase
        .from('ajustes_ponto')
        .select('*, colaboradores(nome)')
        .gte('data', start)
        .lte('data', end)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter)
      }

      if (!manager) {
        query = query.eq('colaborador_id', myColab?.id)
      } else if (role === 'gerente') {
        const { data: teamColabs } = await supabase
          .from('colaboradores')
          .select('id')
          .eq('departamento', myColab?.departamento)
        const teamIds = teamColabs?.map((c) => c.id) || []
        if (teamIds.length > 0) {
          query = query.in('colaborador_id', teamIds)
        } else {
          query = query.eq('colaborador_id', myColab?.id)
        }
      }

      const { data, error } = await query
      if (error) throw error
      setAjustes(data || [])
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar ajustes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAjustes()
  }, [currentDate, statusFilter, user])

  const handleApprove = async (id: string, status: string) => {
    try {
      const { data: myColab } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('user_id', user!.id)
        .single()
      const { error } = await supabase
        .from('ajustes_ponto')
        .update({ status, aprovado_por: myColab?.id })
        .eq('id', id)

      if (error) throw error
      toast.success(`Ajuste ${status === 'aprovado' ? 'aprovado' : 'reprovado'} com sucesso!`)
      fetchAjustes()
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.colaborador_id) {
      toast.error('Selecione um funcionário')
      return
    }

    if (activeTab === 'motivo' && !formData.motivo) {
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

      const tipo = activeTab === 'atraso' ? 'ponto_atraso' : 'motivo_ajuste'

      const payload: any = {
        colaborador_id: formData.colaborador_id,
        data: formData.data,
        tipo,
        justificativa: formData.justificativa,
        status: 'pendente',
      }

      if (tipo === 'ponto_atraso') {
        payload.motivo = formData.hora
      } else {
        payload.motivo = formData.motivo
        payload.horas = formData.horas ? parseFloat(formData.horas) : null
      }

      if (fileUrl) {
        payload.documento_url = fileUrl
      }

      const { error } = await supabase.from('ajustes_ponto').insert(payload)
      if (error) throw error

      toast.success('Ajuste registrado com sucesso')
      setIsModalOpen(false)
      fetchAjustes()
      setFormData((f) => ({ ...f, hora: '', motivo: '', horas: '', justificativa: '', file: null }))
    } catch (error) {
      toast.error('Erro ao salvar ajuste')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredAjustes = ajustes.filter((a) =>
    activeTab === 'atraso' ? a.tipo === 'ponto_atraso' : a.tipo === 'motivo_ajuste',
  )

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-500 hover:bg-green-600">Aprovado</Badge>
      case 'reprovado':
        return <Badge variant="destructive">Reprovado</Badge>
      default:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Pendente</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ajustes de Ponto</h1>
          <p className="text-slate-500 mt-1">Lançamento e aprovação de acertos de ponto.</p>
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

      <Card>
        <CardHeader className="p-4 sm:p-6 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 mb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="atraso">Ponto em Atraso</TabsTrigger>
              <TabsTrigger value="motivo">Motivos de Ajuste</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="aprovado">Aprovados</SelectItem>
                <SelectItem value="reprovado">Reprovados</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Novo Ajuste
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-6 pt-0">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredAjustes.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center text-slate-500">
              <FileEdit className="w-12 h-12 mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-900">Nenhum ajuste para este período</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Funcionário</TableHead>
                      {activeTab === 'atraso' ? (
                        <TableHead>Hora</TableHead>
                      ) : (
                        <>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Horas</TableHead>
                        </>
                      )}
                      <TableHead>Justificativa</TableHead>
                      <TableHead>Comprovante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAjustes.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(a.data), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {a.colaboradores?.nome || 'Desconhecido'}
                        </TableCell>
                        {activeTab === 'atraso' ? (
                          <TableCell>{a.motivo}</TableCell>
                        ) : (
                          <>
                            <TableCell>{a.motivo}</TableCell>
                            <TableCell>{a.horas}h</TableCell>
                          </>
                        )}
                        <TableCell className="max-w-[200px] truncate" title={a.justificativa}>
                          {a.justificativa}
                        </TableCell>
                        <TableCell>
                          {a.documento_url ? (
                            <a
                              href={a.documento_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center"
                            >
                              <FileText className="w-4 h-4 mr-1" /> Ver
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={a.status} />
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {isAdmin && a.status === 'pendente' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50 mr-2"
                                onClick={() => handleApprove(a.id, 'aprovado')}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleApprove(a.id, 'reprovado')}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden flex flex-col gap-3 p-4 bg-slate-50">
                {filteredAjustes.map((a) => (
                  <Card key={a.id} className="shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2 border-b pb-2">
                        <div>
                          <span className="font-semibold text-sm block">
                            {format(new Date(a.data), 'dd/MM/yyyy')}
                          </span>
                          <span className="text-xs text-slate-500">
                            {a.colaboradores?.nome || 'Desconhecido'}
                          </span>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="text-sm text-slate-700 space-y-1">
                        {activeTab === 'atraso' ? (
                          <p>
                            <span className="font-medium">Hora:</span> {a.motivo}
                          </p>
                        ) : (
                          <p>
                            <span className="font-medium">Motivo:</span> {a.motivo} ({a.horas}h)
                          </p>
                        )}
                        <p className="text-xs text-slate-600 mt-1">{a.justificativa}</p>
                        {a.documento_url && (
                          <a
                            href={a.documento_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline text-xs flex items-center mt-2"
                          >
                            <FileText className="w-3 h-3 mr-1" /> Ver Comprovante
                          </a>
                        )}
                      </div>
                      {isAdmin && a.status === 'pendente' && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApprove(a.id, 'aprovado')}
                          >
                            <Check className="w-4 h-4 mr-1" /> Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            onClick={() => handleApprove(a.id, 'reprovado')}
                          >
                            <X className="w-4 h-4 mr-1" /> Reprovar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[90vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeTab === 'atraso' ? 'Novo Ponto em Atraso' : 'Novo Motivo de Ajuste'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
                <Label>Data</Label>
                <Input
                  type="date"
                  required
                  value={formData.data}
                  onChange={(e) => setFormData((f) => ({ ...f, data: e.target.value }))}
                />
              </div>

              {activeTab === 'atraso' ? (
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    required
                    value={formData.hora}
                    onChange={(e) => setFormData((f) => ({ ...f, hora: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Horas</Label>
                  <Input
                    type="number"
                    step="0.5"
                    required
                    min="0.5"
                    value={formData.horas}
                    onChange={(e) => setFormData((f) => ({ ...f, horas: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {activeTab === 'motivo' && (
              <div className="space-y-2">
                <Label>Motivo</Label>
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
                    <SelectItem value="Sobreaviso">Sobreaviso</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Justificativa</Label>
              <Textarea
                required
                rows={3}
                value={formData.justificativa}
                onChange={(e) => setFormData((f) => ({ ...f, justificativa: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Documento (Opcional)</Label>
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
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
