import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { mockNotifications } from '@/data/mock'
import { timeAgo, severityColor } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

export function NotificationBell() {
  const navigate = useNavigate()
  const unread = mockNotifications.filter(n => !n.read).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Benachrichtigungen</h4>
          <span className="text-xs text-muted-foreground">{unread} ungelesen</span>
        </div>
        <ScrollArea className="h-80">
          {mockNotifications.map(n => (
            <button
              key={n.id}
              className={`w-full px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors text-left ${!n.read ? 'bg-muted/20' : ''}`}
              onClick={() => navigate(n.href)}
            >
              <div className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-muted-foreground/30' : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-xs font-semibold ${severityColor(n.severity)}`}>
                      {n.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.time)}</p>
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
        <div className="px-4 py-2 border-t">
          <Button variant="ghost" size="sm" className="w-full text-xs">Alle als gelesen markieren</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
