import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider } from '@/stores/useAppStore'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Mural from './pages/Mural'
import Dashboard from './pages/Dashboard'
import DashboardGestor from './pages/DashboardGestor'
import Users from './pages/Users'
import Ticket from './pages/Ticket'
import Transport from './pages/Transport'
import Atestados from './pages/Atestados'
import Reports from './pages/Reports'
import Historico from './pages/Historico'
import Ponto from './pages/Ponto'
import Apropriacao from './pages/Apropriacao'
import AjustesPonto from './pages/AjustesPonto'
import ContraCheque from './pages/ContraCheque'
import Profile from './pages/Profile'
import Meritocracia from './pages/Meritocracia'
import MeritocraciaSetor from './pages/MeritocraciaSetor'
import Admissao from './pages/Admissao'
import Demissao from './pages/Demissao'
import Pessoas from './pages/Pessoas'
import Settings from './pages/Settings'
import PlanoSaude from './pages/PlanoSaude'
import Acessos from './pages/Acessos'
import PontoRelatorios from './pages/PontoRelatorios'
import BancoHoras from './pages/BancoHoras'
import ConfiguracoesPonto from './pages/ConfiguracoesPonto'

const ProtectedRoute = () => {
  const { user, colaborador, loading, signOut } = useAuth()

  if (loading)
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>

  if (!user) return <Navigate to="/" replace />

  if (!colaborador) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center animate-in fade-in duration-500">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Perfil não encontrado</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Sua conta de usuário foi autenticada, mas não encontramos um perfil de colaborador
            vinculado ao seu email. Por favor, entre em contato com o suporte ou administrador do
            sistema.
          </p>
          <Button
            className="w-full h-11 text-base"
            onClick={async () => {
              await signOut('logout')
              window.location.href = '/'
            }}
          >
            Voltar para o login
          </Button>
        </div>
      </div>
    )
  }

  return <Outlet />
}

const AdminRoute = () => {
  const { user, isAdmin, loading } = useAuth()

  if (loading)
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>

  if (!user) return <Navigate to="/" replace />
  if (!isAdmin) return <Navigate to="/app/mural" replace />

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
                  <Route path="dashboard-gestor" element={<DashboardGestor />} />
                  <Route path="relatorios" element={<Reports />} />
                  <Route path="atestados" element={<Atestados />} />
                  <Route path="historico" element={<Historico />} />
                  <Route path="usuarios" element={<Users />} />
                  <Route path="ticket" element={<Ticket />} />
                  <Route path="transporte" element={<Transport />} />
                  <Route path="pessoas" element={<Pessoas />} />
                  <Route path="admissao" element={<Admissao />} />
                  <Route path="demissao" element={<Demissao />} />
                  <Route path="configuracoes" element={<Settings />} />
                  <Route path="acessos" element={<Acessos />} />
                  <Route path="ajustes-ponto" element={<AjustesPonto />} />
                  <Route path="relatorios-ponto" element={<PontoRelatorios />} />
                  <Route path="configuracoes-ponto" element={<ConfiguracoesPonto />} />
                </Route>
                <Route path="mural" element={<Mural />} />
                <Route path="meritocracia" element={<Meritocracia />} />
                <Route path="meritocracia/:setor" element={<MeritocraciaSetor />} />
                <Route path="ponto" element={<Ponto />} />
                <Route path="apropriacao" element={<Apropriacao />} />
                <Route path="banco-horas" element={<BancoHoras />} />
                <Route path="contracheque" element={<ContraCheque />} />
                <Route path="plano-saude" element={<PlanoSaude />} />
                <Route path="perfil" element={<Profile />} />
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
