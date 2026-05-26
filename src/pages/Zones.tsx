import { Shield, RefreshCw } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNetworks, useClients } from '@/hooks/useUnifi'
import { useConnectionStore } from '@/lib/store'
import { DataState } from '@/components/ui/empty-state'

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--popover)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--popover-foreground)', fontSize: '12px',
}

// Assign a risk score heuristic based on zone purpose
function riskScore(purpose: string, name: string): number {
  const n = (name + purpose).toLowerCase()
  if (n.includes('ot') || n.includes('scada') || n.includes('industrial')) return 85
  if (n.includes('iot') || n.includes('camera')) return 75
  if (n.includes('guest') || n.includes('hotspot')) return 50
  if (n.includes('dmz')) return 60
  if (n.includes('mgmt') || n.includes('manage')) return 20
  if (n.includes('voip')) return 30
  if (n.includes('server')) return 40
  if (purpose === 'corporate') return 35
  return 45
}

function RiskBar({ score }: { score: number }) {
  const color = score > 70 ? '#ef4444' : score > 50 ? '#f97316' : score > 30 ? '#eab308' : '#22c55e'
  return (
    <div className="relative h-1.5 bg-muted rounded-full overflow-hidden w-full">
      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  )
}

const COLORS = ['#3b82f6','#f59e0b','#10b981','#8b5cf6','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#a78bfa']

export default function Zones() {
  const configured = useConnectionStore(s => s.configured)
  const netQ = useNetworks()
  const cliQ = useClients()

  const networks = (netQ.data ?? []).filter(n => n.purpose !== 'wan' && n.enabled)
  const clientsByZone = new Map<string, number>()
  for (const c of cliQ.data ?? []) {
    clientsByZone.set(c.zone, (clientsByZone.get(c.zone) ?? 0) + 1)
  }

  const zones = networks.map((n, i) => ({
    ...n,
    riskScore: riskScore(n.purpose, n.name),
    color: COLORS[i % COLORS.length],
    clientCount: clientsByZone.get(n.name) ?? n.devices,
  }))

  const avgRisk = zones.length ? Math.round(zones.reduce((s, z) => s + z.riskScore, 0) / zones.length) : 0
  const radarData = zones.map(z => ({ zone: z.name.split(' ')[0], risk: z.riskScore }))

  const isLoading = netQ.isLoading
  const isError = netQ.isError

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zonen & Segmente</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {configured
              ? isLoading ? 'Lade…' : `${zones.length} Netzwerke aus UniFi`
              : 'Nicht verbunden'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => netQ.refetch()}>
            <RefreshCw className="h-4 w-4" />Aktualisieren
          </Button>
          <Button size="sm"><Shield className="h-4 w-4" />Segmentierung prüfen</Button>
        </div>
      </div>

      {!configured ? (
        <DataState notConfigured />
      ) : isError ? (
        <DataState isError errorMessage={(netQ.error as Error)?.message} onRetry={() => netQ.refetch()} />
      ) : isLoading ? (
        <DataState isLoading />
      ) : zones.length === 0 ? (
        <DataState empty emptyText="Keine Netzwerke gefunden" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{zones.length}</div><div className="text-xs text-muted-foreground">Netzwerk-Zonen</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{cliQ.data?.filter(c=>c.status==='online').length ?? 0}</div><div className="text-xs text-muted-foreground">Aktive Clients</div></CardContent></Card>
            <Card className={avgRisk > 60 ? 'border-orange-500/30' : ''}><CardContent className="p-4 text-center"><div className={`text-2xl font-bold ${avgRisk > 60 ? 'text-orange-500' : 'text-yellow-500'}`}>{avgRisk}</div><div className="text-xs text-muted-foreground">Ø Risiko-Score</div></CardContent></Card>
            <Card className="border-red-500/30"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-500">{zones.filter(z => z.riskScore > 70).length}</div><div className="text-xs text-muted-foreground">Hochrisiko-Zonen</div></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Risiko-Radar</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="zone" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                    <Radar name="Risiko" dataKey="risk" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Zonenübersicht</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {zones.sort((a,b) => b.riskScore - a.riskScore).map(zone => (
                    <div key={zone.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: zone.color }} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{zone.name}</span>
                              {zone.vlan && <Badge variant="outline" className="text-[9px] font-mono">VLAN {zone.vlan}</Badge>}
                              <Badge variant="outline" className="text-[9px] capitalize">{zone.purpose}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                              {zone.cidr && <span className="font-mono">{zone.cidr}</span>}
                              {zone.gateway && <><span>·</span><span>GW: {zone.gateway}</span></>}
                              <span>·</span><span>{zone.clientCount} Clients</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 min-w-16">
                          <div className={`text-lg font-bold ${zone.riskScore > 70 ? 'text-red-500' : zone.riskScore > 50 ? 'text-orange-500' : zone.riskScore > 30 ? 'text-yellow-500' : 'text-green-500'}`}>{zone.riskScore}</div>
                          <div className="text-[9px] text-muted-foreground">Risiko</div>
                        </div>
                      </div>
                      <div className="mt-2 ml-6"><RiskBar score={zone.riskScore} /></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
