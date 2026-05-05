import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
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
  UserMinus,
  Settings,
  HeartPulse,
  ChevronRight,
  Briefcase,
  Sliders,
  Award,
  ShieldAlert,
  FileEdit,
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
  const { user } = useAuth()
  const location = useLocation()

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [appName, setAppName] = useState<string>('Gestão RH SL Web')
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('colaboradores')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data)
        })
    }

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
          title: 'Demissão',
          path: '/app/demissao',
          icon: UserMinus,
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
          title: 'Ajustes de Ponto',
          path: '/app/ajustes-ponto',
          icon: FileEdit,
          roles: ['admin', 'Admin', 'Gerente'],
        },
        {
          title: 'Apropriação de Horas',
          path: '/app/apropriacao',
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
      icon: Award,
      roles: ['admin', 'Admin', 'Gerente', 'user', 'Colaborador', 'Personalizado', 'personalizado'],
      items: [
        {
          title: 'Meritocracia',
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
          items: [
            {
              title: 'Visão Geral',
              path: '/app/meritocracia',
              icon: LayoutDashboard,
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
              title: 'Administrativo',
              path: '/app/meritocracia/administrativo',
              icon: Users,
              roles: [
                'admin',
                'Admin',
                'Gerente',
                'user',
                'Colaborador',
                'Personalizado',
                'personalizado',
              ],
              departments: ['ADMINISTRATIVO'],
            },
            {
              title: 'Desenvolvimento',
              path: '/app/meritocracia/desenvolvimento',
              icon: Users,
              roles: [
                'admin',
                'Admin',
                'Gerente',
                'user',
                'Colaborador',
                'Personalizado',
                'personalizado',
              ],
              departments: ['DESENVOLVIMENTO'],
            },
            {
              title: 'Implantação',
              path: '/app/meritocracia/implantacao',
              icon: Users,
              roles: [
                'admin',
                'Admin',
                'Gerente',
                'user',
                'Colaborador',
                'Personalizado',
                'personalizado',
              ],
              departments: ['IMPLANTAÇÃO'],
            },
            {
              title: 'Suporte',
              path: '/app/meritocracia/suporte',
              icon: Users,
              roles: [
                'admin',
                'Admin',
                'Gerente',
                'user',
                'Colaborador',
                'Personalizado',
                'personalizado',
              ],
              departments: ['SUPORTE'],
            },
          ],
        },
        {
          title: 'Plano de Saúde',
          path: '/app/plano-saude',
          icon: HeartPulse,
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
        {
          title: 'Auditoria de Acessos',
          path: '/app/acessos',
          icon: ShieldAlert,
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

  const activeUser = profile || currentUser

  const normalizeStr = (s?: string | null) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

  const checkDeptMatch = (uDept: string, targetDepts: string[]) => {
    if (!uDept) return false
    return targetDepts.some((d) => {
      const normD = normalizeStr(d)
      return uDept === normD || uDept.includes(normD) || normD.includes(uDept)
    })
  }

  const filteredItems = menuItems
    .map((item) => {
      if (item.items) {
        const filteredSubItems = item.items
          .map((sub: any) => {
            if (sub.items) {
              const filteredNested = sub.items.filter((nested: any) => {
                const userRole = normalizeStr(activeUser?.role)
                const userDept = normalizeStr(activeUser?.departamento)
                const isAdmin = ['admin', 'administrador', 'gerente'].includes(userRole)
                const isRoleMatch = nested.roles.some((r: string) => normalizeStr(r) === userRole)

                if (nested.departments) {
                  const isDeptMatch = checkDeptMatch(userDept, nested.departments)
                  return isAdmin || isDeptMatch
                }

                return isAdmin || isRoleMatch
              })
              return { ...sub, items: filteredNested }
            }
            const userRole = normalizeStr(activeUser?.role)
            const userDept = normalizeStr(activeUser?.departamento)
            const isAdmin = ['admin', 'administrador', 'gerente'].includes(userRole)
            const isRoleMatch = sub.roles.some((r: string) => normalizeStr(r) === userRole)

            if (sub.departments) {
              const isDeptMatch = checkDeptMatch(userDept, sub.departments)
              return isAdmin || isDeptMatch ? sub : null
            }

            return isAdmin || isRoleMatch ? sub : null
          })
          .filter(Boolean)
          .filter((sub: any) => {
            if (sub.items) return sub.items.length > 0
            return true
          })
        return { ...item, items: filteredSubItems }
      }
      return item
    })
    .filter((item) => {
      if (item.items) return item.items.length > 0
      const userRole = normalizeStr(activeUser?.role)
      const isAdmin = ['admin', 'administrador', 'gerente'].includes(userRole)
      return isAdmin || item.roles.some((r: string) => normalizeStr(r) === userRole)
    })

  const renderSubItem = (subItem: any) => {
    if (subItem.items) {
      return (
        <Collapsible key={subItem.title} asChild className="group/sub-collapsible">
          <SidebarMenuSubItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuSubButton className="w-full flex justify-between cursor-pointer font-medium text-slate-700">
                <div className="flex items-center">
                  <subItem.icon className="w-4 h-4 mr-2" />
                  <span>{subItem.title}</span>
                </div>
                <ChevronRight className="w-3 h-3 ml-auto transition-transform duration-200 group-data-[state=open]/sub-collapsible:rotate-90" />
              </SidebarMenuSubButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub className="pr-0 mr-0 border-l-0 ml-3 pl-3 border-sidebar-border border-l mt-1 space-y-1">
                {subItem.items.map((nestedItem: any) => (
                  <SidebarMenuSubItem key={nestedItem.title}>
                    <SidebarMenuSubButton asChild isActive={location.pathname === nestedItem.path}>
                      <Link to={nestedItem.path}>
                        <nestedItem.icon className="w-3.5 h-3.5 mr-2" />
                        <span>{nestedItem.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuSubItem>
        </Collapsible>
      )
    }
    return (
      <SidebarMenuSubItem key={subItem.title}>
        <SidebarMenuSubButton asChild isActive={location.pathname === subItem.path}>
          <Link to={subItem.path}>
            <subItem.icon className="w-4 h-4 mr-2" />
            <span>{subItem.title}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }

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
                          {item.items.map((subItem: any) => renderSubItem(subItem))}
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
