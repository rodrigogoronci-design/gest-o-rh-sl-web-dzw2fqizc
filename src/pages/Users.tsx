import { useState } from 'react'
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
import { Edit2, Trash2, UserPlus } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

type Role = 'admin' | 'user'

export default function Users() {
  const { currentUser, users, removeUser } = useAppStore()
  const { toast } = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('user')
  const [password, setPassword] = useState('')
  const [recebeTransporte, setRecebeTransporte] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editId, setEditId] = useState('')
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<Role>('user')
  const [editPassword, setEditPassword] = useState('')
  const [editRecebeTransporte, setEditRecebeTransporte] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'Admin') {
    return <Navigate to="/app/mural" replace />
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) return

    setIsSaving(true)
    try {
      const payload: any = { name, email, role, recebe_transporte: recebeTransporte }
      if (password) payload.password = password

      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'create', payload },
      })
      if (error || data?.error) throw error || new Error(data?.error)

      setIsOpen(false)
      setName('')
      setEmail('')
      setRole('user')
      setPassword('')
      setRecebeTransporte(true)
      toast({
        title: 'Usuário adicionado',
        description: `${name} foi adicionado com sucesso.`,
      })
      setTimeout(() => window.location.reload(), 1500)
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
    setEditRole(u.role === 'Admin' || u.role === 'admin' ? 'admin' : 'user')
    setEditPassword('')
    setEditRecebeTransporte(u.recebe_transporte ?? true)
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editId || !editName || !editEmail) return

    setIsUpdating(true)
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'update',
          payload: {
            id: editId,
            name: editName,
            email: editEmail,
            role: editRole,
            password: editPassword || undefined,
            recebe_transporte: editRecebeTransporte,
          },
        },
      })
      if (error || data?.error) throw error || new Error(data?.error)

      toast({
        title: 'Usuário atualizado',
        description: `${editName} foi atualizado com sucesso.`,
      })
      setIsEditOpen(false)
      setTimeout(() => window.location.reload(), 1500)
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
      setTimeout(() => window.location.reload(), 1500)
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
                <Label>Senha (Opcional)</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Deixe em branco para senha padrão"
                />
              </div>
              <div className="space-y-2">
                <Label>Perfil de Acesso</Label>
                <Select value={role} onValueChange={(val: Role) => setRole(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário Normal (Funcionário)</SelectItem>
                    <SelectItem value="admin">Administrador (Gestor)</SelectItem>
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
                  <SelectItem value="user">Usuário Normal (Funcionário)</SelectItem>
                  <SelectItem value="admin">Administrador (Gestor)</SelectItem>
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
                <TableHead>Perfil</TableHead>
                <TableHead>Vale-Transporte</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || u.nome}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={u.role === 'admin' || u.role === 'Admin' ? 'default' : 'secondary'}
                    >
                      {u.role === 'admin' || u.role === 'Admin' ? 'Administrador' : 'Funcionário'}
                    </Badge>
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
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
