import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PanelLeft } from 'lucide-react'

type SidebarContextType = {
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
}

const SidebarContext = React.createContext<SidebarContextType>({
  open: true,
  setOpen: () => {},
  openMobile: false,
  setOpenMobile: () => {},
  isMobile: false,
})

export function useSidebar() {
  return React.useContext(SidebarContext)
}

export function SidebarProvider({ children, defaultOpen = true }: { children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [openMobile, setOpenMobile] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <SidebarContext.Provider value={{ open, setOpen, openMobile, setOpenMobile, isMobile }}>
      <div className="flex min-h-screen w-full">
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

export function Sidebar({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open, openMobile, isMobile } = useSidebar()
  const isVisible = isMobile ? openMobile : open

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && openMobile && (
        <MobileOverlay />
      )}
      <aside
        className={cn(
          'flex flex-col border-r transition-all duration-300 shrink-0',
          'bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)]',
          isMobile
            ? cn('fixed inset-y-0 left-0 z-50 w-64', openMobile ? 'translate-x-0' : '-translate-x-full')
            : isVisible ? 'w-64' : 'w-14',
          className
        )}
      >
        {children}
      </aside>
    </>
  )
}

function MobileOverlay() {
  const { setOpenMobile } = useSidebar()
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 md:hidden"
      onClick={() => setOpenMobile(false)}
    />
  )
}

export function SidebarInset({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-1 flex-col min-w-0 overflow-hidden', className)}>
      {children}
    </div>
  )
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { open, setOpen, isMobile, setOpenMobile } = useSidebar()
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', className)}
      onClick={() => isMobile ? setOpenMobile(true) : setOpen(!open)}
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  )
}

export function SidebarRail() {
  const { setOpen, open, isMobile } = useSidebar()
  if (isMobile) return null
  return (
    <button
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 hover:opacity-100 hover:bg-sidebar-border transition-opacity"
      onClick={() => setOpen(!open)}
      aria-label="Toggle sidebar"
    />
  )
}

export function SidebarHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-2 p-2', className)}>{children}</div>
}

export function SidebarFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-auto flex flex-col gap-2 p-2', className)}>{children}</div>
}

export function SidebarContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-1 flex-col gap-2 overflow-y-auto p-2', className)}>{children}</div>
}

export function SidebarGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-1', className)}>{children}</div>
}

export function SidebarGroupLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open, isMobile } = useSidebar()
  const expanded = isMobile || open
  if (!expanded) return null
  return (
    <div className={cn('px-2 py-1 text-xs font-bold text-[var(--sidebar-foreground)]/60 uppercase tracking-wider', className)}>
      {children}
    </div>
  )
}

export function SidebarGroupContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-0.5', className)}>{children}</div>
}

export function SidebarMenu({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn('flex flex-col gap-0.5', className)}>{children}</ul>
}

export function SidebarMenuItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <li className={cn('', className)}>{children}</li>
}

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean
  tooltip?: string
  asChild?: boolean
}

export function SidebarMenuButton({ children, isActive, className, asChild: _asChild, ...props }: SidebarMenuButtonProps) {
  const { open, isMobile } = useSidebar()
  const expanded = isMobile || open

  return (
    <button
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
        'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]',
        isActive && 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] font-medium',
        !expanded && 'justify-center px-2',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SidebarSeparator({ className }: { className?: string }) {
  return <div className={cn('mx-2 my-1 h-px bg-[var(--sidebar-border)]', className)} />
}
