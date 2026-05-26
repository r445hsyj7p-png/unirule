import { LogOut, Settings, User } from 'lucide-react'
import { mockUser } from '@/data/mock'
import { useSidebar } from '@/components/ui/sidebar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

export function NavUser() {
  const { open, isMobile } = useSidebar()
  const expanded = isMobile || open

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--sidebar-accent)] transition-colors">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-xs bg-foreground text-background">
              {getInitials(mockUser.name)}
            </AvatarFallback>
          </Avatar>
          {expanded && (
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium text-[var(--sidebar-foreground)] truncate">{mockUser.name}</div>
              <div className="text-[10px] text-[var(--sidebar-foreground)]/50 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                {mockUser.role}
              </div>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{mockUser.name}</p>
              <Badge variant="outline" className="text-[9px] py-0">{mockUser.role}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{mockUser.email}</p>
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
