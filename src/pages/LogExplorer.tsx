import { useState, useRef, useCallback } from 'react'
import {
  Search, RefreshCw, Download, Terminal, Upload,
  FileUp, CheckCircle, AlertTriangle, X, Info
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useEvents } from '@/hooks/useUnifi'
import { useConnectionStore } from '@/lib/store'
import { UnifiLogRow } from '@/lib/api'
import { DataState } from '@/components/ui/empty-state'

const levelColors: Record<string, string> = {
  critical: 'text-red-500 bg-red-500/10 border-red-500/20',
  error:    'text-orange-500 bg-orange-500/10 border-orange-500/20',
  warning:  'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  info:     'text-blue-500 bg-blue-500/10 border-blue-500/20',
}

// ── UniFi log parsers ─────────────────────────────────────────────────────────

interface ParsedLog {
  id: string
  timestamp: Date
  level: string
  source: string
  message: string
  zone: string
  device: string
  raw: string
}

/** Detect UniFi syslog format: "<PRI>Month Day HH:MM:SS hostname process: msg" */
function parseSyslog(text: string): ParsedLog[] {
  const lines = text.split('\n').filter(l => l.trim())
  const result: ParsedLog[] = []
  const syslogRe = /^(?:<\d+>)?(\w+\s+\d+\s+[\d:]+)\s+(\S+)\s+(\S+):\s+(.+)$/
  const year = new Date().getFullYear()

  lines.forEach((line, i) => {
    const m = line.match(syslogRe)
    if (!m) {
      // fall back: treat whole line as info message
      result.push({
        id: `imp-${i}`,
        timestamp: new Date(),
        level: 'info',
        source: 'import',
        message: line.trim(),
        zone: 'Unbekannt',
        device: 'import',
        raw: line,
      })
      return
    }
    const [, dateStr, hostname, process_, msg] = m
    const ts = new Date(`${dateStr} ${year}`)

    // severity from syslog priority or keywords
    let level = 'info'
    if (/block|deny|drop|CRIT|emerg|alert/i.test(msg)) level = 'critical'
    else if (/warn|notice/i.test(msg)) level = 'warning'
    else if (/err|error/i.test(msg)) level = 'error'

    // detect zone from subnet patterns
    let zone = 'Unbekannt'
    if (/192\.168\.30\./i.test(msg)) zone = 'IoT Segment'
    else if (/10\.0\.10\./i.test(msg)) zone = 'Corp LAN'
    else if (/10\.0\.20\./i.test(msg)) zone = 'DMZ'
    else if (/10\.0\.50\./i.test(msg)) zone = 'Management'
    else if (/172\.16\./i.test(msg)) zone = 'Guest WLAN'

    result.push({
      id: `imp-${i}`,
      timestamp: isNaN(ts.getTime()) ? new Date() : ts,
      level,
      source: process_.replace(/\[\d+\]$/, ''),
      message: msg.trim(),
      zone,
      device: hostname,
      raw: line,
    })
  })
  return result
}

/** UniFi JSON log export (array of objects) */
function parseJsonLogs(text: string): ParsedLog[] {
  try {
    const data = JSON.parse(text)
    const arr = Array.isArray(data) ? data : data.logs ?? data.events ?? []
    return arr.map((e: Record<string, unknown>, i: number) => ({
      id: `jimp-${i}`,
      timestamp: new Date((e.timestamp ?? e.time ?? e.ts ?? '') as string),
      level: ((e.level ?? e.severity ?? e.type ?? 'info') as string).toLowerCase(),
      source: ((e.source ?? e.subsystem ?? e.process ?? 'unifi') as string),
      message: ((e.message ?? e.msg ?? e.description ?? JSON.stringify(e)) as string),
      zone: ((e.network ?? e.vlan ?? e.zone ?? 'Unbekannt') as string),
      device: ((e.device ?? e.hostname ?? e.host ?? 'unknown') as string),
      raw: JSON.stringify(e),
    }))
  } catch {
    return []
  }
}

