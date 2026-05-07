import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Edit2, Trash2, Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function FeriadosTab() {
  const [feriados, setFeriados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)

  const fetchFeriados = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('feriados')
        .select('*')
        .order('data', { ascending: false })
      setFeriados(data || [])
    } catch (e: any) {
      toast.error('Erro ao carregar feriados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeriados()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const payload = {
        data: formData.data,
        descricao: formData.descricao,
        tipo: formData.tipo,
      }
      if (formData.id) {
        await supabase.from('feriados').update(payload).eq('id', formData.id).throwOnError()
      } else {
        await supabase.from('feriados').insert(payload).throwOnError()
      }
      toast.success(
        formData.id ? 'Feriado atualizado com sucesso' : 'Feriado adicionado com sucesso',
      )
      setIsModalOpen(false)
      fetchFeriados()
    } catch (e: any) {
      toast.error('Erro ao salvar feriado: ' + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return
    try {
      await supabase.from('feriados').delete().eq('id', id).throwOnError()
      toast.success('Feriado excluído com sucesso')
      fetchFeriados()
    } catch (e: any) {
      toast.error('Erro ao excluir feriado')
    }
  }

  const openModal = (feriado: any = null) => {
    setFormData(
      feriado || {
        data: format(new Date(), 'yyyy-MM-dd'),
        descricao: '',
        tipo: 'Feriado Nacional',
      },
    )
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" /> Novo Feriado
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : feriados.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum feriado criado</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feriados.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="pl-6">{format(parseISO(f.data), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{f.descricao}</TableCell>
                    <TableCell>{f.tipo}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openModal(f)}>
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] md:w-[90vw] max-w-md">
          <DialogHeader>
            <DialogTitle>{formData.id ? 'Editar Feriado' : 'Novo Feriado'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                required
                placeholder="Ex: Natal"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData({ ...formData, tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Feriado Nacional">Feriado Nacional</SelectItem>
                  <SelectItem value="Feriado Estadual">Feriado Estadual</SelectItem>
                  <SelectItem value="Feriado Municipal">Feriado Municipal</SelectItem>
                  <SelectItem value="Ponto Facultativo">Ponto Facultativo</SelectItem>
                </SelectContent>
              </Select>
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
