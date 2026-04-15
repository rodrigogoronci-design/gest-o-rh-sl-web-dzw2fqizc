import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider } from '@/stores/useAppStore'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'

import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Mural from './pages/Mural'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Ticket from './pages/Ticket'
import Transport from './pages/Transport'
import Atestados from './pages/Atestados'
import Reports from './pages/Reports'
import Historico from './pages/Historico'
import Ponto from './pages/Ponto'
import ContraCheque from './pages/ContraCheque'

const ProtectedRoute = () => {
  const { user, loading } = useAuth()
  if (loading)
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  if (!user) return <Navigate to="/" replace />
  return <Outlet />
}

const AdminRoute = () => {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (user) {
      supabase
        .from('colaboradores')
        .select('role')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setIsAdmin(data?.role === 'Admin' || data?.role === 'Gerente')
        })
    }
  }, [user])

  if (loading || (user && isAdmin === null))
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>

  if (!user) return <Navigate to="/" replace />
  if (isAdmin === false) return <Navigate to="/app/mural" replace />

  return <Outlet />
}

const App = () => (
  <AuthProvider>
    <AppProvider>
      <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/app" element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="mural" replace />} />
                <Route element={<AdminRoute />}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="relatorios" element={<Reports />} />
                  <Route path="atestados" element={<Atestados />} />
                  <Route path="historico" element={<Historico />} />
                  <Route path="usuarios" element={<Users />} />
                  <Route path="ticket" element={<Ticket />} />
                  <Route path="transporte" element={<Transport />} />
                </Route>
                <Route path="mural" element={<Mural />} />
                <Route path="ponto" element={<Ponto />} />
                <Route path="contracheque" element={<ContraCheque />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </AppProvider>
  </AuthProvider>
)

export default App
