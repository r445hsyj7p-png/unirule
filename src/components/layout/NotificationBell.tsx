import { Bell } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThreats } from '@/hooks/useUnifi'
import { timeAgo, severityColor } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

const LS_KEY = 'unirule-notifications-read-at'

function getReadAt(): number {
  try { return parseInt(localStorage.getItem(LS_KEY) ?? '0', 10) || 0 } catch { return 0 }
}

function saveReadAt(ts: number) {
  try { localStorage.setItem(LS_KEY, String(ts)) } catch { /* ignore */ }
}

export function NotificationBell() {
  const navigate = useNavigate()
  const { threats } = useThreats()
  const [readAt, setReadAt] = useState(() => getReadAt())

  // Show the 20 most recent threats as notifications
  const notifications = threats.slice(0, 20)

  const unread = notifications.filter(t => t.timestamp.getTime() > readAt).length

  const markAllRead = useCallback(() => {
    const now = Date.now()
    saveReadAt(now)
    setReadAt(now)
  }, [])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
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
          {notifications.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Keine Ereignisse</p>
          )}
          {notifications.map(t => {
            const isNew = t.timestamp.getTime() > readAt
            return (
              <button
                key={t.id}
                className={`w-full px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors text-left ${isNew ? 'bg-muted/20' : ''}`}
                onClick={() => navigate('/threats')}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isNew ? 'bg-blue-500' : 'bg-muted-foreground/30'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-xs font-semibold ${severityColor(t.severity)}`}>
                        {t.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-snug truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(t.timestamp)}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </ScrollArea>
        <div className="px-4 py-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={markAllRead}
            disabled={unread === 0}
          >
            Alle als gelesen markieren
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
