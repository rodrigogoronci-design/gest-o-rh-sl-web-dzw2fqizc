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
    dias: [] as string[],
  })

  const diasSemana = [
    { id: '1', label: 'Segunda-feira' },
    { id: '2', label: 'Terça-feira' },
    { id: '3', label: 'Quarta-feira' },
    { id: '4', label: 'Quinta-feira' },
    { id: '5', label: 'Sexta-feira' },
    { id: '6', label: 'Sábado' },
    { id: '0', label: 'Domingo' },
  ]

  useEffect(() => {
    fetchColaboradores()
  }, [])

  const fetchColaboradores = async () => {
    const { data } = await supabase.from('colaboradores').select('*').order('nome')
    if (data) {
      const filtered = data.filter((c) => {
        const nome = (c.nome || '').toLowerCase()
        return !(
          nome.includes('administrador geral') ||
          nome.includes('ismael bomfim') ||
          nome.includes('rodrigo')
        )
      })
      setColaboradores(filtered)
      const deps = Array.from(
        new Set(filtered.map((c) => c.departamento).filter(Boolean)),
      ) as string[]
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
      const payload: any = {
        jornada_entrada: jornada.entrada || null,
        jornada_saida_intervalo: jornada.saida_intervalo || null,
        jornada_retorno_intervalo: jornada.retorno_intervalo || null,
        jornada_saida: jornada.saida || null,
        jornada_dias: jornada.dias.length > 0 ? jornada.dias : null,
      }

      const { error } = await supabase.from('colaboradores').update(payload).in('id', selectedIds)

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
          <div className="space-y-3 pt-2 pb-1 border-t">
            <Label>Dias da Semana</Label>
            <div className="grid grid-cols-2 gap-3">
              {diasSemana.map((dia) => (
                <div key={dia.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dia-${dia.id}`}
                    checked={jornada.dias.includes(dia.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setJornada({ ...jornada, dias: [...jornada.dias, dia.id] })
                      } else {
                        setJornada({ ...jornada, dias: jornada.dias.filter((d) => d !== dia.id) })
                      }
                    }}
                  />
                  <Label htmlFor={`dia-${dia.id}`} className="text-sm font-normal cursor-pointer">
                    {dia.label}
                  </Label>
                </div>
              ))}
            </div>
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
                        ? `${c.jornada_entrada} às ${c.jornada_saida}${
                            c.jornada_dias &&
                            Array.isArray(c.jornada_dias) &&
                            c.jornada_dias.length > 0
                              ? ` (${c.jornada_dias.length} dias)`
                              : ''
                          }`
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
