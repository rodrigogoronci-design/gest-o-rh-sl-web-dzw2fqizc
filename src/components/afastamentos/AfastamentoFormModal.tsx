import { useState, useEffect } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { useToast } from '@/hooks/use-toast'

interface Props {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  profile: any
  editItem?: any
  onSaved: () => void
}

export default function AfastamentoFormModal({
  isOpen,
  onOpenChange,
  profile,
  editItem,
  onSaved,
}: Props) {
  const { toast } = useToast()
  const isAdmin = ['admin', 'gerente', 'administrador'].includes(profile?.role?.toLowerCase() || '')

  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [colaboradorId, setColaboradorId] = useState('')
  const [tipo, setTipo] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAdmin && isOpen) {
      supabase
        .from('colaboradores')
        .select('id, nome')
        .eq('status', 'Ativo')
        .order('nome')
        .then(({ data }) => setColaboradores(data || []))
    }
  }, [isAdmin, isOpen])

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setColaboradorId(editItem.colaborador_id)
        setTipo(editItem.tipo)
        setDataInicio(editItem.data_inicio)
        setDataFim(editItem.data_fim)
        setJustificativa(editItem.justificativa || '')
      } else {
        setColaboradorId(profile?.id || '')
        setTipo('')
        setDataInicio('')
        setDataFim('')
        setJustificativa('')
      }
      setFile(null)
    }
  }, [isOpen, editItem, profile])

  const dias =
    dataInicio && dataFim ? differenceInDays(parseISO(dataFim), parseISO(dataInicio)) + 1 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (tipo === 'Atestado Médico' && !file && !editItem?.documento_anexo) {
        throw new Error('Documento é obrigatório para atestado médico')
      }

      let fileUrl = editItem?.documento_anexo
      if (file) {
        const ext = file.name.split('.').pop()
        const name = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('atestados')
          .upload(`afastamentos/${name}`, file)
        if (upErr) throw upErr
        const { data } = supabase.storage.from('atestados').getPublicUrl(`afastamentos/${name}`)
        fileUrl = data.publicUrl
      }

      const targetColabId = isAdmin && colaboradorId ? colaboradorId : profile?.id
      const payload = {
        colaborador_id: targetColabId,
        tipo,
        data_inicio: dataInicio,
        data_fim: dataFim,
        dias_afastado: dias > 0 ? dias : 1,
        justificativa,
        documento_anexo: fileUrl,
        status: 'pendente',
      }

      if (editItem) {
        const { error } = await supabase.from('afastamentos').update(payload).eq('id', editItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('afastamentos').insert(payload)
        if (error) throw error
      }

      toast({ title: 'Afastamento salvo com sucesso' })
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] w-[95vw]">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Editar Afastamento' : 'Novo Afastamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {isAdmin && (
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={colaboradorId} onValueChange={setColaboradorId} required>
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
          )}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Atestado Médico">Atestado Médico</SelectItem>
                <SelectItem value="Licença">Licença</SelectItem>
                <SelectItem value="Folga">Folga</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Dias Afastado</Label>
            <Input type="text" value={dias > 0 ? dias : 0} disabled className="bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label>Justificativa</Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Documento (obrigatório p/ atestado)</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
