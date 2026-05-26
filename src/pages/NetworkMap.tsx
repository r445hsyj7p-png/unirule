import { useState, useMemo } from 'react'
import { Cloud, Flame, Network, Server, Wifi, Monitor, Printer, Cpu, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDevices, useNetworks } from '@/hooks/useUnifi'
import { useConnectionStore } from '@/lib/store'
import { DataState } from '@/components/ui/empty-state'

const typeIcons: Record<string, React.ElementType> = {
  cloud: Cloud,
  firewall: Flame,
  switch: Network,
  ap: Wifi,
  server: Server,
  devices: Monitor,
  printer: Printer,
  ot: Cpu,
  iot: Cpu,
  unknown: HelpCircle,
}

const typeColors: Record<string, string> = {
  cloud: '#6b7280',
  firewall: '#ef4444',
  switch: '#3b82f6',
  ap: '#10b981',
  server: '#8b5cf6',
  devices: '#f59e0b',
  printer: '#6b7280',
  ot: '#ec4899',
  iot: '#06b6d4',
  unknown: '#6b7280',
}

interface TopoNode {
  id: string
  type: string
  label: string
  x: number
  y: number
  zone?: string
  status: 'online' | 'offline'
  ip?: string
}

interface TopoEdge {
  from: string
  to: string
  label?: string
}

interface Zone {
  id: string
  name: string
  color: string
  vlan?: number
  cidr: string
  clients: number
}

function deviceToType(model: string, type: string): string {
  const m = model.toLowerCase()
  if (m.startsWith('ugw') || m.startsWith('udm') || m.startsWith('uxg') || type === 'ugw' || type === 'udm') return 'firewall'
  if (m.startsWith('usw') || m.startsWith('us-') || type === 'usw') return 'switch'
  if (m.startsWith('uap') || m.startsWith('ua') || type === 'uap') return 'ap'
  if (m.startsWith('ups')) return 'server'
  return 'unknown'
}

const ZONE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280']

function NodeIcon({ type, x, y, label, selected, onClick }: {
  type: string; x: number; y: number; label: string; selected: boolean; onClick: () => void
}) {
  const Icon = typeIcons[type] || HelpCircle
  const color = typeColors[type] || '#6b7280'
  const lines = label.split('\n')

  return (
    <g onClick={onClick} className="cursor-pointer">
      <circle
        cx={x} cy={y} r={selected ? 24 : 20}
        fill={`${color}20`}
        stroke={selected ? color : `${color}60`}
        strokeWidth={selected ? 2.5 : 1.5}
        className="transition-all"
      />
      <foreignObject x={x - 10} y={y - 10} width={20} height={20}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <Icon size={14} color={color} />
        </div>
      </foreignObject>
      {lines.map((line, i) => (
        <text
          key={i}
          x={x} y={y + 30 + (i * 13)}
          textAnchor="middle"
          fontSize={10}
          fill="var(--muted-foreground)"
          fontFamily="var(--font-sans)"
        >
          {line}
        </text>
      ))}
    </g>
  )
}

