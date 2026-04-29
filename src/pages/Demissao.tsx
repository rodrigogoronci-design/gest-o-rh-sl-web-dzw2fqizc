import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import useAppStore from '@/stores/useAppStore'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  UserMinus,
  Search,
  X,
  AlertTriangle,
  Calendar as CalendarIcon,
  DollarSign,
  Briefcase,
  Building2,
} from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'

export default function Demissao() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()

  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dataDemissao, setDataDemissao] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [motivo, setMotivo] = useState('')

  const fetchUsers = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('colaboradores')
      .select('*')
      .neq('status', 'Inativo')
      .neq('status', 'Demitido')
      .order('nome')
    if (data) setColaboradores(data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'Admin') {
    return <Navigate to="/app/mural" replace />
  }

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const removeUser = (id: string) => {
    setSelectedIds((prev) => prev.filter((i) => i !== id))
  }

  const handleDemissao = async () => {
    if (selectedIds.length === 0) return
    if (!dataDemissao) {
      toast({
        title: 'Atenção',
        description: 'Informe a data de demissão.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const updates = selectedIds.map((id) => ({
        id,
        status: 'Inativo',
        data_demissao: dataDemissao,
        motivo_demissao: motivo,
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('colaboradores')
          .update({
            status: update.status,
            data_demissao: update.data_demissao,
            motivo_demissao: update.motivo_demissao,
          })
          .eq('id', update.id)
        if (error) throw error

        // Remove from future shifts starting from tomorrow
        const tomorrow = format(
          new Date(new Date().setDate(new Date().getDate() + 1)),
          'yyyy-MM-dd',
        )
        await supabase
          .from('plantoes')
          .delete()
          .eq('colaborador_id', update.id)
          .gte('data', tomorrow)
      }

      toast({
        title: 'Demissão Realizada',
        description: `${selectedIds.length} colaborador(es) desligado(s) com sucesso. Eles foram removidos das escalas e cálculos operacionais.`,
        className: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      })

      setSelectedIds([])
      setMotivo('')
      fetchUsers()
    } catch (error: any) {
      toast({
        title: 'Erro ao processar',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const selectedUsers = colaboradores.filter((c) => selectedIds.includes(c.id))

  const formatCurrency = (val: number | null) => {
    if (!val) return 'Não informado'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-800">
          <UserMinus className="w-6 h-6 text-red-500" />
          Desligamento de Colaborador
        </h1>
        <p className="text-muted-foreground mt-1">
          Efetue o desligamento e desvinculação sistêmica de colaboradores ativos.
        </p>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-slate-200/50">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg">Seleção de Colaboradores</CardTitle>
          <CardDescription>Busque e selecione quem será desligado</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Adicionar Colaborador</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-auto min-h-[2.5rem] bg-white hover:bg-slate-50"
                  disabled={isLoading}
                >
                  <div className="flex flex-wrap gap-1.5 items-center py-1">
                    {selectedUsers.length > 0 ? (
                      selectedUsers.map((u) => (
                        <Badge
                          key={u.id}
                          variant="secondary"
                          className="bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200 gap-1 pr-1 font-medium"
                        >
                          {u.nome || u.name}
                          <div
                            role="button"
                            tabIndex={0}
                            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-slate-300 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeUser(u.id)
                            }}
                          >
                            <X className="w-3 h-3" />
                          </div>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground font-normal">
                        {isLoading ? 'Carregando...' : 'Buscar pelo nome...'}
                      </span>
                    )}
                  </div>
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar colaborador..." />
                  <CommandList>
                    <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                    <CommandGroup>
                      {colaboradores.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={u.nome || u.name}
                          onSelect={() => toggleUser(u.id)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <div
                            className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(u.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-slate-300'}`}
                          >
                            {selectedIds.includes(u.id) && <X className="w-3 h-3 scale-75" />}
                          </div>
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={u.avatar_url} />
                            <AvatarFallback className="text-[10px] bg-slate-100">
                              {(u.nome || u.name)?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{u.nome || u.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {u.departamento || 'Sem setor'}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedUsers.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">
                Dados de Admissão dos Selecionados
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {selectedUsers.map((u) => (
                  <Card
                    key={`card-${u.id}`}
                    className="shadow-none border border-slate-200 bg-slate-50/50"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <Avatar className="w-10 h-10 border border-white shadow-sm">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(u.nome || u.name)?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-sm text-slate-800 line-clamp-1">
                            {u.nome || u.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" /> Cargo
                          </span>
                          <span className="font-medium text-slate-700 text-right">
                            {u.cargo || '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" /> Setor
                          </span>
                          <span className="font-medium text-slate-700 text-right">
                            {u.departamento || '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5" /> Admissão
                          </span>
                          <span className="font-medium text-slate-700 text-right">
                            {u.data_admissao
                              ? format(parseISO(u.data_admissao), 'dd/MM/yyyy')
                              : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" /> Salário Base
                          </span>
                          <span className="font-medium text-slate-700 text-right">
                            {formatCurrency(u.salario)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-6 md:grid-cols-2 bg-red-50/50 p-5 rounded-xl border border-red-100 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="data-demissao" className="text-red-900 font-semibold">
                    Data do Desligamento
                  </Label>
                  <Input
                    id="data-demissao"
                    type="date"
                    value={dataDemissao}
                    onChange={(e) => setDataDemissao(e.target.value)}
                    className="bg-white border-red-200 focus-visible:ring-red-500"
                  />
                  <p className="text-[11px] text-red-700 mt-1">
                    A partir desta data, os colaboradores serão desvinculados de escalas futuras e
                    cálculos de benefícios operacionais.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motivo" className="text-red-900 font-semibold">
                    Motivo / Observações (Opcional)
                  </Label>
                  <Textarea
                    id="motivo"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Detalhes sobre o desligamento..."
                    className="min-h-[80px] bg-white border-red-200 focus-visible:ring-red-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Atenção:</span> Esta ação é irreversível e afetará os
            cálculos do mês vigente.
          </div>
          <Button
            variant="destructive"
            className="gap-2 font-semibold shadow-sm px-6"
            onClick={handleDemissao}
            disabled={selectedIds.length === 0 || isSaving}
          >
            {isSaving ? 'Processando...' : `Confirmar Desligamento (${selectedIds.length})`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
