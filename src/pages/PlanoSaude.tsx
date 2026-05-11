import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { MeuPlano } from '@/components/plano-saude/MeuPlano'
import { GestaoPlanos } from '@/components/plano-saude/GestaoPlanos'
import { Solicitacoes } from '@/components/plano-saude/Solicitacoes'
import { RelatorioDescontos } from '@/components/plano-saude/RelatorioDescontos'
import { HeartPulse } from 'lucide-react'

export default function PlanoSaude() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [colaboradorId, setColaboradorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      if (!user) return
      const { data } = await supabase
        .from('colaboradores')
        .select('id, role')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setColaboradorId(data.id)
        const role = data.role?.toLowerCase() || ''
        setIsAdmin(role === 'admin' || role === 'administrador' || role === 'gerente')
      }
      setLoading(false)
    }
    loadUser()
  }, [user])

  if (loading) return <div className="p-8">Carregando...</div>
  if (!colaboradorId) return <div className="p-8">Usuário não encontrado.</div>

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <HeartPulse className="w-8 h-8 text-primary" />
          Plano de Saúde
        </h2>
      </div>

      <Tabs defaultValue="meu-plano" className="space-y-4">
        <TabsList>
          <TabsTrigger value="meu-plano">Meu Plano</TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="gestao">Gestão de Planos</TabsTrigger>
              <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
              <TabsTrigger value="relatorios">Descontos</TabsTrigger>
            </>
          )}
        </TabsList>
        <TabsContent value="meu-plano">
          <MeuPlano colaboradorId={colaboradorId} />
        </TabsContent>
        {isAdmin && (
          <>
            <TabsContent value="gestao">
              <GestaoPlanos />
            </TabsContent>
            <TabsContent value="solicitacoes">
              <Solicitacoes adminId={colaboradorId} />
            </TabsContent>
            <TabsContent value="relatorios">
              <RelatorioDescontos />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
