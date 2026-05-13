import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import useAppStore from '@/stores/useAppStore'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Edit2,
  Trash2,
  UserPlus,
  Users,
  Search,
  Contact,
  Key,
  ShieldCheck,
  Mail,
  Briefcase,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

export default function Pessoas() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()

  const [pessoas, setPessoas] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('todos')

  const fetchPessoas = async () => {
    setIsLoading(true)
    const { data } = await supabase.from('colaboradores').select('*').order('nome')
    if (data) setPessoas(data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchPessoas()
  }, [])

  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    id: '',
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    endereco: '',
    tipo_contrato: 'CLT',
    cargo: '',
    departamento: '',
    salario: '',
    chave_pix: '',
    tipo_chave_pix: '',
    systemAccess: false,
    role: 'colaborador',
    password: '',
    sendInvite: false,
  })

  const resetForm = () =>
    setFormData({
      id: '',
      nome: '',
      email: '',
      telefone: '',
      cpf: '',
      rg: '',
      data_nascimento: '',
      endereco: '',
      tipo_contrato: 'CLT',
      cargo: '',
      departamento: '',
      salario: '',
      chave_pix: '',
      tipo_chave_pix: '',
      systemAccess: false,
      role: 'colaborador',
      password: '',
      sendInvite: false,
    })

  const handleOpenNew = () => {
    resetForm()
    setIsOpen(true)
  }

  const handleEdit = (p: any) => {
    setFormData({
      id: p.id,
      nome: p.nome || p.name || '',
      email: p.email || '',
      telefone: p.telefone || '',
      cpf: p.cpf || '',
      rg: p.rg || '',
      data_nascimento: p.data_nascimento || '',
      endereco: p.endereco || '',
      tipo_contrato: p.tipo_contrato || 'CLT',
      cargo: p.cargo || '',
      departamento: p.departamento || '',
      salario: p.salario ? String(p.salario) : '',
      chave_pix: p.chave_pix || '',
      tipo_chave_pix: p.tipo_chave_pix || '',
      systemAccess: !!p.user_id,
      role: p.role?.toLowerCase() || 'colaborador',
      password: '',
      sendInvite: false,
    })
    setIsOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome) return

    if (formData.systemAccess && !formData.email) {
      toast({
        title: 'Atenção',
        description: 'Para ter acesso ao sistema é obrigatório informar o e-mail.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const payload: any = {
        name: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        cpf: formData.cpf,
        rg: formData.rg,
        data_nascimento: formData.data_nascimento || null,
        endereco: formData.endereco,
        tipo_contrato: formData.tipo_contrato,
        cargo: formData.cargo,
        departamento: formData.departamento,
        salario: formData.salario || null,
        chave_pix: formData.chave_pix,
        tipo_chave_pix: formData.tipo_chave_pix,
        systemAccess: formData.systemAccess,
        role: formData.role,
        sendInvite: formData.sendInvite,
        password: formData.password || undefined,
      }

      let action = 'create'
      if (formData.id) {
        action = 'update'
        payload.id = formData.id
      }

      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action, payload },
      })
      if (error || data?.error) throw error || new Error(data?.error)

      setIsOpen(false)
      toast({
        title: 'Sucesso',
        description: `Cadastro ${formData.id ? 'atualizado' : 'criado'} com sucesso!`,
      })
      fetchPessoas()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir ${name}?`)) return
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'delete', payload: { id } },
      })
      if (error || data?.error) throw error || new Error(data?.error)
      toast({ title: 'Removido', description: 'Cadastro excluído.' })
      fetchPessoas()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  if (
    currentUser?.role !== 'admin' &&
    currentUser?.role !== 'Admin' &&
    currentUser?.role !== 'Gerente'
  ) {
    return <Navigate to="/app/mural" replace />
  }

  const filtered = pessoas.filter((p) => {
    const term = search.toLowerCase()
    const matchesSearch =
      (p.nome || p.name || '').toLowerCase().includes(term) ||
      (p.email || '').toLowerCase().includes(term) ||
      (p.cpf || '').includes(term)

    if (!matchesSearch) return false

    if (tab === 'clt') return p.tipo_contrato === 'CLT'
    if (tab === 'pj') return p.tipo_contrato === 'PJ'
    if (tab === 'prestador') return p.tipo_contrato === 'Prestador'
    if (tab === 'usuarios') return !!p.user_id

    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-800">
            <Contact className="w-6 h-6 text-primary" /> Pessoas
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestão centralizada de funcionários, prestadores e acessos.
          </p>
        </div>
        <Button className="gap-2 shrink-0 w-full sm:w-auto" onClick={handleOpenNew}>
          <UserPlus className="w-4 h-4" /> Nova Pessoa
        </Button>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50">
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 items-center bg-slate-50/50">
            <Tabs value={tab} onValueChange={setTab} className="w-full sm:w-auto overflow-x-auto">
              <TabsList className="w-full sm:w-auto justify-start h-auto p-1">
                <TabsTrigger value="todos" className="text-xs py-1.5">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="clt" className="text-xs py-1.5">
                  CLT
                </TabsTrigger>
                <TabsTrigger value="pj" className="text-xs py-1.5">
                  PJ
                </TabsTrigger>
                <TabsTrigger value="prestador" className="text-xs py-1.5">
                  Prestadores
                </TabsTrigger>
                <TabsTrigger value="usuarios" className="text-xs py-1.5 flex gap-1">
                  <ShieldCheck className="w-3 h-3" /> Com Acesso
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, email ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-[300px]">Nome / Contato</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead>Cargo / Setor</TableHead>
                  <TableHead>PIX</TableHead>
                  <TableHead className="text-center">Acesso Web</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border border-slate-200">
                            <AvatarImage src={p.avatar_url} />
                            <AvatarFallback className="bg-primary/5 text-primary text-xs">
                              {(p.nome || p.name)?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-slate-900 truncate">
                              {p.nome || p.name}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              {p.email && <span className="truncate">{p.email}</span>}
                              {p.email && p.telefone && <span>•</span>}
                              {p.telefone && <span>{p.telefone}</span>}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-slate-50 text-slate-600 border-slate-200"
                        >
                          {p.tipo_contrato || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">
                            {p.cargo || '-'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {p.departamento || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.chave_pix ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500">{p.tipo_chave_pix}</span>
                            <span className="text-sm font-mono text-slate-800">{p.chave_pix}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Não informado</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.user_id ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 pr-2"
                          >
                            <ShieldCheck className="w-3 h-3" /> Ativo
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Sem Acesso</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-primary"
                            onClick={() => handleEdit(p)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(p.id, p.nome || p.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
            <DialogTitle className="text-lg flex items-center gap-2">
              <Contact className="w-5 h-5 text-primary" />
              {formData.id ? 'Editar Pessoa' : 'Cadastrar Nova Pessoa'}
            </DialogTitle>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b">
                  <Users className="w-4 h-4 text-slate-400" /> Dados Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone / WhatsApp</Label>
                    <Input
                      value={formData.telefone}
                      onChange={(e) => setFormData((p) => ({ ...p, telefone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF / CNPJ</Label>
                    <Input
                      value={formData.cpf}
                      onChange={(e) => setFormData((p) => ({ ...p, cpf: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RG / IE</Label>
                    <Input
                      value={formData.rg}
                      onChange={(e) => setFormData((p) => ({ ...p, rg: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, data_nascimento: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Endereço Completo</Label>
                    <Input
                      value={formData.endereco}
                      onChange={(e) => setFormData((p) => ({ ...p, endereco: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b">
                  <Briefcase className="w-4 h-4 text-slate-400" /> Vínculo e Financeiro
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Vínculo *</Label>
                    <Select
                      value={formData.tipo_contrato}
                      onValueChange={(v) => setFormData((p) => ({ ...p, tipo_contrato: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLT">CLT</SelectItem>
                        <SelectItem value="PJ">PJ</SelectItem>
                        <SelectItem value="Prestador">Prestador de Serviço</SelectItem>
                        <SelectItem value="Estagiario">Estagiário</SelectItem>
                        <SelectItem value="Autonomo">Autônomo</SelectItem>
                        <SelectItem value="Socio">Sócio / Diretor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Setor / Departamento</Label>
                    <Select
                      value={formData.departamento}
                      onValueChange={(v) => setFormData((p) => ({ ...p, departamento: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMINISTRAÇÃO">ADMINISTRAÇÃO</SelectItem>
                        <SelectItem value="DESENVOLVIMENTO">DESENVOLVIMENTO</SelectItem>
                        <SelectItem value="IMPLANTAÇÃO">IMPLANTAÇÃO</SelectItem>
                        <SelectItem value="SUPORTE">SUPORTE</SelectItem>
                        <SelectItem value="COMERCIAL">COMERCIAL</SelectItem>
                        <SelectItem value="EXTERNO">EXTERNO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo / Função</Label>
                    <Input
                      value={formData.cargo}
                      onChange={(e) => setFormData((p) => ({ ...p, cargo: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salário / Remuneração (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.salario}
                      onChange={(e) => setFormData((p) => ({ ...p, salario: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo Chave PIX</Label>
                    <Select
                      value={formData.tipo_chave_pix}
                      onValueChange={(v) => setFormData((p) => ({ ...p, tipo_chave_pix: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CPF/CNPJ">CPF/CNPJ</SelectItem>
                        <SelectItem value="E-mail">E-mail</SelectItem>
                        <SelectItem value="Telefone">Telefone</SelectItem>
                        <SelectItem value="Aleatória">Aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Chave PIX</Label>
                    <Input
                      value={formData.chave_pix}
                      onChange={(e) => setFormData((p) => ({ ...p, chave_pix: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b">
                  <ShieldCheck className="w-4 h-4 text-slate-400" /> Acesso ao Sistema Web
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm bg-slate-50 md:col-span-2">
                    <div className="space-y-0.5">
                      <Label className="text-base">Permitir Acesso ao Portal</Label>
                      <div className="text-sm text-muted-foreground">
                        Habilitar login para que esta pessoa possa acessar o sistema como usuário.
                      </div>
                    </div>
                    <Switch
                      checked={formData.systemAccess}
                      onCheckedChange={(v) => setFormData((p) => ({ ...p, systemAccess: v }))}
                    />
                  </div>

                  {formData.systemAccess && (
                    <>
                      <div className="space-y-2">
                        <Label>Perfil de Acesso</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(v) => setFormData((p) => ({ ...p, role: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="gerente">Gerente</SelectItem>
                            <SelectItem value="colaborador">Funcionário / Comum</SelectItem>
                            <SelectItem value="personalizado">Personalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {!formData.id && (
                        <div className="space-y-2 flex flex-col justify-end">
                          <div className="flex items-center justify-between rounded-lg border p-3 bg-white">
                            <Label className="text-sm cursor-pointer flex items-center gap-2">
                              <Mail className="w-4 h-4 text-blue-500" /> Enviar Convite por E-mail
                            </Label>
                            <Switch
                              checked={formData.sendInvite}
                              onCheckedChange={(v) => setFormData((p) => ({ ...p, sendInvite: v }))}
                            />
                          </div>
                        </div>
                      )}

                      {(!formData.sendInvite || formData.id) && (
                        <div className="space-y-2">
                          <Label>{formData.id ? 'Nova Senha (opcional)' : 'Senha Inicial'}</Label>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              type="password"
                              className="pl-9"
                              value={formData.password}
                              onChange={(e) =>
                                setFormData((p) => ({ ...p, password: e.target.value }))
                              }
                              placeholder={
                                formData.id ? 'Preencha para alterar...' : 'Padrão: Skip@Pass123!'
                              }
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="px-8 shadow-sm">
                {isSaving ? 'Salvando...' : 'Salvar Pessoa'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
