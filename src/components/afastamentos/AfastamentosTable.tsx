import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Check, X, Trash2, Edit } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  data: any[]
  type: 'meus' | 'equipe'
  profile: any
  onUpdate: () => void
  onEdit: (item: any) => void
}

export default function AfastamentosTable({ data, type, profile, onUpdate, onEdit }: Props) {
  const { toast } = useToast()
  const [comentarioModal, setComentarioModal] = useState<{
    isOpen: boolean
    id: string
    action: 'aprovar' | 'reprovar' | null
  }>({ isOpen: false, id: '', action: null })
  const [comentario, setComentario] = useState('')

  const handleAction = async () => {
    const { id, action } = comentarioModal
    const status = action === 'aprovar' ? 'aprovado' : 'reprovado'
    try {
      const { data: af } = await supabase
        .from('afastamentos')
        .select('justificativa')
        .eq('id', id)
        .single()
      const newJust = comentario
        ? `${af?.justificativa || ''}\n\nParecer do Gestor: ${comentario}`
        : af?.justificativa

      await supabase
        .from('afastamentos')
        .update({
          status,
          aprovado_por: profile.id,
          justificativa: newJust,
        })
        .eq('id', id)

      toast({ title: `Afastamento ${status}` })
      onUpdate()
    } catch (e) {
      toast({ title: 'Erro', variant: 'destructive' })
    } finally {
      setComentarioModal({ isOpen: false, id: '', action: null })
      setComentario('')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir?')) return
    await supabase.from('afastamentos').delete().eq('id', id)
    toast({ title: 'Excluído com sucesso' })
    onUpdate()
  }

  const statusColors: Record<string, string> = {
    pendente: 'bg-yellow-500',
    aprovado: 'bg-green-500',
    reprovado: 'bg-red-500',
  }

  if (data.length === 0)
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-lg bg-slate-50 mt-2">
        Nenhum afastamento para este período
      </div>
    )

  return (
    <div className="border rounded-lg overflow-x-auto bg-white mt-2">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="bg-slate-50 border-b">
          <tr>
            {type === 'equipe' && <th className="p-3">Colaborador</th>}
            <th className="p-3">Período</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Dias</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              {type === 'equipe' && <td className="p-3 font-medium">{item.colaboradores?.nome}</td>}
              <td className="p-3">
                {format(parseISO(item.data_inicio), 'dd/MM/yyyy')} a{' '}
                {format(parseISO(item.data_fim), 'dd/MM/yyyy')}
              </td>
              <td className="p-3">{item.tipo}</td>
              <td className="p-3">{item.dias_afastado}</td>
              <td className="p-3">
                <Badge
                  className={`${statusColors[item.status?.toLowerCase()] || 'bg-slate-500'} text-white`}
                >
                  {item.status?.toUpperCase()}
                </Badge>
              </td>
              <td className="p-3 text-right flex justify-end gap-1">
                {item.documento_anexo && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(item.documento_anexo)}
                    title="Visualizar documento"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                {item.status === 'pendente' &&
                  (type === 'meus' || item.colaborador_id === profile?.id) && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-blue-500"
                        onClick={() => onEdit(item)}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => handleDelete(item.id)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                {type === 'equipe' &&
                  item.status === 'pendente' &&
                  item.colaborador_id !== profile?.id && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-600"
                        onClick={() =>
                          setComentarioModal({ isOpen: true, id: item.id, action: 'aprovar' })
                        }
                        title="Aprovar"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600"
                        onClick={() =>
                          setComentarioModal({ isOpen: true, id: item.id, action: 'reprovar' })
                        }
                        title="Reprovar"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog
        open={comentarioModal.isOpen}
        onOpenChange={(open) =>
          !open && setComentarioModal({ isOpen: false, id: '', action: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {comentarioModal.action === 'aprovar' ? 'Aprovar' : 'Reprovar'} Afastamento
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Comentário (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setComentarioModal({ isOpen: false, id: '', action: null })}
            >
              Cancelar
            </Button>
            <Button onClick={handleAction}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
