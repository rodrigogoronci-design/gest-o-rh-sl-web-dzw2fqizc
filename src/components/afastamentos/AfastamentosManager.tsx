import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import AfastamentosTable from './AfastamentosTable'
import AfastamentoFormModal from './AfastamentoFormModal'

export default function AfastamentosManager() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [afastamentos, setAfastamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mesAno, setMesAno] = useState(format(new Date(), 'yyyy-MM'))

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)

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
        const start = `${mesAno}-01`
        const end = format(
          new Date(parseISO(start).getFullYear(), parseISO(start).getMonth() + 1, 0),
          'yyyy-MM-dd',
        )

        const { data: af } = await supabase
          .from('afastamentos')
          .select('*, colaboradores!afastamentos_colaborador_id_fkey(nome)')
          .lte('data_inicio', end)
          .gte('data_fim', start)
          .order('created_at', { ascending: false })

        setAfastamentos(af || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user, mesAno, profile])

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

  if (loading && !profile) return <Skeleton className="w-full h-[400px]" />

  return (
    <Tabs defaultValue="meus" className="w-full flex flex-col flex-1 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <TabsList>
            <TabsTrigger value="meus">Meus Afastamentos</TabsTrigger>
            {isManager && <TabsTrigger value="equipe">Da Equipe</TabsTrigger>}
          </TabsList>
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap text-muted-foreground text-sm hidden sm:block">
              Mês:
            </Label>
            <Input
              type="month"
              value={mesAno}
              onChange={(e) => setMesAno(e.target.value)}
              className="w-40 h-9"
            />
          </div>
        </div>
        <Button onClick={openNewModal} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Novo Afastamento
        </Button>
      </div>

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
