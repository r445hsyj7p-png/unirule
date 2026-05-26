import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Network, ShieldAlert, Zap, BookOpen,
  Server, Layers, FileText, Plug, Settings,
} from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import { AppLogo } from './AppLogo'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { NavUser } from './NavUser'

const navGroups = [
  {
    label: 'Übersicht',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { label: 'Netzwerkkarte', icon: Network, href: '/network-map' },
    ],
  },
  {
    label: 'Sicherheit',
    items: [
      { label: 'Threats & Alerts', icon: ShieldAlert, href: '/threats' },
      { label: 'Policy Engine', icon: Zap, href: '/policies' },
      { label: 'Firewall-Regeln', icon: BookOpen, href: '/rules' },
    ],
  },
  {
    label: 'Infrastruktur',
    items: [
      { label: 'Geräte', icon: Server, href: '/devices' },
      { label: 'Zonen & Segmente', icon: Layers, href: '/zones' },
      { label: 'Log Explorer', icon: FileText, href: '/logs' },
    ],
  },
  {
    label: 'Konfiguration',
    items: [
      { label: 'Integrationen', icon: Plug, href: '/integrations' },
      { label: 'Einstellungen', icon: Settings, href: '/settings' },
    ],
  },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setOpenMobile, isMobile } = useSidebar()

  function handleNav(href: string) {
    navigate(href)
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <AppLogo type="large" />
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {navGroups.map((group, gi) => (
          <SidebarGroup key={gi}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.href}
                      onClick={() => handleNav(item.href)}
                      title={item.label}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
            {gi < navGroups.length - 1 && <SidebarSeparator className="mt-2" />}
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
