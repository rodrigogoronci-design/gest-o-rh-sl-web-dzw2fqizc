import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
  UserPlus,
  Settings,
  HeartPulse,
  ChevronRight,
  Briefcase,
  Sliders,
} from 'lucide-react'
import useAppStore from '@/stores/useAppStore'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible'

export default function AppSidebar() {
  const { currentUser } = useAppStore()
  const location = useLocation()

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [appName, setAppName] = useState<string>('Gestão RH SL Web')

  useEffect(() => {
    supabase
      .from('configuracoes')
      .select('*')
      .in('chave', ['app_logo', 'app_name'])
      .then(({ data }) => {
        if (data) {
          const logo = data.find((d) => d.chave === 'app_logo')?.valor as any
          if (logo?.url) setLogoUrl(logo.url)
          const name = data.find((d) => d.chave === 'app_name')?.valor as any
          if (name?.text) setAppName(name.text)
        }
      })
  }, [])

  const menuItems = [
    {
      title: 'Dashboard',
      path: '/app/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'Admin', 'Gerente'],
    },
    {
      title: 'Gestão de Pessoas',
      icon: Briefcase,
      roles: ['admin', 'Admin', 'Gerente', 'user', 'Colaborador', 'Personalizado', 'personalizado'],
      items: [
        {
          title: 'Admissão',
          path: '/app/admissao',
          icon: UserPlus,
          roles: ['admin', 'Admin', 'Gerente'],
        },
        {
          title: 'Atestados',
          path: '/app/atestados',
          icon: FileText,
          roles: ['admin', 'Admin', 'Gerente'],
        },
        {
          title: 'Contra Cheque',
          path: '/app/contracheque',
          icon: Wallet,
          roles: [
            'admin',
            'Admin',
            'Gerente',
            'user',
            'Colaborador',
            'Personalizado',
            'personalizado',
          ],
        },
        {
          title: 'Controle de Ponto',
          path: '/app/ponto',
          icon: Clock,
          roles: [
            'admin',
            'Admin',
            'Gerente',
            'user',
            'Colaborador',
            'Personalizado',
            'personalizado',
          ],
        },
        {
          title: 'Mural de Plantões',
          path: '/app/mural',
          icon: CalendarDays,
          roles: [
            'admin',
            'Admin',
            'Gerente',
            'user',
            'Colaborador',
            'Personalizado',
            'personalizado',
          ],
        },
      ],
    },
    {
      title: 'Benefícios',
      icon: HeartPulse,
      roles: ['admin', 'Admin', 'Gerente', 'user', 'Colaborador', 'Personalizado', 'personalizado'],
      items: [
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
          title: 'Meritocracia',
          path: '/app/meritocracia',
          icon: Star,
          roles: [
            'admin',
            'Admin',
            'Gerente',
            'user',
            'Colaborador',
            'Personalizado',
            'personalizado',
          ],
        },
        {
          title: 'Plano de Saúde',
          path: '/app/plano-saude',
          icon: HeartPulse,
          roles: ['admin', 'Admin', 'Gerente'],
        },
      ],
    },
    {
      title: 'Painel de Controle',
      icon: Sliders,
      roles: ['admin', 'Admin', 'Gerente'],
      items: [
        {
          title: 'Configurações',
          path: '/app/configuracoes',
          icon: Settings,
          roles: ['admin', 'Admin', 'Gerente'],
        },
        {
          title: 'Gestão de Usuários',
          path: '/app/usuarios',
          icon: Users,
          roles: ['admin', 'Admin', 'Gerente'],
        },
      ],
    },
    {
      title: 'Relatórios',
      path: '/app/relatorios',
      icon: BarChart,
      roles: ['admin', 'Admin', 'Gerente'],
    },
  ]

  const filteredItems = menuItems
    .map((item) => {
      if (item.items) {
        const filteredSubItems = item.items.filter((sub) =>
          sub.roles.includes(currentUser?.role || ''),
        )
        return { ...item, items: filteredSubItems }
      }
      return item
    })
    .filter((item) => {
      if (item.items) return item.items.length > 0
      return item.roles.includes(currentUser?.role || '')
    })

  const sortedItems = filteredItems.sort((a, b) => {
    if (a.title === 'Dashboard') return -1
    if (b.title === 'Dashboard') return 1
    if (a.title === 'Relatórios') return 1
    if (b.title === 'Relatórios') return -1
    return a.title.localeCompare(b.title)
  })

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent>
        <div className="p-4 py-6 text-lg font-bold text-primary flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="max-h-8 max-w-[40px] object-contain rounded" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary flex shrink-0 items-center justify-center text-white text-sm">
              SL
            </div>
          )}
          <span className="truncate">{appName}</span>
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sortedItems.map((item) =>
                item.items ? (
                  <Collapsible key={item.title} asChild defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={location.pathname === subItem.path}
                              >
                                <Link to={subItem.path}>
                                  <subItem.icon className="w-4 h-4 mr-2" />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.path}
                      className={cn(
                        item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                      )}
                      tooltip={item.title}
                    >
                      <Link to={item.path!}>
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
