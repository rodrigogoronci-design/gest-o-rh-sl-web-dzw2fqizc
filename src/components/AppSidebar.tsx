import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Utensils,
  Bus,
  Star,
  FileText,
  BarChart,
  Clock,
  Wallet,
} from 'lucide-react'
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
      roles: ['admin', 'Admin', 'Gerente'],
    },
    {
      title: 'Mural de Plantões',
      path: '/app/mural',
      icon: CalendarDays,
      roles: ['admin', 'Admin', 'Gerente', 'user', 'Colaborador'],
    },
    {
      title: 'Controle de Ponto',
      path: '/app/ponto',
      icon: Clock,
      roles: ['admin', 'Admin', 'Gerente', 'user', 'Colaborador'],
    },
    {
      title: 'Contra Cheque',
      path: '/app/contracheque',
      icon: Wallet,
      roles: ['admin', 'Admin', 'Gerente', 'user', 'Colaborador'],
    },
    {
      title: 'Atestados',
      path: '/app/atestados',
      icon: FileText,
      roles: ['admin', 'Admin', 'Gerente'],
    },
    {
      title: 'Gestão de Usuários',
      path: '/app/usuarios',
      icon: Users,
      roles: ['admin', 'Admin', 'Gerente'],
    },
    {
      title: 'Ticket Alimentação',
      path: '/app/ticket',
      icon: Utensils,
      roles: ['admin', 'Admin', 'Gerente'],
    },
    {
      title: 'Vale Transporte',
      path: '/app/transporte',
      icon: Bus,
      roles: ['admin', 'Admin', 'Gerente'],
    },
    {
      title: 'Meritocracia (Em breve)',
      path: '#',
      icon: Star,
      roles: ['admin', 'Admin', 'Gerente'],
      disabled: true,
    },
    {
      title: 'Relatórios',
      path: '/app/relatorios',
      icon: BarChart,
      roles: ['admin', 'Admin', 'Gerente'],
    },
  ]

  const filteredItems = menuItems.filter((item) => item.roles.includes(currentUser?.role || ''))

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent>
        <div className="p-4 py-6 text-lg font-bold text-primary flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex shrink-0 items-center justify-center text-white text-sm">
            SL
          </div>
          <span className="truncate">Gestão RH SL Web</span>
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
