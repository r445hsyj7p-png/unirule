import { useState } from 'react'
import { ShieldAlert, Filter, Search, Eye, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useThreats } from '@/hooks/useUnifi'
import { useConnectionStore } from '@/lib/store'
import { DataState } from '@/components/ui/empty-state'
import { severityBg, timeAgo } from '@/lib/utils'

type ThreatItem = ReturnType<typeof useThreats>['threats'][number]

export default function Threats() {
  const configured = useConnectionStore(s => s.configured)
  const { threats, isLoading, isError, refetch } = useThreats()

  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<ThreatItem | null>(null)

  if (!configured || isLoading || isError) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Threats &amp; Alerts</h1>
            <p className="text-muted-foreground text-sm mt-0.5">0 offene Bedrohungen</p>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
            Export
          </Button>
        </div>
        <DataState
          isLoading={isLoading}
          isError={isError}
          notConfigured={!configured}
          errorMessage="Fehler beim Laden"
          onRetry={refetch}
        />
      </div>
    )
  }

  const filtered = threats.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.device.toLowerCase().includes(search.toLowerCase()) ||
      t.zone.toLowerCase().includes(search.toLowerCase())
    const matchSeverity = severityFilter === 'all' || t.severity === severityFilter
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchSeverity && matchStatus
  })

  const counts = {
    critical: threats.filter(t => t.severity === 'critical').length,
    high: threats.filter(t => t.severity === 'high').length,
    medium: threats.filter(t => t.severity === 'medium').length,
    low: (threats as Array<{ severity: string }>).filter(t => t.severity === 'low').length,
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Threats &amp; Alerts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{threats.filter(t => t.status === 'open').length} offene Bedrohungen</p>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Kritisch', count: counts.critical, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Hoch', count: counts.high, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
          { label: 'Mittel', count: counts.medium, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Niedrig', count: counts.low, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
        ].map(c => (
          <Card key={c.label} className={`border ${c.bg}`}>
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${c.color}`}>{c.count}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Suche..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Schweregrad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Schweregrade</SelectItem>
            <SelectItem value="critical">Kritisch</SelectItem>
            <SelectItem value="high">Hoch</SelectItem>
            <SelectItem value="medium">Mittel</SelectItem>
            <SelectItem value="low">Niedrig</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="open">Offen</SelectItem>
            <SelectItem value="investigating">In Prüfung</SelectItem>
            <SelectItem value="blocked">Blockiert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Threats table */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.map(threat => (
              <div
                key={threat.id}
                className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setSelected(threat)}
              >
                <Badge className={`${severityBg(threat.severity)} border text-[10px] mt-0.5 shrink-0 uppercase`}>
                  {threat.severity}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{threat.title}</span>
                    {threat.cve && (
                      <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border">{threat.cve}</span>
                    )}
                    <Badge variant="outline" className="text-[10px]">{threat.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{threat.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                    <ShieldAlert className="h-3 w-3" />
                    <span>{threat.device}</span>
                    <span>·</span>
                    <span>{threat.zone}</span>
                    <span>·</span>
                    <span>{timeAgo(threat.timestamp.toISOString())}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${
                    threat.status === 'open' ? 'text-red-500 border-red-500/30' :
                    'text-green-500 border-green-500/30'
                  }`}>
                    {threat.status}
                  </Badge>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Keine Treffer gefunden</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`${severityBg(selected.severity)} border text-[10px] uppercase`}>
                    {selected.severity}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{selected.category}</Badge>
                </div>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>{selected.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-[10px] text-muted-foreground uppercase mb-1">Gerät</div>
                    <div className="font-medium">{selected.device}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-[10px] text-muted-foreground uppercase mb-1">Zone</div>
                    <div className="font-medium">{selected.zone}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-[10px] text-muted-foreground uppercase mb-1">Status</div>
                    <div className="font-medium capitalize">{selected.status}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-[10px] text-muted-foreground uppercase mb-1">Erkannt</div>
                    <div className="font-medium">{timeAgo(selected.timestamp.toISOString())}</div>
                  </div>
                </div>
                {selected.cve && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <div className="text-[10px] text-red-500 uppercase mb-1">CVE Referenz</div>
                    <div className="font-mono text-sm">{selected.cve}</div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1">
                    <CheckCircle className="h-4 w-4" />
                    Als behandelt markieren
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">Policy erstellen</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
