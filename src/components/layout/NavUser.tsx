import { LogOut, Settings, User } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { useConnectionStore } from '@/lib/store'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

function getInitials(name: string) {
  return name.split(/[\s_@]/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function NavUser() {
  const { open, isMobile } = useSidebar()
  const expanded = isMobile || open
  const { configured, username, url } = useConnectionStore()

  const displayName = configured && username ? username : 'Admin'
  const role        = configured ? 'Administrator' : 'Nicht verbunden'
  // Derive a readable host from the stored URL for display
  const host = (() => {
    try { return new URL(url).hostname } catch { return url }
  })()
  const emailLine = configured ? host : '—'

  return (
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
            <p className="text-xs text-muted-foreground">{emailLine}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem><User className="h-4 w-4" />Profil</DropdownMenuItem>
        <DropdownMenuItem><Settings className="h-4 w-4" />Einstellungen</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
