import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
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
import { toast } from 'sonner'
import { Edit2, Trash2, Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function RegrasPontoTab() {
  const [regras, setRegras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [departamentos, setDepartamentos] = useState<string[]>([])
  const [cargos, setCargos] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const fetchRegras = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('regras_ponto').select('*').order('departamento')
      setRegras(data || [])

      const { data: colabs } = await supabase.from('colaboradores').select('departamento, cargo')
      if (colabs) {
        const deps = Array.from(
          new Set(colabs.map((c) => c.departamento).filter(Boolean)),
        ) as string[]
        const crgs = Array.from(new Set(colabs.map((c) => c.cargo).filter(Boolean))) as string[]
        setDepartamentos(deps)
        setCargos(crgs)
      }
    } catch (e: any) {
      toast.error('Erro ao carregar regras')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegras()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const payload = {
        departamento: formData.departamento,
        funcao: formData.funcao,
        jornada_diaria: formData.jornada_diaria,
        hora_entrada: formData.hora_entrada,
        hora_saida: formData.hora_saida,
        intervalo_minutos: formData.intervalo_minutos,
        adicional_noturno_percentual: formData.adicional_noturno_percentual,
      }
      if (formData.id) {
        await supabase.from('regras_ponto').update(payload).eq('id', formData.id).throwOnError()
      } else {
        await supabase.from('regras_ponto').insert(payload).throwOnError()
      }

      const colabPayload = {
        jornada_diaria: formData.jornada_diaria,
        jornada_entrada: formData.hora_entrada,
        jornada_saida: formData.hora_saida,
        intervalo_minutos: formData.intervalo_minutos,
        adicional_noturno_percentual: formData.adicional_noturno_percentual,
      }

      const { error: updateErr } = await supabase
        .from('colaboradores')
        .update(colabPayload)
        .eq('departamento', formData.departamento)
        .eq('cargo', formData.funcao)

      if (updateErr) {
        console.error('Erro ao vincular funcionários', updateErr)
      }

      toast.success('Regra salva com sucesso')
      setIsModalOpen(false)
      fetchRegras()
    } catch (e: any) {
      toast.error('Erro ao salvar regra: ' + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return
    try {
      await supabase.from('regras_ponto').delete().eq('id', id).throwOnError()
      toast.success('Regra excluída com sucesso')
      fetchRegras()
    } catch (e: any) {
      toast.error('Erro ao excluir regra')
    }
  }

  const openModal = (regra: any = null) => {
    setFormData(
      regra || {
        departamento: '',
        funcao: '',
        jornada_diaria: 8,
        hora_entrada: '08:00',
        hora_saida: '18:00',
        intervalo_minutos: 60,
        adicional_noturno_percentual: 20,
      },
    )
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" /> Nova Regra
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : regras.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhuma regra criada</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Departamento</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Jornada</TableHead>
                  <TableHead>Horários</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead>Adic. Noturno</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-6">{r.departamento}</TableCell>
                    <TableCell>{r.funcao}</TableCell>
                    <TableCell>{r.jornada_diaria}h</TableCell>
                    <TableCell>
                      {r.hora_entrada} às {r.hora_saida}
                    </TableCell>
                    <TableCell>{r.intervalo_minutos} min</TableCell>
                    <TableCell>{r.adicional_noturno_percentual}%</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openModal(r)}>
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
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
        <DialogContent className="w-[95vw] md:w-[90vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>{formData.id ? 'Editar Regra' : 'Nova Regra'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input
                  list="departamentos"
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  required
                />
                <datalist id="departamentos">
                  {departamentos.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Função / Cargo</Label>
                <Input
                  list="cargos"
                  value={formData.funcao}
                  onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                  required
                />
                <datalist id="cargos">
                  {cargos.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Jornada Diária (horas)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.jornada_diaria}
                  onChange={(e) => setFormData({ ...formData, jornada_diaria: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Intervalo (minutos)</Label>
                <Input
                  type="number"
                  value={formData.intervalo_minutos}
                  onChange={(e) => setFormData({ ...formData, intervalo_minutos: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Entrada</Label>
                <Input
                  type="time"
                  value={formData.hora_entrada}
                  onChange={(e) => setFormData({ ...formData, hora_entrada: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Saída</Label>
                <Input
                  type="time"
                  value={formData.hora_saida}
                  onChange={(e) => setFormData({ ...formData, hora_saida: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Adic. Noturno (%)</Label>
                <Input
                  type="number"
                  value={formData.adicional_noturno_percentual}
                  onChange={(e) =>
                    setFormData({ ...formData, adicional_noturno_percentual: e.target.value })
                  }
                  required
                />
              </div>
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
