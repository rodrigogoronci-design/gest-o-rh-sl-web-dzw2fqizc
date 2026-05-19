import { Navigate, Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import AppSidebar from './AppSidebar'
import AppHeader from './AppHeader'
import useAppStore from '@/stores/useAppStore'
import { useSessionTimeout } from '@/hooks/use-session-timeout'

export default function Layout() {
  const { currentUser } = useAppStore()
  useSessionTimeout()

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin opacity-50" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-w-0 bg-slate-50 h-screen overflow-hidden">
        <AppHeader />
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