export default function NetworkMap() {
  const [selected, setSelected] = useState<string | null>(null)
  const configured = useConnectionStore(s => s.configured)
  const devicesQ = useDevices()
  const networksQ = useNetworks()

  const { topoNodes, topoEdges, zones } = useMemo(() => {
    const devices = devicesQ.data ?? []
    const networks = networksQ.data ?? []

    const internet: TopoNode = { id: 'internet', type: 'cloud', label: 'Internet', x: 500, y: 50, status: 'online' }

    const gateways: TopoNode[] = []
    const switches: TopoNode[] = []
    const aps: TopoNode[] = []
    const others: TopoNode[] = []

    devices.forEach(d => {
      const t = deviceToType(d.model, d.type)
      const node: TopoNode = {
        id: d.id,
        type: t,
        label: d.name,
        x: 0,
        y: 0,
        status: d.status,
        ip: d.ip,
      }
      if (t === 'firewall') gateways.push(node)
      else if (t === 'switch') switches.push(node)
      else if (t === 'ap') aps.push(node)
      else others.push(node)
    })

    // Assign x positions evenly, y by row
    const placeRow = (nodes: TopoNode[], y: number) => {
      const count = nodes.length
      nodes.forEach((n, i) => {
        n.x = count === 1 ? 500 : 100 + (800 / Math.max(count - 1, 1)) * i
        n.y = y
      })
    }

    placeRow(gateways, 150)
    placeRow(switches, 280)
    placeRow(aps, 410)
    placeRow(others, 540)

    const allNodes: TopoNode[] = [internet, ...gateways, ...switches, ...aps, ...others]

    const edges: TopoEdge[] = []
    gateways.forEach(gw => edges.push({ from: 'internet', to: gw.id }))
    gateways.forEach(gw => switches.forEach(sw => edges.push({ from: gw.id, to: sw.id })))
    switches.forEach(sw => aps.forEach(ap => edges.push({ from: sw.id, to: ap.id })))
    // If no switches but there are APs, connect gateways → APs
    if (switches.length === 0) {
      gateways.forEach(gw => aps.forEach(ap => edges.push({ from: gw.id, to: ap.id })))
    }

    const derivedZones: Zone[] = networks.map((n, i) => ({
      id: n.id,
      name: n.name,
      color: ZONE_COLORS[i % ZONE_COLORS.length],
      vlan: n.vlan,
      cidr: n.cidr,
      clients: n.devices,
    }))

    return { topoNodes: allNodes, topoEdges: edges, zones: derivedZones }
  }, [devicesQ.data, networksQ.data])

  const selectedNode = selected ? topoNodes.find(n => n.id === selected) : null
  const getNodePos = (id: string) => topoNodes.find(n => n.id === id)

  const isLoading = devicesQ.isLoading || networksQ.isLoading
  const isError = devicesQ.isError || networksQ.isError

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Netzwerkkarte</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Topologie-Visualisierung und Zonenübersicht</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Network className="h-4 w-4" />
            Graphviz exportieren
          </Button>
          <Button variant="outline" size="sm">Auto-Discover</Button>
        </div>
      </div>

      {!configured ? (
        <DataState notConfigured />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main topology SVG */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Netzwerk-Topologie</CardTitle>
              <CardDescription className="text-xs">Klicke auf ein Element für Details · Live-Daten via UniFi Poller</CardDescription>
            </CardHeader>
            <CardContent>
              <DataState isLoading={isLoading} isError={isError} empty={!isLoading && !isError && topoNodes.length <= 1} emptyText="Keine Geräte gefunden" />
              {!isLoading && !isError && topoNodes.length > 1 && (
                <div className="border rounded-lg bg-muted/20 overflow-hidden">
                  <svg viewBox="0 0 1000 600" width="100%" style={{ minHeight: 400 }}>
                    {/* Grid */}
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
                      </pattern>
                    </defs>
                    <rect width="1000" height="600" fill="url(#grid)" />

                    {/* Edges */}
                    {topoEdges.map((edge, i) => {
                      const from = getNodePos(edge.from)
                      const to = getNodePos(edge.to)
                      if (!from || !to) return null
                      const mx = (from.x + to.x) / 2
                      const my = (from.y + to.y) / 2
                      return (
                        <g key={i}>
                          <line
                            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                            stroke="var(--border)"
                            strokeWidth={1.5}
                            strokeDasharray="none"
                          />
                          {edge.label && (
                            <text x={mx} y={my - 4} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
                              {edge.label}
                            </text>
                          )}
                        </g>
                      )
                    })}

                    {/* Nodes */}
                    {topoNodes.map(node => (
                      <NodeIcon
                        key={node.id}
                        type={node.type}
                        x={node.x}
                        y={node.y}
                        label={node.label}
                        selected={selected === node.id}
                        onClick={() => setSelected(selected === node.id ? null : node.id)}
                      />
                    ))}
                  </svg>
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3">
                {Object.entries(typeColors).slice(0, 7).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-muted-foreground capitalize">{type}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Side panel */}
          <div className="flex flex-col gap-4">
            {/* Selected node detail */}
            {selectedNode ? (
              <Card className="border-blue-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Element-Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{selectedNode.label.replace('\n', ' ')}</span></div>
                  <div><span className="text-muted-foreground">Typ:</span> <span className="capitalize">{selectedNode.type}</span></div>
                  {selectedNode.ip && (
                    <div><span className="text-muted-foreground">IP:</span> <span className="font-mono text-xs">{selectedNode.ip}</span></div>
                  )}
                  <div><span className="text-muted-foreground">Status:</span>{' '}
                    <Badge className={selectedNode.status === 'online' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 'text-red-500 border-red-500/20 bg-red-500/10'}>
                      {selectedNode.status}
                    </Badge>
                  </div>
                  <div><span className="text-muted-foreground">Position:</span> <span className="font-mono text-xs">{selectedNode.x}, {selectedNode.y}</span></div>
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setSelected(null)}>
                    Auswahl aufheben
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  <Network className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Klicke auf ein Netzwerkelement für Details
                </CardContent>
              </Card>
            )}

            {/* Zones list */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Zonen ({zones.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border max-h-72 overflow-y-auto">
                  {zones.length === 0 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground">Keine Zonen gefunden</div>
                  )}
                  {zones.map(zone => (
                    <div key={zone.id} className="flex items-center gap-2 px-4 py-2.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">{zone.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{zone.cidr}</div>
                      </div>
                      {zone.vlan && (
                        <div className="text-[10px] text-muted-foreground">VLAN {zone.vlan}</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tool integrations status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Datenquellen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { name: 'UniFi Poller', status: 'live', color: 'text-green-500' },
                  { name: 'Batfish', status: 'analysiert', color: 'text-blue-500' },
                  { name: 'Graphviz', status: 'bereit', color: 'text-yellow-500' },
                ].map(tool => (
                  <div key={tool.name} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{tool.name}</span>
                    <span className={`font-medium ${tool.color}`}>{tool.status}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
