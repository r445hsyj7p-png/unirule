import { useState } from 'react'
import { Cloud, Flame, Network, Server, Wifi, Monitor, Printer, Cpu, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockTopologyNodes, mockTopologyEdges, mockZones } from '@/data/mock'

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

  const selectedNode = selected ? mockTopologyNodes.find(n => n.id === selected) : null

  const getNodePos = (id: string) => mockTopologyNodes.find(n => n.id === id)

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main topology SVG */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Netzwerk-Topologie</CardTitle>
            <CardDescription className="text-xs">Klicke auf ein Element für Details · Live-Daten via UniFi Poller</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg bg-muted/20 overflow-hidden">
              <svg viewBox="0 0 800 520" width="100%" style={{ minHeight: 400 }}>
                {/* Grid */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
                  </pattern>
                </defs>
                <rect width="800" height="520" fill="url(#grid)" />

                {/* Edges */}
                {mockTopologyEdges.map((edge, i) => {
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
                {mockTopologyNodes.map(node => (
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
              <CardTitle className="text-sm font-semibold">Zonen ({mockZones.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {mockZones.map(zone => (
                  <div key={zone.id} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{zone.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{zone.cidr}</div>
                    </div>
                    <div className={`text-[10px] font-bold ${
                      zone.riskScore > 70 ? 'text-red-500' :
                      zone.riskScore > 50 ? 'text-orange-500' :
                      zone.riskScore > 30 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {zone.riskScore}
                    </div>
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
    </div>
  )
}
