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
import {
  mockMetrics, mockTrafficData, mockThreatTimeline,
  mockZoneDistribution, mockThreats, mockBandwidth,
  mockZeroTrustBreakdown,
} from '@/data/mock'
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

  // formatBytes used for total traffic display
  const totalTrafficBytes = mockTrafficData.reduce((s, d) => s + (d.inbound + d.outbound) * 1024 * 1024, 0)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Echtzeit-Übersicht · Gesamt-Traffic heute: {formatBytes(totalTrafficBytes)}
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
                    strokeDasharray={`${mockMetrics.zeroTrustScore} ${100 - mockMetrics.zeroTrustScore}`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-base font-bold">
                  {mockMetrics.zeroTrustScore}
                </span>
              </div>
              <div>
                <div className="text-lg font-bold">Zero Trust Score</div>
                <div className="text-sm text-muted-foreground">Verbesserungsbedarf — 6 kritische Lücken offen</div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-1 mt-2">
                  {mockZeroTrustBreakdown.map(z => (
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
        <StatCard title="Geräte online"       value={mockMetrics.totalDevices}                icon={Server}     onClick={() => navigate('/devices')} />
        <StatCard title="Aktive Bedrohungen"  value={mockMetrics.activeThreats}               icon={ShieldAlert} color="#ef4444" delta={2}  deltaLabel="heute neu"  onClick={() => navigate('/threats')} />
        <StatCard title="Offene Alerts"       value={mockMetrics.openAlerts}                  icon={AlertTriangle} color="#f59e0b"                     onClick={() => navigate('/threats')} />
        <StatCard title="Blockierte Verb."    value={mockMetrics.blockedConnections.toLocaleString('de')} icon={XCircle} delta={-8} deltaLabel="vs. gestern" />
        <StatCard title="Netzwerk-Zonen"      value={mockMetrics.networkZones}                icon={Wifi}       onClick={() => navigate('/zones')} />
        <StatCard title="Firewall-Regeln"     value={mockMetrics.firewallRules}               icon={Lock}       onClick={() => navigate('/rules')} />
        <StatCard title="Policy-Verletzungen" value={mockMetrics.policyViolations}            icon={AlertTriangle} color="#f97316" delta={5} deltaLabel="heute" onClick={() => navigate('/policies')} />
        <StatCard title="Compliance Score"    value="74%"                                     icon={Shield}     color="#22c55e" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Netzwerk-Traffic (24h)</CardTitle>
            <CardDescription className="text-xs">Eingehend / Ausgehend / Blockiert in Mbps</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mockTrafficData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="inbound"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  <linearGradient id="outbound" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  <linearGradient id="blocked"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="inbound"  stroke="#3b82f6" fill="url(#inbound)"  strokeWidth={2} name="Eingehend" />
                <Area type="monotone" dataKey="outbound" stroke="#10b981" fill="url(#outbound)" strokeWidth={2} name="Ausgehend" />
                <Area type="monotone" dataKey="blocked"  stroke="#ef4444" fill="url(#blocked)"  strokeWidth={2} name="Blockiert" />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Traffic nach Zone</CardTitle>
            <CardDescription className="text-xs">Alle 8 Zonen</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={mockZoneDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                  {mockZoneDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
              {mockZoneDistribution.map(z => (
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
              <BarChart data={mockThreatTimeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Kritisch" />
                <Bar dataKey="high"     stackId="a" fill="#f97316" name="Hoch" />
                <Bar dataKey="medium"   stackId="a" fill="#eab308" name="Mittel" />
                <Bar dataKey="low"      stackId="a" fill="#3b82f6" name="Niedrig" radius={[2,2,0,0]} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Bandbreite (7 Tage)</CardTitle>
            <CardDescription className="text-xs">GB/Tag</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockBandwidth} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="rx" fill="#3b82f6" name="RX" radius={[2,2,0,0]} />
                <Bar dataKey="tx" fill="#10b981" name="TX" radius={[2,2,0,0]} />
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
            {mockThreats.slice(0, 5).map(t => (
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
                  t.status === 'investigating' ? 'text-yellow-500 border-yellow-500/30' :
                  'text-green-500 border-green-500/30'
                }`}>{t.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
