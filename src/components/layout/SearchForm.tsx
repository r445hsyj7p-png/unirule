import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

const searchIndex = [
  { label: 'Dashboard',           route: '/',             keywords: ['dashboard', 'übersicht', 'kpi', 'score'] },
  { label: 'Netzwerkkarte',       route: '/network-map',  keywords: ['netzwerk', 'topologie', 'map', 'karte', 'switch', 'ap'] },
  { label: 'Threats & Alerts',    route: '/threats',      keywords: ['threat', 'alert', 'bedrohung', 'angriff', 'cve', 'kritisch'] },
  { label: 'Policy Engine',       route: '/policies',     keywords: ['policy', 'zero trust', 'empfehlung', 'regel'] },
  { label: 'Firewall-Regeln',     route: '/rules',        keywords: ['firewall', 'regel', 'allow', 'deny', 'block'] },
  { label: 'Geräte',              route: '/devices',      keywords: ['gerät', 'device', 'ip', 'mac', 'host', 'client'] },
  { label: 'Zonen & Segmente',    route: '/zones',        keywords: ['zone', 'vlan', 'segment', 'cidr', 'subnetz'] },
  { label: 'Log Explorer',        route: '/logs',         keywords: ['log', 'syslog', 'event', 'import', 'raw'] },
  { label: 'Integrationen',       route: '/integrations', keywords: ['integration', 'api', 'unifi', 'poller', 'batfish', 'ntopng'] },
  { label: 'Einstellungen',       route: '/settings',     keywords: ['setting', 'einstellung', 'konfiguration', 'config'] },
]

export function SearchForm() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const results = value.trim().length > 1
    ? searchIndex.filter(item =>
        item.label.toLowerCase().includes(value.toLowerCase()) ||
        item.keywords.some(k => k.includes(value.toLowerCase()))
      )
    : []

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function go(route: string) {
    navigate(route)
    setValue('')
    setOpen(false)
  }

  return (
    <div className="relative w-full max-w-md" ref={ref}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        placeholder="Suche Seiten, Geräte, Policies…"
        value={value}
        onChange={e => { setValue(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="pl-9 bg-muted/50 border-transparent focus:border-input h-8 text-sm"
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Enter' && results.length > 0) go(results[0].route)
        }}
      />
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-md border bg-popover text-popover-foreground shadow-lg p-1">
          {results.map(r => (
            <button
              key={r.route}
              onClick={() => go(r.route)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors text-left"
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
