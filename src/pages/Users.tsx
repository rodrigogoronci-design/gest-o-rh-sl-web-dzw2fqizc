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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Edit2, Trash2, UserPlus, Mail, Camera } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

type Role = 'admin' | 'colaborador' | 'personalizado'

export default function Users() {
  const { currentUser, removeUser } = useAppStore()
  const { toast } = useToast()

  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchUsers = async () => {
    setIsLoading(true)
    const { data } = await supabase.from('colaboradores').select('*').order('nome')
    if (data) setColaboradores(data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('colaborador')
  const [setor, setSetor] = useState('')
  const [password, setPassword] = useState('')
  const [recebeTransporte, setRecebeTransporte] = useState(true)
  const [sendInvite, setSendInvite] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editId, setEditId] = useState('')
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<Role>('colaborador')
  const [editSetor, setEditSetor] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRecebeTransporte, setEditRecebeTransporte] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState('')

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'Admin') {
    return <Navigate to="/app/mural" replace />
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) return

    setIsSaving(true)
    try {
      let uploadedAvatarUrl = ''
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const filePath = `avatars/new-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile)
        if (!uploadError) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
          uploadedAvatarUrl = data.publicUrl
        }
      }

      const payload: any = {
        name,
        email,
        role,
        departamento: setor,
        recebe_transporte: recebeTransporte,
        sendInvite,
        avatar_url: uploadedAvatarUrl,
      }
      if (password && !sendInvite) payload.password = password

      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'create', payload },
      })
      if (error || data?.error) throw error || new Error(data?.error)

      setIsOpen(false)
      setName('')
      setEmail('')
      setRole('colaborador')
      setSetor('')
      setPassword('')
      setRecebeTransporte(true)
      setSendInvite(false)
      setAvatarFile(null)
      setAvatarPreview('')
      toast({
        title: 'Usuário adicionado',
        description: `${name} foi adicionado com sucesso.${sendInvite ? ' Um convite foi enviado para o e-mail.' : ''}`,
      })
      fetchUsers()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível adicionar o usuário.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditClick = (u: any) => {
    setEditId(u.id)
    setEditName(u.name || u.nome)
    setEditEmail(u.email)
    setEditRole(
      u.role?.toLowerCase() === 'admin'
        ? 'admin'
        : u.role?.toLowerCase() === 'personalizado'
          ? 'personalizado'
          : 'colaborador',
    )
    setEditSetor(u.departamento || '')
    setEditPassword('')
    setEditRecebeTransporte(u.recebe_transporte ?? true)
    setEditAvatarUrl(u.avatar_url || '')
    setEditAvatarFile(null)
    setEditAvatarPreview('')
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editId || !editName || !editEmail) return

    setIsUpdating(true)
    try {
      let finalAvatarUrl = editAvatarUrl
      if (editAvatarFile) {
        const fileExt = editAvatarFile.name.split('.').pop()
        const filePath = `avatars/${editId}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, editAvatarFile, { upsert: true })
        if (!uploadError) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
          finalAvatarUrl = data.publicUrl
        }
      }

      const payload = {
        id: editId,
        name: editName,
        email: editEmail,
        role: editRole,
        departamento: editSetor,
        password: editPassword || undefined,
        recebe_transporte: editRecebeTransporte === true,
        avatar_url: finalAvatarUrl,
      }

      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'update',
          payload,
        },
      })

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Erro ao atualizar usuário')
      }

      toast({
        title: 'Usuário atualizado',
        description: `${editName} foi atualizado com sucesso.`,
      })
      setIsEditOpen(false)
      fetchUsers()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível atualizar o usuário.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleResendInvite = async (userEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'resend_invite', payload: { email: userEmail } },
      })
      if (error || data?.error) throw error || new Error(data?.error)
      toast({
        title: 'Convite reenviado',
        description: `O convite foi reenviado para ${userEmail}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível reenviar o convite.',
        variant: 'destructive',
      })
    }
  }

  const handleRemove = async (id: string, userName: string) => {
    if (id === currentUser?.id) {
      toast({
        title: 'Ação negada',
        description: 'Você não pode remover a si mesmo.',
        variant: 'destructive',
      })
      return
    }
    if (!confirm('Deseja realmente remover este usuário?')) return

    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'delete', payload: { id } },
      })

      if (error || data?.error) throw error || new Error(data?.error)

      await removeUser(id)
      toast({ title: 'Usuário removido', description: `${userName} foi removido do sistema.` })
      fetchUsers()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível remover.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Gestão de Usuários</h1>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="flex justify-center mb-4">
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-2 border-slate-100 shadow-sm">
                    <AvatarImage src={avatarPreview} />
                    <AvatarFallback className="text-2xl">{name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-1 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setAvatarFile(e.target.files[0])
                          setAvatarPreview(URL.createObjectURL(e.target.files[0]))
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@app.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={setor} onValueChange={setSetor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMINISTRATIVO">ADMINISTRATIVO</SelectItem>
                    <SelectItem value="DESENVOLVIMENTO">DESENVOLVIMENTO</SelectItem>
                    <SelectItem value="IMPLANTAÇÃO">IMPLANTAÇÃO</SelectItem>
                    <SelectItem value="SUPORTE">SUPORTE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Senha (Opcional)</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Deixe em branco para senha padrão"
                  disabled={sendInvite}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-50">
                <div className="space-y-0.5">
                  <Label>Enviar convite por e-mail</Label>
                  <div className="text-[0.8rem] text-muted-foreground">
                    O usuário receberá um link para definir a senha e acessar.
                  </div>
                </div>
                <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
              </div>
              <div className="space-y-2">
                <Label>Perfil de Acesso</Label>
                <Select value={role} onValueChange={(val: Role) => setRole(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="colaborador">Funcionário</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label>Recebe Vale-Transporte</Label>
                  <div className="text-[0.8rem] text-muted-foreground">
                    Ative para exibir este colaborador no módulo de controle.
                  </div>
                </div>
                <Switch checked={recebeTransporte} onCheckedChange={setRecebeTransporte} />
              </div>
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Usuário'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-4">
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-2 border-slate-100 shadow-sm">
                  <AvatarImage src={editAvatarPreview || editAvatarUrl} />
                  <AvatarFallback className="text-2xl">{editName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-1 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setEditAvatarFile(e.target.files[0])
                        setEditAvatarPreview(URL.createObjectURL(e.target.files[0]))
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ex: João da Silva"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="joao@app.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={editSetor} onValueChange={setEditSetor}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMINISTRATIVO">ADMINISTRATIVO</SelectItem>
                  <SelectItem value="DESENVOLVIMENTO">DESENVOLVIMENTO</SelectItem>
                  <SelectItem value="IMPLANTAÇÃO">IMPLANTAÇÃO</SelectItem>
                  <SelectItem value="SUPORTE">SUPORTE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Preencha apenas se quiser alterar"
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select value={editRole} onValueChange={(val: Role) => setEditRole(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="colaborador">Funcionário</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label>Recebe Vale-Transporte</Label>
                <div className="text-[0.8rem] text-muted-foreground">
                  Ative para exibir este colaborador no módulo de controle.
                </div>
              </div>
              <Switch checked={editRecebeTransporte} onCheckedChange={setEditRecebeTransporte} />
            </div>
            <Button type="submit" className="w-full" disabled={isUpdating}>
              {isUpdating ? 'Atualizando...' : 'Atualizar Usuário'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Vale-Transporte</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando usuários...
                  </TableCell>
                </TableRow>
              ) : colaboradores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                colaboradores.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-11 h-11">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {(u.name || u.nome)?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{u.name || u.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {u.departamento || 'Não definido'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          u.role?.toLowerCase() === 'admin'
                            ? 'default'
                            : u.role?.toLowerCase() === 'personalizado'
                              ? 'outline'
                              : 'secondary'
                        }
                      >
                        {u.role?.toLowerCase() === 'admin'
                          ? 'Administrador'
                          : u.role?.toLowerCase() === 'personalizado'
                            ? 'Personalizado'
                            : 'Funcionário'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.status === 'Inativo' || u.status === 'Demitido' ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Inativo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          Ativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.recebe_transporte !== false ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          Sim
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-500">
                          Não
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Reenviar Convite"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => handleResendInvite(u.email)}
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => handleEditClick(u)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-1"
                        onClick={() => handleRemove(u.id, u.name || u.nome)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