/** CSV: timestamp,level,source,device,zone,message */
function parseCsvLogs(text: string): ParsedLog[] {
  const lines = text.split('\n').filter(l => l.trim())
  const header = lines[0].toLowerCase().split(/[,;]/)
  return lines.slice(1).map((line, i) => {
    const cols = line.split(/[,;]/)
    const get = (keys: string[]) => {
      for (const k of keys) {
        const idx = header.indexOf(k)
        if (idx >= 0 && cols[idx]) return cols[idx].replace(/^"|"$/g, '')
      }
      return ''
    }
    return {
      id: `cimp-${i}`,
      timestamp: new Date(get(['timestamp', 'time', 'date']) || Date.now()),
      level: get(['level', 'severity', 'type']) || 'info',
      source: get(['source', 'process', 'subsystem']) || 'import',
      message: get(['message', 'msg', 'description']) || line,
      zone: get(['zone', 'network', 'vlan']) || 'Unbekannt',
      device: get(['device', 'hostname', 'host']) || 'unknown',
      raw: line,
    }
  })
}

function detectAndParse(content: string, filename: string): ParsedLog[] {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'json') return parseJsonLogs(content)
  if (ext === 'csv') return parseCsvLogs(content)
  // Try JSON first, then syslog
  try {
    const j = parseJsonLogs(content)
    if (j.length > 0) return j
  } catch { /* fall through */ }
  return parseSyslog(content)
}

// ── Import Dialog ─────────────────────────────────────────────────────────────

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  onImport: (logs: ParsedLog[], filename: string) => void
}

