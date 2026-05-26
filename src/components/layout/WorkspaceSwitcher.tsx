import { useState } from 'react'
import { ChevronsUpDown, Check, Plus } from 'lucide-react'
import { mockWorkspaces } from '@/data/mock'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export function WorkspaceSwitcher() {
  const { open, isMobile } = useSidebar()
  const expanded = isMobile || open
  const [active, setActive] = useState(mockWorkspaces[0])
  const [showDropdown, setShowDropdown] = useState(false)

  if (!expanded) {
    return (
      <div className="flex justify-center px-1 py-1">
        <div className="w-8 h-8 rounded-md bg-[var(--sidebar-accent)] flex items-center justify-center text-sm">
          {active.icon}
        </div>
      </div>
    )
  }

  return (
    <div className="relative px-1">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--sidebar-accent)] transition-colors"
      >
        <span className="text-sm">{active.icon}</span>
        <span className="flex-1 text-left text-sm font-medium text-[var(--sidebar-foreground)] truncate">{active.name}</span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-[var(--sidebar-foreground)]/50 shrink-0" />
      </button>
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border bg-[var(--popover)] text-[var(--popover-foreground)] shadow-lg p-1">
          {mockWorkspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => { setActive(ws); setShowDropdown(false) }}
              className={cn(
                'w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-[var(--accent)] transition-colors',
              )}
            >
              <span>{ws.icon}</span>
              <span className="flex-1 text-left">{ws.name}</span>
              {ws.id === active.id && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
          <div className="h-px bg-[var(--border)] my-1" />
          <button className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-[var(--accent)] transition-colors text-[var(--muted-foreground)]">
            <Plus className="w-3.5 h-3.5" />
            <span>Workspace hinzufügen</span>
          </button>
        </div>
      )}
    </div>
  )
}
