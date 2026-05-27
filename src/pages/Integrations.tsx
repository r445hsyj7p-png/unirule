import { useState } from 'react'
import {
  Plug, RefreshCw, CheckCircle, XCircle, Clock,
  ExternalLink, ChevronDown, ChevronUp, Eye, EyeOff,
  Wifi, Activity, Shield, GitBranch, BarChart2, Terminal, Network,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { timeAgo } from '@/lib/utils'
import { api } from '@/lib/api'
import { useConnectionStore } from '@/lib/store'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UnifiConfig {
  url: string
  username: string
  password: string
  site: string
  sslVerify: boolean
  port: string
}

interface PollerConfig {
  controllerUrl: string
  username: string
  password: string
  pollerInterval: string
  influxUrl: string
  prometheusPort: string
}

// ── Status badge ──────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  connected: { label: 'Verbunden',  color: 'text-green-500 border-green-500/20 bg-green-500/10', icon: CheckCircle },
  error:     { label: 'Fehler',     color: 'text-red-500 border-red-500/20 bg-red-500/10',       icon: XCircle    },
  idle:      { label: 'Bereit',     color: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10', icon: Clock  },
  testing:   { label: 'Teste…',     color: 'text-blue-500 border-blue-500/20 bg-blue-500/10',    icon: RefreshCw  },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.idle
  const Icon = cfg.icon
  return (
    <Badge className={`text-[10px] border ${cfg.color} gap-1`}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </Badge>
  )
}

// ── Password field ────────────────────────────────────────────────────────────

function PasswordInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••'}
        className="h-8 text-sm pr-9"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

// ── UniFi Controller section ──────────────────────────────────────────────────

function UnifiControllerSection() {
  const [cfg, setCfg] = useState<UnifiConfig>({
    url: 'https://192.168.1.1',
    username: 'admin',
    password: '',
    site: 'default',
    sslVerify: false,
    port: '443',
  })
  const [status, setStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle')
  const [testLog, setTestLog] = useState<string[]>([])
  const [expanded, setExpanded] = useState(true)
  const setConnected = useConnectionStore(s => s.setConnected)

  function set(k: keyof UnifiConfig, v: string | boolean) {
    setCfg(prev => ({ ...prev, [k]: v }))
  }

  function buildPayload() {
    // Fix 5: merge the separate port field into the URL so users who set
    // port=8443 for a classic controller actually connect to the right port.
    let url = cfg.url.trim().replace(/\/$/, '')
    if (cfg.port) {
      try {
        const u = new URL(url)
        if (!u.port) u.port = cfg.port
        url = u.origin  // scheme + host + port, no trailing slash
      } catch { /* invalid URL — leave as-is, server will report the error */ }
    }
    return {
      url,
      username: cfg.username,
      password: cfg.password,
      site: cfg.site,
      verifySsl: cfg.sslVerify,
    }
  }

  async function testConnection() {
    setStatus('testing')
    setTestLog(['Verbindung wird hergestellt…'])
    setTestLog(l => [...l, `→ Teste Verbindung zu ${cfg.url} …`])
    try {
      const result = await api.testConfig(buildPayload())
      if (result.ok) {
        setTestLog(l => [...l,
          `→ Login als '${cfg.username}' auf Site '${result.siteName ?? cfg.site}'…`,
          '✓ Authentifizierung erfolgreich',
          result.version ? `✓ Controller-Version: ${result.version}` : '✓ Verbindung hergestellt',
        ])
        setStatus('connected')
      } else {
        setTestLog(l => [...l, '✗ Fehler: Controller hat Verbindung abgelehnt'])
        setStatus('error')
      }
    } catch (err) {
      setTestLog(l => [...l, `✗ Fehler: ${err instanceof Error ? err.message : String(err)}`])
      setStatus('error')
    }
  }

  async function saveConnection() {
    setStatus('testing')
    setTestLog(['Speichere Konfiguration…'])
    try {
      const result = await api.saveConfig(buildPayload())
      if (result.ok) {
        const site = result.site ?? cfg.site
        setConnected(cfg.url, cfg.username, site)
        setTestLog(l => [...l, '✓ Konfiguration gespeichert', '✓ Verbunden'])
        setStatus('connected')
      } else {
        setTestLog(l => [...l, '✗ Fehler: Konnte Konfiguration nicht speichern'])
        setStatus('error')
      }
    } catch (err) {
      setTestLog(l => [...l, `✗ Fehler: ${err instanceof Error ? err.message : String(err)}`])
      setStatus('error')
    }
  }

  return (
    <Card className={status === 'connected' ? 'border-green-500/30' : status === 'error' ? 'border-red-500/30' : ''}>
      <CardHeader
        className="pb-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-2xl">🔒</div>
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                UniFi Controller / UDM
                <StatusBadge status={status} />
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Direkte REST-API-Anbindung (Port 443 / 8443)
              </CardDescription>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Hinweis: API-Keys nicht unterstützt */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
            <div className="font-medium text-amber-600 dark:text-amber-400">Lokaler Admin erforderlich</div>
            <p className="text-muted-foreground">
              Bitte einen <strong>lokalen Admin-Account</strong> anlegen (in der UniFi-App unter
              Admins &amp; Users → Lokaler Zugang), nicht den UI.com-SSO-Account verwenden.
              API-Keys unterstützen nur die offizielle Integration-API
              (<code className="text-[10px]">/proxy/network/integration/v1/</code>),
              die weder Events, Firewall-Regeln noch Write-Zugriff abdeckt.
            </p>
          </div>

          {/* API-Endpunkte nach Controller-Typ */}
          <div className="rounded-lg bg-muted/40 border p-3 text-xs space-y-2">
            <div className="font-semibold text-muted-foreground uppercase text-[10px]">API-Pfade je nach Controller-Typ</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="text-[10px] font-medium text-muted-foreground">UniFi OS (UDM, UCG-Ultra, CK Gen2+)</div>
              <div className="text-[10px] font-medium text-muted-foreground">Classic (self-hosted, Port 8443)</div>
              <div className="font-mono text-muted-foreground col-span-1 space-y-0.5">
                <div><span className="text-blue-400">POST</span> /api/auth/login</div>
                <div><span className="text-green-400">GET</span>  /proxy/network/api/s/<span className="text-yellow-400">{'{site}'}</span>/stat/sta</div>
                <div><span className="text-green-400">GET</span>  /proxy/network/api/s/<span className="text-yellow-400">{'{site}'}</span>/stat/device</div>
                <div><span className="text-green-400">GET</span>  /proxy/network/api/s/<span className="text-yellow-400">{'{site}'}</span>/stat/event</div>
                <div><span className="text-green-400">GET</span>  /proxy/network/api/s/<span className="text-yellow-400">{'{site}'}</span>/rest/firewallrule</div>
              </div>
              <div className="font-mono text-muted-foreground col-span-1 space-y-0.5">
                <div><span className="text-blue-400">POST</span> /api/login</div>
                <div><span className="text-green-400">GET</span>  /api/s/<span className="text-yellow-400">{'{site}'}</span>/stat/sta</div>
                <div><span className="text-green-400">GET</span>  /api/s/<span className="text-yellow-400">{'{site}'}</span>/stat/device</div>
                <div><span className="text-green-400">GET</span>  /api/s/<span className="text-yellow-400">{'{site}'}</span>/stat/event</div>
                <div><span className="text-green-400">GET</span>  /api/s/<span className="text-yellow-400">{'{site}'}</span>/rest/firewallrule</div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              Der Controller-Typ wird beim Verbindungstest automatisch erkannt — der Verbindungstest zeigt <em>UniFi OS</em> oder <em>Classic</em>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-muted-foreground mb-1 block">Controller URL</label>
              <Input value={cfg.url} onChange={e => set('url', e.target.value)} className="h-8 text-sm" placeholder="https://192.168.1.1" />
              <p className="text-[10px] text-muted-foreground mt-1">UDM: Port 443 · Classic: Port 8443</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Port</label>
              <Input value={cfg.port} onChange={e => set('port', e.target.value)} className="h-8 text-sm w-24" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Benutzername</label>
              <Input value={cfg.username} onChange={e => set('username', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Passwort</label>
              <PasswordInput value={cfg.password} onChange={v => set('password', v)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Site-Name</label>
              <Input value={cfg.site} onChange={e => set('site', e.target.value)} className="h-8 text-sm" placeholder="default" />
              <p className="text-[10px] text-muted-foreground mt-1">Findet sich in der Controller-URL</p>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <div
                onClick={() => set('sslVerify', !cfg.sslVerify)}
                className={`w-9 h-5 rounded-full cursor-pointer flex items-center px-0.5 transition-colors ${cfg.sslVerify ? 'bg-green-500 justify-end' : 'bg-muted justify-start'}`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow" />
              </div>
              <span className="text-xs">SSL-Zertifikat prüfen</span>
            </div>
          </div>

          {/* Test log */}
          {testLog.length > 0 && (
            <div className="rounded-md bg-muted/40 border p-3 font-mono text-[11px] space-y-0.5">
              {testLog.map((l, i) => (
                <div key={i} className={
                  l.startsWith('✓') ? 'text-green-400' :
                  l.startsWith('✗') ? 'text-red-400' : 'text-muted-foreground'
                }>{l}</div>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={testConnection} disabled={status === 'testing'}>
              {status === 'testing' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              Verbindung testen
            </Button>
            <Button size="sm" variant="outline" onClick={saveConnection} disabled={status === 'testing'}>
              <CheckCircle className="h-4 w-4" />
              Verbinden &amp; Speichern
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href="https://ubntwiki.com/products/software/unifi-controller/api" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />API-Docs
              </a>
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ── UniFi Poller section ──────────────────────────────────────────────────────

function UnifiPollerSection() {
  const [cfg, setCfg] = useState<PollerConfig>({
    controllerUrl: 'https://192.168.1.1',
    username: 'unifipoller',
    password: '',
    pollerInterval: '30',
    influxUrl: 'http://influxdb:8086',
    prometheusPort: '9130',
  })
  const [mode, setMode] = useState<'influx' | 'prometheus'>('prometheus')
  const [expanded, setExpanded] = useState(false)

  function set(k: keyof PollerConfig, v: string) {
    setCfg(prev => ({ ...prev, [k]: v }))
  }

  const dockerCmd = mode === 'prometheus'
    ? `docker run -d \\
  -e UP_UNIFI_DEFAULT_URL=${cfg.controllerUrl} \\
  -e UP_UNIFI_DEFAULT_USER=${cfg.username} \\
  -e UP_UNIFI_DEFAULT_PASS=SECRET \\
  -e UP_PROMETHEUS_DISABLE=false \\
  -e UP_INFLUXDB_DISABLE=true \\
  -p ${cfg.prometheusPort}:9130 \\
  ghcr.io/unifi-poller/unifi-poller:latest`
    : `docker run -d \\
  -e UP_UNIFI_DEFAULT_URL=${cfg.controllerUrl} \\
  -e UP_UNIFI_DEFAULT_USER=${cfg.username} \\
  -e UP_UNIFI_DEFAULT_PASS=SECRET \\
  -e UP_INFLUXDB_URL=${cfg.influxUrl} \\
  -e UP_INFLUXDB_DB=unifi \\
  -e UP_PROMETHEUS_DISABLE=true \\
  ghcr.io/unifi-poller/unifi-poller:latest`

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-2xl">📡</div>
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                UniFi Poller
                <StatusBadge status="connected" />
                <Badge variant="outline" className="text-[9px]">v2.0.7</Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Metriken-Sammler → Prometheus / InfluxDB
              </CardDescription>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Controller URL</label>
              <Input value={cfg.controllerUrl} onChange={e => set('controllerUrl', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Read-Only User</label>
              <Input value={cfg.username} onChange={e => set('username', e.target.value)} className="h-8 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Empfohlen: dedizierten Read-Only-User anlegen</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Passwort</label>
              <PasswordInput value={cfg.password} onChange={v => set('password', v)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Poll-Intervall (Sek.)</label>
              <Input value={cfg.pollerInterval} onChange={e => set('pollerInterval', e.target.value)} className="h-8 text-sm w-24" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Ausgabe-Backend</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('prometheus')}
                className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${mode === 'prometheus' ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-border text-muted-foreground'}`}
              >
                Prometheus
              </button>
              <button
                onClick={() => setMode('influx')}
                className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${mode === 'influx' ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-border text-muted-foreground'}`}
              >
                InfluxDB
              </button>
            </div>
          </div>

          {mode === 'prometheus' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Prometheus-Port</label>
              <Input value={cfg.prometheusPort} onChange={e => set('prometheusPort', e.target.value)} className="h-8 text-sm w-24" />
            </div>
          )}
          {mode === 'influx' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">InfluxDB URL</label>
              <Input value={cfg.influxUrl} onChange={e => set('influxUrl', e.target.value)} className="h-8 text-sm" />
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Docker-Befehl (generiert)</label>
            <pre className="bg-muted/50 border rounded-md p-3 text-[11px] font-mono whitespace-pre-wrap break-all">{dockerCmd}</pre>
          </div>
          <Button size="sm" variant="outline">
            <ExternalLink className="h-4 w-4" />
            <a href="https://github.com/unifi-poller/unifi-poller" target="_blank" rel="noreferrer">GitHub Docs</a>
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

// ── Syslog receiver section ───────────────────────────────────────────────────

function SyslogSection() {
  const [port, setPort] = useState('514')
  const [proto, setProto] = useState('udp')
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-2xl">📋</div>
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                Syslog-Empfänger (Remote Logging)
                <StatusBadge status="idle" />
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                UniFi sendet Logs direkt an Unirule
              </CardDescription>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs">
            <div className="font-semibold text-blue-400 mb-2">UniFi Controller einrichten</div>
            <div className="text-muted-foreground space-y-1">
              <div>1. UniFi Controller → <strong>Settings → System → Logging</strong></div>
              <div>2. <strong>Remote Logging</strong> aktivieren</div>
              <div>3. Server-IP: <code className="bg-muted px-1 rounded">IP-DIESES-SERVERS</code>, Port: <code className="bg-muted px-1 rounded">{port}</code></div>
              <div>4. Protokoll: <code className="bg-muted px-1 rounded">{proto.toUpperCase()}</code></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Lausch-Port</label>
              <Input value={port} onChange={e => setPort(e.target.value)} className="h-8 text-sm w-24" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Protokoll</label>
              <Select value={proto} onValueChange={setProto}>
                <SelectTrigger className="h-8 text-sm w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="udp">UDP (Standard)</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">rsyslog-Konfiguration (Server-seitig)</label>
            <pre className="bg-muted/50 border rounded-md p-3 text-[11px] font-mono whitespace-pre-wrap">{`# /etc/rsyslog.d/unirule.conf
module(load="im${proto}") 
input(type="im${proto}" port="${port}")

# UniFi Logs in Datei schreiben
if $fromhost-ip startswith "192.168.1." then {
  action(type="omfile" file="/var/log/unifi/unifi.log")
}`}</pre>
          </div>
          <Button size="sm">
            <Activity className="h-4 w-4" />
            Empfänger starten
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

// ── Other tools static data ───────────────────────────────────────────────────

interface OtherIntegration {
  id: string
  name: string
  description: string
  status: 'idle' | 'connected' | 'error'
  lastSync: string | null
  icon: React.ElementType
  docsUrl: string
  tags: string[]
}

const OTHER_INTEGRATIONS: OtherIntegration[] = [
  {
    id: 'unifi-poller',
    name: 'UniFi Poller',
    description: 'Metriken-Export via Prometheus / InfluxDB',
    status: 'idle',
    lastSync: null,
    icon: BarChart2,
    docsUrl: 'https://github.com/unpoller/unpoller',
    tags: ['metrics', 'prometheus', 'influxdb'],
  },
  {
    id: 'batfish',
    name: 'Batfish',
    description: 'Netzwerk-Konfigurationsanalyse & Verifikation',
    status: 'idle',
    lastSync: null,
    icon: GitBranch,
    docsUrl: 'https://batfish.org',
    tags: ['analysis', 'config'],
  },
  {
    id: 'ntopng',
    name: 'ntopng',
    description: 'Traffic-Analyse und Flow-Monitoring',
    status: 'idle',
    lastSync: null,
    icon: Activity,
    docsUrl: 'https://www.ntop.org',
    tags: ['traffic', 'flows'],
  },
  {
    id: 'graphviz',
    name: 'Graphviz',
    description: 'Netzwerktopologie-Visualisierung',
    status: 'idle',
    lastSync: null,
    icon: Network,
    docsUrl: 'https://graphviz.org',
    tags: ['visualization'],
  },
  {
    id: 'pyunifi',
    name: 'pyunifi',
    description: 'Python-Bibliothek für UniFi Controller API',
    status: 'idle',
    lastSync: null,
    icon: Terminal,
    docsUrl: 'https://github.com/finish06/pyunifi',
    tags: ['python', 'api'],
  },
]

// ── Other tools compact card ──────────────────────────────────────────────────

function OtherToolCard({ integration }: { integration: OtherIntegration }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = integration.icon

  return (
    <Card className="border-dashed opacity-80">
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><Icon className="h-5 w-5 text-muted-foreground" /></div>
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                {integration.name}
                <Badge variant="outline" className="text-[9px] border gap-1">
                  Coming Soon
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">{integration.description}</CardDescription>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Die Integration mit <strong>{integration.name}</strong> ist für eine spätere Phase geplant.
            Dokumentation und Setup-Anleitung werden mit der Implementierung bereitgestellt.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" asChild className="h-7 text-xs">
              <a href={integration.docsUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3 w-3" />Projektseite
              </a>
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const otherTools = OTHER_INTEGRATIONS.filter(i =>
  !['unifi', 'unifi-controller'].includes(i.id)
)

export default function Integrations() {
  const connected = OTHER_INTEGRATIONS.filter(i => i.status === 'connected').length
  const errors = OTHER_INTEGRATIONS.filter(i => i.status === 'error').length

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrationen & Datenquellen</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            API-Anbindung, Log-Import und Open-Source-Tools
          </p>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div><div className="text-xl font-bold text-green-500">{connected}</div><div className="text-xs text-muted-foreground">Verbunden</div></div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <div><div className="text-xl font-bold text-red-500">{errors}</div><div className="text-xs text-muted-foreground">Fehler</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Plug className="h-6 w-6 text-muted-foreground" />
            <div><div className="text-xl font-bold">{OTHER_INTEGRATIONS.length + 1}</div><div className="text-xs text-muted-foreground">Gesamt</div></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="api">
        <TabsList>
          <TabsTrigger value="api"><Wifi className="h-3.5 w-3.5 mr-1.5" />API-Verbindungen</TabsTrigger>
          <TabsTrigger value="syslog"><Terminal className="h-3.5 w-3.5 mr-1.5" />Syslog / Remote</TabsTrigger>
          <TabsTrigger value="tools"><GitBranch className="h-3.5 w-3.5 mr-1.5" />Open-Source-Tools</TabsTrigger>
          <TabsTrigger value="flow"><BarChart2 className="h-3.5 w-3.5 mr-1.5" />Datenfluss</TabsTrigger>
        </TabsList>

        {/* API Tab */}
        <TabsContent value="api" className="mt-4 space-y-4">
          <div className="rounded-lg bg-muted/30 border-dashed border p-3 text-xs text-muted-foreground">
            <Shield className="inline h-3.5 w-3.5 mr-1.5 text-yellow-500" />
            Empfehlung: Leg für Unirule einen <strong>dedizierten Read-Only-API-Benutzer</strong> im UniFi Controller an
            (Settings → Admins → + → Role: &quot;Read Only&quot;). Verwende niemals den Admin-Account.
          </div>
          <UnifiControllerSection />
          <UnifiPollerSection />
        </TabsContent>

        {/* Syslog Tab */}
        <TabsContent value="syslog" className="mt-4 space-y-4">
          <SyslogSection />
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="text-sm font-medium mb-2">Log-Datei importieren</div>
              <p className="text-xs text-muted-foreground mb-3">
                Hast du bereits eine UniFi-Log-Datei? Importiere sie direkt im <strong>Log Explorer</strong>.
                Unterstützt: Syslog (.log/.txt), JSON-Event-Export, CSV.
              </p>
              <Button size="sm" variant="outline" asChild>
                <a href="/logs">→ Zum Log Explorer</a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="mt-4 space-y-4">
          {otherTools.map(tool => (
            <OtherToolCard key={tool.id} integration={tool} />
          ))}
        </TabsContent>

        {/* Dataflow Tab */}
        <TabsContent value="flow" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Datenfluss-Architektur</CardTitle>
              <CardDescription className="text-xs">Wie alle Quellen Unirule versorgen</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="font-mono text-xs text-muted-foreground leading-loose whitespace-pre-wrap bg-muted/30 rounded-lg p-4">{`
┌─────────────────────────────────────────────────────────────────┐
│  DATENQUELLEN                                                    │
├──────────────────────┬──────────────────────────────────────────┤
│  UniFi Controller    │  → REST-API → Geräte, Clients,           │
│  (direkte Anbindung) │            Firewall-Regeln, VLANs         │
│                      │                                          │
│  UniFi Poller        │  → Prometheus/InfluxDB → Metriken,       │
│                      │    Traffic, AP-Stats, Switch-Ports        │
│                      │                                          │
│  Remote Syslog       │  → UDP/TCP 514 → Firewall-Logs,          │
│  (Push vom UniFi)    │    DHCP-Events, IDS-Meldungen            │
│                      │                                          │
│  Log-Import (manuell)│  → Upload: Syslog / JSON / CSV           │
│                      │                                          │
│  ntopng              │  → Traffic-Anomalien, DNS, Flows         │
│  Batfish             │  → Konfigurationsanalyse, Erreichbarkeit  │
│  Graphviz            │  → Topologie-SVG                         │
└──────────────────────┴──────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│  UNIRULE ENGINE                                                  │
│  • Normalisierung & Korrelation aller Quellen                   │
│  • Bedrohungserkennung (Anomalie + Signaturen)                  │
│  • Zero-Trust-Scoring (Batfish + Policy Engine)                 │
│  • Policy-Vorschläge (ML + Regelwerk)                           │
└─────────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│  UNIRULE UI                                                      │
│  Dashboard · Netzwerkkarte · Threats · Policies · Log Explorer  │
└─────────────────────────────────────────────────────────────────┘
`}</pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