function ImportDialog({ open, onClose, onImport }: ImportDialogProps) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ParsedLog[]>([])
  const [error, setError] = useState('')
  const [pasteText, setPasteText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setFile(null); setPreview([]); setError(''); setPasteText('')
  }

  async function processFile(f: File) {
    setFile(f); setError('')
    const text = await f.text()
    const parsed = detectAndParse(text, f.name)
    if (parsed.length === 0) {
      setError('Konnte keine Logs parsen. Bitte prüfe das Format (Syslog, JSON, CSV).')
    } else {
      setPreview(parsed)
    }
  }

  function processPaste() {
    if (!pasteText.trim()) return
    const parsed = parseSyslog(pasteText)
    if (parsed.length > 0) setPreview(parsed)
    else setError('Kein bekanntes Format erkannt.')
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }, [])

  function doImport() {
    onImport(preview, file?.name ?? 'paste')
    onClose(); reset()
  }

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); reset() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>UniFi Logs importieren</DialogTitle>
          <DialogDescription>
            Unterstützte Formate: <strong>Syslog</strong> (.log / .txt),{' '}
            <strong>JSON</strong> (UniFi Event-Export), <strong>CSV</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file">
          <TabsList className="mb-4">
            <TabsTrigger value="file">Datei-Upload</TabsTrigger>
            <TabsTrigger value="paste">Einfügen / Syslog</TabsTrigger>
            <TabsTrigger value="hints">Formate & Tipps</TabsTrigger>
          </TabsList>

          {/* File upload tab */}
          <TabsContent value="file">
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragging ? 'border-blue-500 bg-blue-500/10' : 'border-border hover:border-foreground/30'
              }`}
            >
              <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Datei hierher ziehen oder klicken</p>
              <p className="text-xs text-muted-foreground mt-1">.log · .txt · .json · .csv — max. 50 MB</p>
              <input
                ref={inputRef}
                type="file"
                accept=".log,.txt,.json,.csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
              />
            </div>
            {file && !error && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                <span>{file.name} · {preview.length} Einträge erkannt</span>
                <button onClick={reset} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </TabsContent>

          {/* Paste tab */}
          <TabsContent value="paste">
            <textarea
              className="w-full h-40 rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={'<134>May 26 08:15:32 UDM-Pro kernel: [WAN_IN-4001-D] IN=eth8 SRC=185.220.101.47 DST=203.0.113.5 PROTO=TCP DPT=22\n<30>May 26 08:15:45 UDM-Pro hotplug: new device 00:1A:2B:3C seen on VLAN 30\n...'}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
            />
            <Button size="sm" className="mt-2" onClick={processPaste} disabled={!pasteText.trim()}>
              Parsen
            </Button>
            {preview.length > 0 && (
              <p className="text-xs text-green-500 mt-1">{preview.length} Einträge erkannt</p>
            )}
          </TabsContent>

          {/* Hints tab */}
          <TabsContent value="hints">
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="font-semibold flex items-center gap-2"><Info className="h-4 w-4 text-blue-500" />UniFi Controller → System Log Export</div>
                <p className="text-xs text-muted-foreground">Settings → System → Support → <strong>Download System Log</strong> → ergibt <code>.tar.gz</code> mit <code>messages</code>-Syslog-Datei (entpacken, dann hochladen)</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="font-semibold flex items-center gap-2"><Info className="h-4 w-4 text-yellow-500" />UniFi Firewall Logs via Syslog-Server</div>
                <p className="text-xs text-muted-foreground">Settings → System → <strong>Remote Logging</strong> → Syslog-Server-IP eintragen → empfängt Echtzeit-Firewall-Events im RFC 3164-Format</p>
                <code className="block text-[11px] bg-muted rounded p-2">rsyslog: $template UniFi,"%TIMESTAMP% %HOSTNAME% %syslogtag%%msg%\n"</code>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="font-semibold flex items-center gap-2"><Info className="h-4 w-4 text-green-500" />JSON-Export via UniFi API</div>
                <code className="block text-[11px] bg-muted rounded p-2 break-all">GET https://CONTROLLER:8443/api/s/default/stat/event?_limit=3000</code>
                <p className="text-xs text-muted-foreground">Gibt JSON-Array zurück → direkt als <code>.json</code> speichern und importieren</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-md p-2 mt-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
              <span>Vorschau (erste 5 Einträge)</span>
              <span className="font-medium text-foreground">{preview.length} Einträge gesamt</span>
            </div>
            <div className="rounded-md border bg-muted/30 divide-y divide-border">
              {preview.slice(0, 5).map(log => (
                <div key={log.id} className="px-3 py-2 text-xs font-mono">
                  <span className={`mr-2 font-bold ${levelColors[log.level]?.split(' ')[0] ?? 'text-gray-400'}`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="text-muted-foreground">{log.source} · </span>
                  {log.message.slice(0, 80)}{log.message.length > 80 ? '…' : ''}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="flex-1" onClick={doImport}>
                <Upload className="h-4 w-4" />
                {preview.length} Einträge importieren
              </Button>
              <Button variant="outline" onClick={reset}>Zurücksetzen</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type LogEntry = UnifiLogRow | ParsedLog

function getLogTime(log: LogEntry): Date {
  return log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp)
}

export default function LogExplorer() {
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'structured' | 'raw'>('structured')
  const [showImport, setShowImport] = useState(false)
  const [importedLogs, setImportedLogs] = useState<ParsedLog[]>([])
  const [importBanner, setImportBanner] = useState('')

  const configured = useConnectionStore(s => s.configured)
  const eventsQ = useEvents(2000)
  const apiLogs: UnifiLogRow[] = eventsQ.data ?? []

  const allLogs: LogEntry[] = [...importedLogs, ...apiLogs]
  const sources = [...new Set(allLogs.map(l => l.source))]

  function handleImport(logs: ParsedLog[], filename: string) {
    setImportedLogs(prev => [...logs, ...prev])
    setImportBanner(`✓ ${logs.length} Einträge aus "${filename}" importiert`)
    setTimeout(() => setImportBanner(''), 5000)
  }

  const filtered = allLogs.filter(l => {
    const matchSearch = l.message.toLowerCase().includes(search.toLowerCase()) ||
      l.source.includes(search) || l.device.toLowerCase().includes(search.toLowerCase())
    const matchLevel = levelFilter === 'all' || l.level === levelFilter
    const matchSource = sourceFilter === 'all' || l.source === sourceFilter
    return matchSearch && matchLevel && matchSource
  })

  function timeAgoLocal(d: Date) {
    const s = Math.floor((Date.now() - d.getTime()) / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s/60)}m`
    if (s < 86400) return `${Math.floor(s/3600)}h`
    return d.toLocaleDateString('de-DE')
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Log Explorer</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {importedLogs.length > 0
              ? `${importedLogs.length} importierte + ${apiLogs.length} Live-Einträge`
              : 'Echtzeit-Logs aus allen Quellen'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline" size="sm"
            onClick={() => setShowImport(true)}
            className="border-blue-500/40 text-blue-400 hover:text-blue-300"
          >
            <FileUp className="h-4 w-4" />
            Logs importieren
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant={viewMode === 'raw' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode(v => v === 'structured' ? 'raw' : 'structured')}
          >
            <Terminal className="h-4 w-4" />
            {viewMode === 'raw' ? 'Strukturiert' : 'Raw'}
          </Button>
        </div>
      </div>

      {/* Import banner */}
      {importBanner && (
        <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-md px-4 py-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {importBanner}
        </div>
      )}

      {/* Import hint when no imported logs */}
      {importedLogs.length === 0 && (
        <Card className="border-dashed border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileUp className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-400">UniFi Logs importieren</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Importiere Logs aus deinem UniFi-System: <strong>Syslog-Dateien</strong> (.log/.txt),{' '}
                  <strong>JSON-Event-Exporte</strong> (via API) oder <strong>CSV</strong>.
                  Alternativ kannst du auf der <a href="/integrations" className="underline text-blue-400">Integrationen-Seite</a> eine Live-API-Verbindung einrichten.
                </p>
                <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => setShowImport(true)}>
                  <FileUp className="h-3.5 w-3.5" />
                  Jetzt importieren
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Level filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {['critical', 'error', 'warning', 'info'].map(level => {
          const count = allLogs.filter(l => l.level === level).length
          return (
            <button
              key={level}
              onClick={() => setLevelFilter(levelFilter === level ? 'all' : level)}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                levelFilter === level ? levelColors[level] : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {level.toUpperCase()}: {count}
            </button>
          )
        })}
        {importedLogs.length > 0 && (
          <button
            onClick={() => setImportedLogs([])}
            className="ml-auto px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:bg-muted"
          >
            <X className="inline h-3 w-3 mr-1" />
            Importierte löschen
          </button>
        )}
      </div>

      {/* Search & filter row */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Nachricht, Gerät, Quelle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Level</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Quelle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Quellen</SelectItem>
            {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center text-xs text-muted-foreground">
          {filtered.length} / {allLogs.length} Einträge
        </div>
      </div>

      {/* Not configured notice */}
      {!configured && (
        <DataState notConfigured />
      )}

      {/* Empty live logs notice */}
      {configured && apiLogs.length === 0 && !eventsQ.isLoading && importedLogs.length === 0 && (
        <DataState empty emptyText="Keine Live-Logs verfügbar" />
      )}

      {/* Log display */}
      {viewMode === 'structured' ? (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-border">
                {filtered.map(log => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group ${
                      'raw' in log ? 'border-l-2 border-l-blue-500/40' : ''
                    }`}
                  >
                    <Badge className={`${levelColors[log.level]} border text-[9px] uppercase shrink-0 mt-0.5`}>
                      {log.level}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          {getLogTime(log).toLocaleTimeString('de-DE')}
                        </span>
                        {'raw' in log && (
                          <Badge variant="outline" className="text-[8px] text-blue-400 border-blue-400/30 py-0">importiert</Badge>
                        )}
                        <Badge variant="outline" className="text-[9px] font-mono">{log.source}</Badge>
                        {'zone' in log && log.zone && (
                          <Badge variant="outline" className="text-[9px]">{log.zone}</Badge>
                        )}
                        <span className="text-[9px] text-muted-foreground">{log.device}</span>
                      </div>
                      <p className="font-mono text-xs mt-1 leading-relaxed break-all">{log.message}</p>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="py-16 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Keine Einträge gefunden</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-muted-foreground">
              aggregated.log — {filtered.length} Einträge
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <pre className="p-4 font-mono text-xs leading-relaxed">
                {filtered.map(log =>
                  `${getLogTime(log).toISOString()} [${log.level.toUpperCase().padEnd(8)}] ${log.source.padEnd(15)} ${log.device.padEnd(20)} ${log.message}\n`
                ).join('')}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
      />
    </div>
  )
}
