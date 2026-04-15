import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Users, Utensils, Bus, Star, FileText } from 'lucide-react'
import useAppStore from '@/stores/useAppStore'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export default function AppSidebar() {
  const { currentUser } = useAppStore()
  const location = useLocation()

  const menuItems = [
    {
      title: 'Dashboard',
      path: '/app/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'user'],
    },
    {
      title: 'Mural de Plantões',
      path: '/app/mural',
      icon: CalendarDays,
      roles: ['admin', 'user'],
    },
    {
      title: 'Atestados',
      path: '/app/atestados',
      icon: FileText,
      roles: ['admin', 'user'],
    },
    { title: 'Gestão de Usuários', path: '/app/usuarios', icon: Users, roles: ['admin'] },
    { title: 'Ticket Alimentação', path: '/app/ticket', icon: Utensils, roles: ['admin'] },
    { title: 'Vale Transporte', path: '/app/transporte', icon: Bus, roles: ['admin'] },
    {
      title: 'Meritocracia (Em breve)',
      path: '#',
      icon: Star,
      roles: ['admin', 'user'],
      disabled: true,
    },
  ]

  const filteredItems = menuItems.filter((item) => item.roles.includes(currentUser?.role || ''))

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent>
        <div className="p-4 py-6 text-xl font-bold text-primary flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
            CB
          </div>
          <span>ControleBenef</span>
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                    className={cn(
                      item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                    )}
                  >
                    <Link to={item.path}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
