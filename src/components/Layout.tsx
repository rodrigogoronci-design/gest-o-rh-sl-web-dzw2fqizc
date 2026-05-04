import { Navigate, Outlet } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar'
import AppSidebar from './AppSidebar'
import AppHeader from './AppHeader'
import useAppStore from '@/stores/useAppStore'
import { useSessionTimeout } from '@/hooks/use-session-timeout'

export default function Layout() {
  const { currentUser } = useAppStore()
  useSessionTimeout()

  if (!currentUser) {
    return <Navigate to="/" replace />
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50 overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen">
          <AppHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
