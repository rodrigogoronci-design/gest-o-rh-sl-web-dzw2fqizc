import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider } from '@/stores/useAppStore'

import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Mural from './pages/Mural'
import Users from './pages/Users'
import Ticket from './pages/Ticket'
import Transport from './pages/Transport'

const App = () => (
  <AppProvider>
    <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/app" element={<Layout />}>
            <Route index element={<Navigate to="mural" replace />} />
            <Route path="mural" element={<Mural />} />
            <Route path="usuarios" element={<Users />} />
            <Route path="ticket" element={<Ticket />} />
            <Route path="transporte" element={<Transport />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AppProvider>
)

export default App
