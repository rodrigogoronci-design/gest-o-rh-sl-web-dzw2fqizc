import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import useAppStore from '@/stores/useAppStore'
import { Calendar as CalendarIcon } from 'lucide-react'

export function FeriasDialog({ onFeriasAdded }: { onFeriasAdded: () => void }) {
  const { users } = useAppStore()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [colaboradorId, setColaboradorId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!colaboradorId || !dataInicio || !dataFim) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }

    if (dataInicio > dataFim) {
      toast({ title: 'Data de início não pode ser maior que data fim', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    const { error } = await supabase.from('ferias').insert({
      colaborador_id: colaboradorId,
      data_inicio: dataInicio,
      data_fim: dataFim,
      status: 'Aprovado',
    })
    setIsSubmitting(false)

    if (error) {
      toast({ title: 'Erro ao lançar férias', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Férias lançadas com sucesso' })
      setOpen(false)
      setColaboradorId('')
      setDataInicio('')
      setDataFim('')
      onFeriasAdded()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 hover:text-orange-700"
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Lançar Férias
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar Férias</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Colaborador</Label>
            <Select value={colaboradorId} onValueChange={setColaboradorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o colaborador..." />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => u.role === 'user')
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Férias'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
