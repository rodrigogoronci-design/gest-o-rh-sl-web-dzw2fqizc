import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { AdminPonto } from '@/components/ponto/AdminPonto'
import { EmployeePonto } from '@/components/ponto/EmployeePonto'
import { Skeleton } from '@/components/ui/skeleton'

export default function Ponto() {
  const { user } = useAuth()
  const [colaborador, setColaborador] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      supabase
        .from('colaboradores')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setColaborador(data)
          setIsAdmin(data?.role === 'Admin' || data?.role === 'Gerente')
          setLoading(false)
        })
    }
  }, [user])

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[400px]" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Ponto Digital</h1>
          <p className="text-muted-foreground">Gestão inteligente com rastreamento e segurança.</p>
        </div>
      </div>

      {isAdmin ? <AdminPonto /> : <EmployeePonto colaborador={colaborador} />}
    </div>
  )
}
