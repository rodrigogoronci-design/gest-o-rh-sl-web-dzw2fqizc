import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { getPlanos, savePlano, deletePlano } from '@/services/plano-saude'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

export function GestaoPlanos() {
  const [planos, setPlanos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>({
    codigo: '',
    descricao: '',
    valor_titular: 0,
    valor_dependente: 0,
    com_coparticipacao: false,
    padrao: false,
  })
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    try {
      const data = await getPlanos()
      setPlanos(data)
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await savePlano(form)
      toast({ title: 'Plano salvo com sucesso' })
      setOpen(false)
      load()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    }
  }

  const handleEdit = (p: any) => {
    setForm(p)
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este plano?')) return
    try {
      await deletePlano(id)
      load()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await supabase.functions.invoke('parse-excel', {
        body: formData,
      })
      if (res.error) throw res.error
      const data = res.data.data

      const sheetName = Object.keys(data)[0]
      const rows = data[sheetName]

      let imported = 0
      for (const row of rows.slice(1)) {
        if (!row[0]) continue
        await savePlano({
          codigo: String(row[0]),
          descricao: String(row[1] || `Plano ${row[0]}`),
          valor_titular: Number(row[2] || 0),
          valor_dependente: Number(row[3] || 0),
        })
        imported++
      }
      toast({ title: 'Sucesso', description: `${imported} planos importados.` })
      load()
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Planos Cadastrados</CardTitle>
        <div className="flex gap-2">
          <div>
            <input
              type="file"
              id="excel-upload"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
            />
            <Button variant="outline" asChild disabled={uploading}>
              <label htmlFor="excel-upload" className="cursor-pointer">
                {uploading ? 'Importando...' : 'Importar Excel'}
              </label>
            </Button>
          </div>
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o)
              if (!o)
                setForm({
                  codigo: '',
                  descricao: '',
                  valor_titular: 0,
                  valor_dependente: 0,
                  com_coparticipacao: false,
                  padrao: false,
                })
            }}
          >
            <DialogTrigger asChild>
              <Button>Novo Plano</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{form.id ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Código</Label>
                  <Input
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor Titular</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.valor_titular}
                      onChange={(e) => setForm({ ...form, valor_titular: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Valor Dependente</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.valor_dependente}
                      onChange={(e) =>
                        setForm({ ...form, valor_dependente: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="copart"
                    checked={form.com_coparticipacao}
                    onCheckedChange={(c) => setForm({ ...form, com_coparticipacao: !!c })}
                  />
                  <Label htmlFor="copart">Com Coparticipação</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="padrao"
                    checked={form.padrao}
                    onCheckedChange={(c) => setForm({ ...form, padrao: !!c })}
                  />
                  <Label htmlFor="padrao">Plano Padrão</Label>
                </div>
                <Button type="submit" className="w-full">
                  Salvar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor Tit.</TableHead>
              <TableHead>Valor Dep.</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planos.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.codigo}</TableCell>
                <TableCell>
                  {p.descricao} {p.padrao && '(Padrão)'}
                </TableCell>
                <TableCell>R$ {p.valor_titular}</TableCell>
                <TableCell>R$ {p.valor_dependente}</TableCell>
                <TableCell className="space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => handleDelete(p.id)}
                  >
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
