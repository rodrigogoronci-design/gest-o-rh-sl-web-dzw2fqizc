import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

export function AdmissaoFormModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    endereco: '',
    codigo_funcionario: '',
    cargo: '',
    departamento: '',
    data_admissao: '',
    salario: '',
  })

  const handleChange = (e: any) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        role: 'colaborador',
        tipo_contrato: 'CLT',
        recebe_transporte: true,
        sendInvite: true,
      }

      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'create', payload },
      })

      if (error || data?.error) throw error || new Error(data?.error)

      toast({ title: 'Sucesso', description: 'Colaborador admitido e usuário criado com sucesso!' })
      onSuccess()
      onClose()
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        cpf: '',
        rg: '',
        data_nascimento: '',
        endereco: '',
        codigo_funcionario: '',
        cargo: '',
        departamento: '',
        data_admissao: '',
        salario: '',
      })
    } catch (err: any) {
      toast({ title: 'Erro na admissão', description: err.message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ficha de Admissão - Novo Colaborador (CLT)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input name="nome" value={formData.nome} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Celular (WhatsApp) *</Label>
              <Input
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input name="cpf" value={formData.cpf} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>RG</Label>
              <Input name="rg" value={formData.rg} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                name="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Endereço Completo</Label>
              <Input name="endereco" value={formData.endereco} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Código do Funcionário *</Label>
              <Input
                name="codigo_funcionario"
                value={formData.codigo_funcionario}
                onChange={handleChange}
                placeholder="Ex: 1234"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Admissão *</Label>
              <Input
                name="data_admissao"
                type="date"
                value={formData.data_admissao}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo *</Label>
              <Input name="cargo" value={formData.cargo} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label>Setor / Departamento *</Label>
              <Select
                value={formData.departamento}
                onValueChange={(val) => setFormData((p) => ({ ...p, departamento: val }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMINISTRAÇÃO">ADMINISTRAÇÃO</SelectItem>
                  <SelectItem value="DESENVOLVIMENTO">DESENVOLVIMENTO</SelectItem>
                  <SelectItem value="IMPLANTAÇÃO">IMPLANTAÇÃO</SelectItem>
                  <SelectItem value="SUPORTE">SUPORTE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Salário Base (R$)</Label>
              <Input
                name="salario"
                type="number"
                step="0.01"
                value={formData.salario}
                onChange={handleChange}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? 'Processando...' : 'Concluir Admissão'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
