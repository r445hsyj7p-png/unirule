import { useState } from 'react'
import { FileText, Search, RefreshCw, Download, Terminal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { mockLogs } from '@/data/mock'
import { timeAgo } from '@/lib/utils'

const levelColors: Record<string, string> = {
  critical: 'text-red-500 bg-red-500/10 border-red-500/20',
  error: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  warning: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  info: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
}

export default function LogExplorer() {
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'structured' | 'raw'>('structured')

  const sources = [...new Set(mockLogs.map(l => l.source))]

  const filtered = mockLogs.filter(l => {
    const matchSearch = l.message.toLowerCase().includes(search.toLowerCase()) ||
      l.source.includes(search) || l.device.toLowerCase().includes(search.toLowerCase())
    const matchLevel = levelFilter === 'all' || l.level === levelFilter
    const matchSource = sourceFilter === 'all' || l.source === sourceFilter
    return matchSearch && matchLevel && matchSource
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Log Explorer</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Echtzeit-Logs aus allen Quellen</p>
        </div>
        <div className="flex gap-2">
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

      {/* Level stats */}
      <div className="flex gap-3 flex-wrap">
        {['critical', 'error', 'warning', 'info'].map(level => {
          const count = mockLogs.filter(l => l.level === level).length
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
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Nachricht, Gerät, Quelle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
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
      </div>

      {viewMode === 'structured' ? (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-border">
                {filtered.map(log => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group">
                    <Badge className={`${levelColors[log.level]} border text-[9px] uppercase shrink-0 mt-0.5`}>
                      {log.level}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          {log.timestamp.toLocaleTimeString('de-DE')}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-mono">{log.source}</Badge>
                        <Badge variant="outline" className="text-[9px]">{log.zone}</Badge>
                        <span className="text-[9px] text-muted-foreground">{log.device}</span>
                      </div>
                      <p className="font-mono text-xs mt-1 leading-relaxed break-all">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-muted-foreground">
              /var/log/unirule/aggregated.log — {filtered.length} Einträge
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <pre className="p-4 font-mono text-xs leading-relaxed">
                {filtered.map(log =>
                  `${log.timestamp.toISOString()} [${log.level.toUpperCase().padEnd(8)}] ${log.source.padEnd(15)} ${log.device.padEnd(20)} ${log.message}\n`
                ).join('')}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
