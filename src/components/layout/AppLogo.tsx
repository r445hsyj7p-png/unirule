import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/ui/sidebar'

export function AppLogo({ type = 'large' }: { type?: 'large' | 'small' }) {
  const { open, isMobile } = useSidebar()
  const expanded = isMobile || open

  if (type === 'small' || !expanded) {
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-foreground">
        <Shield className="w-5 h-5 text-background" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-foreground shrink-0">
        <Shield className="w-4.5 h-4.5 text-background" />
      </div>
      <div>
        <div className="font-bold text-base leading-none tracking-tight text-[var(--sidebar-foreground)]">Unirule</div>
        <div className="text-[10px] text-[var(--sidebar-foreground)]/50 leading-none mt-0.5">Security Platform</div>
      </div>
    </div>
  )
}
