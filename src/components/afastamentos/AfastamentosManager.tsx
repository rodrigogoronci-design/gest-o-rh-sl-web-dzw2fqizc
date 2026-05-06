import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Check, ChevronsUpDown, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import AfastamentosTable from './AfastamentosTable'
import AfastamentoFormModal from './AfastamentoFormModal'

export default function AfastamentosManager() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [afastamentos, setAfastamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [mesesSelecionados, setMesesSelecionados] = useState<string[]>([
    format(new Date(), 'yyyy-MM'),
  ])
  const [isMonthPopoverOpen, setIsMonthPopoverOpen] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)

  const mesesOptions = useMemo(() => {
    const options = []
    const today = new Date()
    for (let i = -12; i <= 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
      options.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM/yyyy', { locale: ptBR }),
      })
    }
    return options
  }, [])

  const fetchProfileAndData = useCallback(async () => {
    setLoading(true)
    try {
      let currentProfile = profile
      if (user?.id && !currentProfile) {
        const { data: p } = await supabase
          .from('colaboradores')
          .select('*')
          .eq('user_id', user.id)
          .single()
        currentProfile = p
        setProfile(p)
      }

      if (currentProfile) {
        let query = supabase
          .from('afastamentos')
          .select('*, colaboradores!afastamentos_colaborador_id_fkey(nome)')
          .order('created_at', { ascending: false })

        if (mesesSelecionados.length > 0) {
          const filters = mesesSelecionados.map((m) => {
            const start = `${m}-01`
            const end = format(
              new Date(parseISO(start).getFullYear(), parseISO(start).getMonth() + 1, 0),
              'yyyy-MM-dd',
            )
            return `and(data_inicio.lte.${end},data_fim.gte.${start})`
          })
          query = query.or(filters.join(','))
        } else {
          query = query.limit(100)
        }

        const { data: af } = await query
        setAfastamentos(af || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user, mesesSelecionados, profile])

  useEffect(() => {
    fetchProfileAndData()
  }, [fetchProfileAndData])

  const isManager = ['admin', 'gerente', 'administrador'].includes(
    profile?.role?.toLowerCase() || '',
  )
  const meus = afastamentos.filter((a) => a.colaborador_id === profile?.id)
  const equipe = afastamentos.filter((a) => a.colaborador_id !== profile?.id)

  const openNewModal = () => {
    setEditItem(null)
    setIsModalOpen(true)
  }

  const openEditModal = (item: any) => {
    setEditItem(item)
    setIsModalOpen(true)
  }

  const toggleMes = (mes: string) => {
    setMesesSelecionados((prev) =>
      prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes],
    )
  }

  if (loading && !profile) return <Skeleton className="w-full h-[400px]" />

  return (
    <Tabs defaultValue="meus" className="w-full flex flex-col flex-1 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="meus">Meus Afastamentos</TabsTrigger>
            {isManager && <TabsTrigger value="equipe">Da Equipe</TabsTrigger>}
          </TabsList>

          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap text-muted-foreground text-sm hidden sm:block">
              Mês:
            </Label>
            <Popover open={isMonthPopoverOpen} onOpenChange={setIsMonthPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isMonthPopoverOpen}
                  className="min-w-[200px] justify-between"
                >
                  {mesesSelecionados.length === 0
                    ? 'Todos'
                    : mesesSelecionados.length === 1
                      ? mesesOptions.find((o) => o.value === mesesSelecionados[0])?.label
                      : `${mesesSelecionados.length} meses selecionados`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar mês..." />
                  <CommandList>
                    <CommandEmpty>Nenhum mês encontrado.</CommandEmpty>
                    <CommandGroup>
                      {mesesOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.label}
                          onSelect={() => toggleMes(option.value)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              mesesSelecionados.includes(option.value)
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          <span className="capitalize">{option.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Button onClick={openNewModal} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Novo Afastamento
        </Button>
      </div>

      {mesesSelecionados.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {mesesSelecionados.map((mes) => (
            <Badge key={mes} variant="secondary" className="gap-1 capitalize">
              {mesesOptions.find((o) => o.value === mes)?.label || mes}
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-500"
                onClick={() => toggleMes(mes)}
              />
            </Badge>
          ))}
          {mesesSelecionados.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setMesesSelecionados([])}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      <AfastamentoFormModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        profile={profile}
        editItem={editItem}
        onSaved={fetchProfileAndData}
      />

      <TabsContent value="meus" className="m-0 flex-1 overflow-y-auto">
        {loading ? (
          <Skeleton className="w-full h-64" />
        ) : (
          <AfastamentosTable
            data={meus}
            type="meus"
            profile={profile}
            onUpdate={fetchProfileAndData}
            onEdit={openEditModal}
          />
        )}
      </TabsContent>

      {isManager && (
        <TabsContent value="equipe" className="m-0 flex-1 overflow-y-auto">
          <Tabs defaultValue="pendentes">
            <TabsList className="mb-2">
              <TabsTrigger value="pendentes">
                Pendentes ({equipe.filter((a) => a.status === 'pendente').length})
              </TabsTrigger>
              <TabsTrigger value="aprovados">Aprovados</TabsTrigger>
              <TabsTrigger value="reprovados">Reprovados</TabsTrigger>
            </TabsList>
            {loading ? (
              <Skeleton className="w-full h-64 mt-2" />
            ) : (
              <>
                <TabsContent value="pendentes" className="m-0">
                  <AfastamentosTable
                    data={equipe.filter((a) => a.status === 'pendente')}
                    type="equipe"
                    profile={profile}
                    onUpdate={fetchProfileAndData}
                    onEdit={openEditModal}
                  />
                </TabsContent>
                <TabsContent value="aprovados" className="m-0">
                  <AfastamentosTable
                    data={equipe.filter((a) => a.status === 'aprovado')}
                    type="equipe"
                    profile={profile}
                    onUpdate={fetchProfileAndData}
                    onEdit={openEditModal}
                  />
                </TabsContent>
                <TabsContent value="reprovados" className="m-0">
                  <AfastamentosTable
                    data={equipe.filter((a) => a.status === 'reprovado')}
                    type="equipe"
                    profile={profile}
                    onUpdate={fetchProfileAndData}
                    onEdit={openEditModal}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        </TabsContent>
      )}
    </Tabs>
  )
}
