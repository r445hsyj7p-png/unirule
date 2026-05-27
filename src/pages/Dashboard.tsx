import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldAlert, Server, AlertTriangle,
  Wifi, Shield, Lock, XCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataState } from '@/components/ui/empty-state'
import { useMetrics, useThreats, useNetworks, useEvents, useFirewallRules, useHistoryMetrics } from '@/hooks/useUnifi'
import { useConnectionStore } from '@/lib/store'
import { severityBg, timeAgo, formatBytes } from '@/lib/utils'

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--popover-foreground)',
  fontSize: '12px',
}

function StatCard({
  title, value, icon: Icon, delta, deltaLabel, color, onClick,
}: {
  title: string; value: string | number; icon: React.ElementType;
  delta?: number; deltaLabel?: string; color?: string; onClick?: () => void
}) {
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:border-foreground/20 transition-colors' : ''}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
            {delta !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${delta > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                <span>{Math.abs(delta)}% {deltaLabel}</span>
              </div>
            )}
          </div>
          <div className="rounded-lg p-2.5 bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const configured = useConnectionStore(s => s.configured)

  const { metrics, isLoading, isError } = useMetrics()
  const { threats, refetch } = useThreats()
  const networksQuery = useNetworks()
  const eventsQuery = useEvents(500)   // still used for threats / blockedConnections
  const firewallQuery = useFirewallRules()

  // Real time-series from SQLite metrics table
  const now = Date.now()
  const metrics24h = useHistoryMetrics({ from: now - 24 * 3_600_000, resolution: 'hour' })
  const metrics7d  = useHistoryMetrics({ from: now - 7  * 86_400_000, resolution: 'day'  })

  // ── Zero Trust Score ───────────────────────────────────────────────────────
  const zeroTrustScore = useMemo(() => {
    const networks = networksQuery.data ?? []
    const firewall = firewallQuery.data ?? []
    const segmentation = networks.length > 0
      ? Math.round((networks.filter(n => n.vlan != null).length / networks.length) * 100)
      : 0
    const fwCoverage = firewall.length > 0
      ? Math.round((firewall.filter(r => r.enabled).length / firewall.length) * 100)
      : 0
    const threatPenalty = Math.max(0, 100 - (threats.length * 3))
    const networkScore = Math.min(100, networks.length * 12)
    const score = Math.round((segmentation + fwCoverage + threatPenalty + networkScore) / 4)
    return {
      score: Math.min(100, Math.max(0, score)),
      breakdown: [
        { category: 'Segmentierung', score: segmentation },
        { category: 'Firewall', score: fwCoverage },
        { category: 'Bedrohungen', score: threatPenalty },
        { category: 'Netzwerk', score: networkScore },
      ],
    }
  }, [networksQuery.data, firewallQuery.data, threats])

  // ── Traffic Chart (24h — real bytes/s from metrics table) ─────────────────
  const trafficData = useMemo(() => {
    const mBuckets = metrics24h.data ?? []
    const ts = Date.now()
    // Pre-fill 24 hourly slots
    const hours: Record<string, { time: string; inbound: number; outbound: number }> = {}
    for (let i = 23; i >= 0; i--) {
      const d = new Date(ts - i * 3_600_000)
      const key = `${d.getHours().toString().padStart(2, '0')}:00`
      hours[key] = { time: key, inbound: 0, outbound: 0 }
    }
    mBuckets.forEach(m => {
      const d   = new Date(m.bucket)
      const key = `${d.getHours().toString().padStart(2, '0')}:00`
      if (hours[key]) {
        hours[key].inbound  += m.rxBytesPerSec
        hours[key].outbound += m.txBytesPerSec
      }
    })
    return Object.values(hours)
  }, [metrics24h.data])

  // ── Zone Distribution Pie ──────────────────────────────────────────────────
  const zoneDistribution = useMemo(() => {
    const networks = networksQuery.data ?? []
    if (!networks.length) return []
    const total = networks.reduce((s, n) => s + (n.devices || 1), 0)
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280']
    return networks.map((n, i) => ({
      name: n.name,
      value: Math.round(((n.devices || 1) / total) * 100),
      color: COLORS[i % COLORS.length],
    }))
  }, [networksQuery.data])

  // ── Threat Timeline (14 days) ─────────────────────────────────────────────
  const threatTimeline = useMemo(() => {
    const now = new Date()
    const days: Record<string, { date: string; critical: number; high: number; medium: number; low: number }> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days[key] = { date: `${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, '0')}`, critical: 0, high: 0, medium: 0, low: 0 }
    }
    threats.forEach(t => {
      const key = t.timestamp.toISOString().slice(0, 10)
      if (days[key]) {
        const s = t.severity as 'critical' | 'high' | 'medium'
        days[key][s] = (days[key][s] || 0) + 1
      }
    })
    return Object.values(days)
  }, [threats])

  // ── Bandwidth (7-day — real bytes/s aggregated per day from metrics table) ─
  const bandwidthData = useMemo(() => {
    const mBuckets = metrics7d.data ?? []
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    const days: Record<string, { day: string; rx: number; tx: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days[key] = { day: dayNames[d.getDay()], rx: 0, tx: 0 }
    }
    mBuckets.forEach(m => {
      const key = new Date(m.bucket).toISOString().slice(0, 10)
      if (days[key]) {
        days[key].rx += m.rxBytesPerSec
        days[key].tx += m.txBytesPerSec
      }
    })
    return Object.values(days)
  }, [metrics7d.data])

  // ── Derived stat card values ───────────────────────────────────────────────
  const blockedConnections = eventsQuery.data?.filter(e => /block|deny|drop/i.test(e.message)).length ?? 0
  const policyViolations = threats.filter(t => /policy|violation/i.test(t.description)).length
  const complianceScore = `${Math.min(100, Math.max(0, Math.round((zeroTrustScore.score + (metrics.firewallRules > 0 ? 80 : 0)) / 2)))}%`

  // ── Not configured ─────────────────────────────────────────────────────────
  if (!configured) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Security Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Echtzeit-Übersicht</p>
          </div>
        </div>
        <DataState
          notConfigured={true}
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Echtzeit-Übersicht · Aktuell: {formatBytes(metrics.rxBytesPerSec)}/s
          </p>
        </div>
      </div>

      {/* Zero Trust Score */}
      <Card className="border-2 border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="relative w-16 h-16 shrink-0">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--muted)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9155" fill="none"
                    stroke="#eab308" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${zeroTrustScore.score} ${100 - zeroTrustScore.score}`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-base font-bold">
                  {isLoading ? '—' : zeroTrustScore.score}
                </span>
              </div>
              <div>
                <div className="text-lg font-bold">Zero Trust Score</div>
                <div className="text-sm text-muted-foreground">Verbesserungsbedarf — {threats.length} Bedrohungen aktiv</div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-1 mt-2">
                  {zeroTrustScore.breakdown.map(z => (
                    <div key={z.category} className="flex items-center gap-1.5">
                      <div className="relative h-1 w-16 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${z.score}%`,
                            backgroundColor: z.score < 60 ? '#ef4444' : z.score < 75 ? '#eab308' : '#22c55e',
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{z.category}: {z.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/policies')}>
              <Shield className="h-4 w-4" />
              Policy Engine öffnen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Geräte online"       value={isLoading ? '—' : metrics.totalDevices}                         icon={Server}        onClick={() => navigate('/devices')} />
        <StatCard title="Aktive Bedrohungen"  value={isLoading ? '—' : threats.length}                              icon={ShieldAlert}   color="#ef4444" delta={2}  deltaLabel="heute neu" onClick={() => navigate('/threats')} />
        <StatCard title="Offene Alerts"       value={isLoading ? '—' : threats.filter(t => t.severity === 'critical').length} icon={AlertTriangle} color="#f59e0b"            onClick={() => navigate('/threats')} />
        <StatCard title="Blockierte Verb."    value={isLoading ? '—' : blockedConnections.toLocaleString('de')}      icon={XCircle}       delta={-8} deltaLabel="vs. gestern" />
        <StatCard title="Netzwerk-Zonen"      value={isLoading ? '—' : metrics.networkZones}                         icon={Wifi}          onClick={() => navigate('/zones')} />
        <StatCard title="Firewall-Regeln"     value={isLoading ? '—' : metrics.firewallRules}                        icon={Lock}          onClick={() => navigate('/rules')} />
        <StatCard title="Policy-Verletzungen" value={isLoading ? '—' : policyViolations}                             icon={AlertTriangle} color="#f97316" delta={5} deltaLabel="heute" onClick={() => navigate('/policies')} />
        <StatCard title="Compliance Score"    value={isLoading ? '—' : complianceScore}                              icon={Shield}        color="#22c55e" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Netzwerk-Traffic (24h)</CardTitle>
            <CardDescription className="text-xs">RX / TX — Bytes/s (Stunden-Durchschnitt)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trafficData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="inbound"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  <linearGradient id="outbound" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v ?? 0).toFixed(0)} B/s`]} />
                <Area type="monotone" dataKey="inbound"  stroke="#3b82f6" fill="url(#inbound)"  strokeWidth={2} name="RX (Eingehend)" />
                <Area type="monotone" dataKey="outbound" stroke="#10b981" fill="url(#outbound)" strokeWidth={2} name="TX (Ausgehend)" />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Traffic nach Zone</CardTitle>
            <CardDescription className="text-xs">{zoneDistribution.length} Zonen</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={zoneDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                  {zoneDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
              {zoneDistribution.map(z => (
                <div key={z.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                  <span className="text-[10px] text-muted-foreground truncate">{z.name}: {z.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Bedrohungen (14 Tage)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={threatTimeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Kritisch" />
                <Bar dataKey="high"     stackId="a" fill="#f97316" name="Hoch" />
                <Bar dataKey="medium"   stackId="a" fill="#eab308" name="Mittel" />
                <Bar dataKey="low"      stackId="a" fill="#3b82f6" name="Niedrig" radius={[2, 2, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Bandbreite (7 Tage)</CardTitle>
            <CardDescription className="text-xs">Bytes/s — Tages-Durchschnitt</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bandwidthData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="rx" fill="#3b82f6" name="RX" radius={[2, 2, 0, 0]} />
                <Bar dataKey="tx" fill="#10b981" name="TX" radius={[2, 2, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent threats */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Aktuelle Bedrohungen</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/threats')}>
              Alle anzeigen →
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {threats.slice(0, 5).map(t => (
              <div
                key={t.id}
                className="flex items-start gap-3 px-6 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate('/threats')}
              >
                <Badge className={`${severityBg(t.severity)} border text-[10px] mt-0.5 shrink-0`}>
                  {t.severity}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t.title}</span>
                    {t.cve && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{t.cve}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span>{t.device}</span><span>·</span><span>{t.zone}</span><span>·</span><span>{timeAgo(t.timestamp)}</span>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${
                  t.status === 'open' ? 'text-red-500 border-red-500/30' :
                  'text-green-500 border-green-500/30'
                }`}>{t.status}</Badge>
              </div>
            ))}
            {threats.length === 0 && !isLoading && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Keine Bedrohungen erkannt
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
