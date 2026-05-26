import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, Sun, Moon } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { useConnectionStore } from '@/lib/store'
import { useAuthStore } from '@/lib/authStore'
import { useThemeStore } from '@/lib/themeStore'
import { authApi } from '@/lib/authApi'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function getInitials(name: string) {
  return name.split(/[\s_@]/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function NavUser() {
  const { open, isMobile } = useSidebar()
  const expanded  = isMobile || open
  const navigate  = useNavigate()
  const { configured, url } = useConnectionStore()
  const { username, setUnauthenticated } = useAuthStore()
  const { theme, toggle: toggleTheme } = useThemeStore()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const displayName = username ?? 'Admin'
  const role        = configured ? 'Administrator' : 'Nicht verbunden'
  const host = (() => { try { return new URL(url).hostname } catch { return url } })()

  async function confirmLogout() {
    setLoggingOut(true)
    try { await authApi.logout() } catch { /* ignore */ }
    setUnauthenticated()
    setLogoutOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--sidebar-accent)] transition-colors">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs bg-foreground text-background">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            {expanded && (
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-[var(--sidebar-foreground)] truncate">{displayName}</div>
                <div className="text-[10px] text-[var(--sidebar-foreground)]/50 truncate flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${configured ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  {role}
                </div>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{displayName}</p>
                <Badge variant="outline" className="text-[9px] py-0">
                  {configured ? 'Administrator' : 'Offline'}
                </Badge>
              </div>
              {configured && host && (
                <p className="text-xs text-muted-foreground truncate">{host}</p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4" />
            Einstellungen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === 'dark'
              ? <Sun className="h-4 w-4" />
              : <Moon className="h-4 w-4" />
            }
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logout confirmation dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Abmelden?</DialogTitle>
            <DialogDescription>
              Deine Session wird beendet. Du musst dich erneut anmelden um auf Unirule zuzugreifen.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={confirmLogout}
              disabled={loggingOut}
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Abmelden…' : 'Abmelden'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setLogoutOpen(false)}>
              Abbrechen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
