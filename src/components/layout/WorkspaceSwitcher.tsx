import { ChevronsUpDown, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSidebar } from '@/components/ui/sidebar'
import { useConnectionStore } from '@/lib/store'

export function WorkspaceSwitcher() {
  const { open, isMobile } = useSidebar()
  const expanded = isMobile || open
  const navigate = useNavigate()
  const { configured, site, url } = useConnectionStore()

  // Derive a readable workspace label from the stored site/URL
  const siteName = site && site !== 'default' ? site : undefined
  const host = (() => {
    try { return new URL(url).hostname } catch { return '' }
  })()
  const label = siteName ?? (host || 'Unirule')
  const icon = configured ? '🌐' : '⚠️'

  if (!expanded) {
    return (
      <div className="flex justify-center px-1 py-1">
        <div className="w-8 h-8 rounded-md bg-[var(--sidebar-accent)] flex items-center justify-center text-sm">
          {icon}
        </div>
      </div>
    )
  }

  return (
    <div className="px-1">
      <button
        onClick={() => navigate('/settings')}
        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--sidebar-accent)] transition-colors group"
        title="Einstellungen öffnen"
      >
        <span className="text-sm">{icon}</span>
        <span className="flex-1 text-left text-sm font-medium text-[var(--sidebar-foreground)] truncate">
          {label}
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-[var(--sidebar-foreground)]/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Settings className="w-3.5 h-3.5 text-[var(--sidebar-foreground)]/50 shrink-0 group-hover:hidden" />
      </button>
    </div>
  )
}
