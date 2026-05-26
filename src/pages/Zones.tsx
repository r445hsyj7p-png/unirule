import { Layers, TrendingUp, Shield, AlertTriangle } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockZones } from '@/data/mock'

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--popover-foreground)',
  fontSize: '12px',
}

function RiskBar({ score }: { score: number }) {
  const color = score > 70 ? '#ef4444' : score > 50 ? '#f97316' : score > 30 ? '#eab308' : '#22c55e'
  return (
    <div className="relative h-1.5 bg-muted rounded-full overflow-hidden w-full">
      <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  )
}

export default function Zones() {
  const radarData = mockZones.map(z => ({ zone: z.name.split(' ')[0], risk: z.riskScore, devices: z.devices }))
  const avgRisk = Math.round(mockZones.reduce((s, z) => s + z.riskScore, 0) / mockZones.length)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zonen & Segmente</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Netzwerksegmentierung und Risikobewertung</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Zone hinzufügen</Button>
          <Button size="sm">
            <Shield className="h-4 w-4" />
            Segmentierung prüfen
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{mockZones.length}</div>
            <div className="text-xs text-muted-foreground">Netzwerk-Zonen</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{mockZones.reduce((s, z) => s + z.devices, 0)}</div>
            <div className="text-xs text-muted-foreground">Geräte gesamt</div>
          </CardContent>
        </Card>
        <Card className={`${avgRisk > 60 ? 'border-orange-500/30' : ''}`}>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${avgRisk > 60 ? 'text-orange-500' : 'text-yellow-500'}`}>{avgRisk}</div>
            <div className="text-xs text-muted-foreground">Ø Risiko-Score</div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{mockZones.filter(z => z.riskScore > 70).length}</div>
            <div className="text-xs text-muted-foreground">Hochrisiko-Zonen</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Risiko-Radar</CardTitle>
            <CardDescription className="text-xs">Risikoprofil nach Zone</CardDescription>
          </CardHeader>
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

        {/* Zone list */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Zonenübersicht</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {mockZones.sort((a, b) => b.riskScore - a.riskScore).map(zone => (
                <div key={zone.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: zone.color }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{zone.name}</span>
                          <Badge variant="outline" className="text-[9px] font-mono">VLAN {zone.vlan}</Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{zone.description}</div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span className="font-mono">{zone.cidr}</span>
                          <span>·</span>
                          <span>GW: {zone.gateway}</span>
                          <span>·</span>
                          <span>{zone.devices} Geräte</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-16">
                      <div className={`text-lg font-bold ${
                        zone.riskScore > 70 ? 'text-red-500' :
                        zone.riskScore > 50 ? 'text-orange-500' :
                        zone.riskScore > 30 ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                        {zone.riskScore}
                      </div>
                      <div className="text-[9px] text-muted-foreground">Risiko</div>
                    </div>
                  </div>
                  <div className="mt-2 ml-6">
                    <RiskBar score={zone.riskScore} />
                  </div>
                  {zone.riskScore > 70 && (
                    <div className="ml-6 mt-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <span className="text-[10px] text-red-500">Kritisches Risiko — Policy-Überprüfung empfohlen</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone connections matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Kommunikations-Matrix</CardTitle>
          <CardDescription className="text-xs">Erlaubte (✓) und gesperrte (✗) Verbindungen zwischen Zonen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="text-[10px] w-full">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1 text-muted-foreground">Von → Nach</th>
                  {mockZones.slice(0, 6).map(z => (
                    <th key={z.id} className="px-2 py-1 text-center text-muted-foreground min-w-16">{z.name.split(' ')[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockZones.slice(0, 6).map((fromZone, fi) => (
                  <tr key={fromZone.id} className="border-t border-border">
                    <td className="px-2 py-1.5 font-medium">{fromZone.name.split(' ')[0]}</td>
                    {mockZones.slice(0, 6).map((toZone, ti) => {
                      if (fi === ti) return <td key={toZone.id} className="px-2 py-1.5 text-center bg-muted/20">—</td>
                      const allowed =
                        (fromZone.name === 'Corp LAN' && ['DMZ', 'Server Farm'].includes(toZone.name)) ||
                        (fromZone.name === 'Management') ||
                        (fromZone.name === 'DMZ' && toZone.name === 'Corp LAN')
                      return (
                        <td key={toZone.id} className={`px-2 py-1.5 text-center font-bold ${allowed ? 'text-green-500' : 'text-red-500'}`}>
                          {allowed ? '✓' : '✗'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
