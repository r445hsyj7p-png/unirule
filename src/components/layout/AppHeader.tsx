import { Sun, Moon } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { SearchForm } from './SearchForm'
import { NotificationBell } from './NotificationBell'
import { useTheme } from '@/hooks/useTheme'

export function AppHeader() {
  const { theme, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger />
      <div className="flex flex-1 items-center gap-3">
        <div className="flex-1">
          <SearchForm />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
