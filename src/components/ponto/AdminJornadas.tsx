import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export function AdminJornadas() {
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [departamentos, setDepartamentos] = useState<string[]>([])
  const [setorFilter, setSetorFilter] = useState<string>('todos')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [jornada, setJornada] = useState({
    entrada: '',
    saida_intervalo: '',
    retorno_intervalo: '',
    saida: '',
  })

  useEffect(() => {
    fetchColaboradores()
  }, [])

  const fetchColaboradores = async () => {
    const { data } = await supabase.from('colaboradores').select('*').order('nome')
    if (data) {
      setColaboradores(data)
      const deps = Array.from(new Set(data.map((c) => c.departamento).filter(Boolean))) as string[]
      setDepartamentos(deps)
    }
    setLoading(false)
  }

  const filteredColaboradores =
    setorFilter === 'todos'
      ? colaboradores
      : colaboradores.filter((c) => c.departamento === setorFilter)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredColaboradores.map((c) => c.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id))
    }
  }

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos um colaborador')
      return
    }

    try {
      const { error } = await supabase
        .from('colaboradores')
        .update({
          jornada_entrada: jornada.entrada || null,
          jornada_saida_intervalo: jornada.saida_intervalo || null,
          jornada_retorno_intervalo: jornada.retorno_intervalo || null,
          jornada_saida: jornada.saida || null,
        })
        .in('id', selectedIds)

      if (error) throw error

      toast.success('Jornada atualizada com sucesso para os colaboradores selecionados!')
      fetchColaboradores()
      setSelectedIds([])
    } catch (error: any) {
      toast.error('Erro ao atualizar jornada: ' + error.message)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>Configurar Jornada</CardTitle>
          <CardDescription>Defina os horários em lote</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Entrada (Início)</Label>
            <Input
              type="time"
              value={jornada.entrada}
              onChange={(e) => setJornada({ ...jornada, entrada: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Saída Intervalo</Label>
            <Input
              type="time"
              value={jornada.saida_intervalo}
              onChange={(e) => setJornada({ ...jornada, saida_intervalo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Retorno Intervalo</Label>
            <Input
              type="time"
              value={jornada.retorno_intervalo}
              onChange={(e) => setJornada({ ...jornada, retorno_intervalo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Saída (Fim)</Label>
            <Input
              type="time"
              value={jornada.saida}
              onChange={(e) => setJornada({ ...jornada, saida: e.target.value })}
            />
          </div>
          <Button className="w-full mt-4" onClick={handleSave}>
            Aplicar aos {selectedIds.length} Selecionados
          </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Colaboradores</CardTitle>
            <CardDescription>Selecione para aplicar a jornada</CardDescription>
          </div>
          <div className="w-[200px]">
            <Select
              value={setorFilter}
              onValueChange={(v) => {
                setSetorFilter(v)
                setSelectedIds([])
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Setores</SelectItem>
                {departamentos.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedIds.length === filteredColaboradores.length &&
                        filteredColaboradores.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Jornada Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColaboradores.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(c.id)}
                        onCheckedChange={(checked) => handleSelect(c.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.departamento || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {c.jornada_entrada
                        ? `${c.jornada_entrada} às ${c.jornada_saida}`
                        : 'Não definida'}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredColaboradores.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      Nenhum colaborador encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
