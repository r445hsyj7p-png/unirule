import { useState } from 'react'
import { Server, Wifi, Monitor, Printer, Cpu, HelpCircle, Shield, AlertTriangle, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mockDevices } from '@/data/mock'
import { timeAgo } from '@/lib/utils'

const typeIcons: Record<string, React.ElementType> = {
  firewall: Shield,
  switch: Server,
  ap: Wifi,
  workstation: Monitor,
  laptop: Monitor,
  server: Server,
  iot: Cpu,
  printer: Printer,
  ot: Cpu,
  unknown: HelpCircle,
}

const typeColors: Record<string, string> = {
  firewall: 'text-red-500',
  switch: 'text-blue-500',
  ap: 'text-green-500',
  workstation: 'text-gray-400',
  laptop: 'text-gray-400',
  server: 'text-purple-500',
  iot: 'text-cyan-500',
  printer: 'text-gray-400',
  ot: 'text-pink-500',
  unknown: 'text-gray-500',
}

export default function Devices() {
  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState<'grid' | 'table'>('table')

  const zones = [...new Set(mockDevices.map(d => d.zone))]
  const types = [...new Set(mockDevices.map(d => d.type))]

  const filtered = mockDevices.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.ip.includes(search) || d.mac.toLowerCase().includes(search.toLowerCase())
    const matchZone = zoneFilter === 'all' || d.zone === zoneFilter
    const matchType = typeFilter === 'all' || d.type === typeFilter
    return matchSearch && matchZone && matchType
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Geräte-Inventar</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{mockDevices.length} Geräte erkannt</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView(v => v === 'grid' ? 'table' : 'grid')}>
            {view === 'grid' ? 'Tabellenansicht' : 'Kachelansicht'}
          </Button>
          <Button size="sm">Auto-Discover</Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Online', count: mockDevices.filter(d => d.status === 'online').length, color: 'text-green-500' },
          { label: 'Verdächtig', count: mockDevices.filter(d => d.status === 'suspicious').length, color: 'text-red-500' },
          { label: 'Mit Schwachst.', count: mockDevices.filter(d => d.vulnerabilities > 0).length, color: 'text-orange-500' },
          { label: 'Kritisch (>5)', count: mockDevices.filter(d => d.vulnerabilities > 5).length, color: 'text-red-500' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Name, IP, MAC..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Zone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Zonen</SelectItem>
            {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Typ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {types.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {view === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Gerät</th>
                    <th className="text-left px-4 py-3 font-medium">IP / MAC</th>
                    <th className="text-left px-4 py-3 font-medium">Zone</th>
                    <th className="text-left px-4 py-3 font-medium">OS</th>
                    <th className="text-left px-4 py-3 font-medium">Schwachst.</th>
                    <th className="text-left px-4 py-3 font-medium">Zuletzt</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(device => {
                    const Icon = typeIcons[device.type] || HelpCircle
                    const iconColor = typeColors[device.type] || 'text-gray-400'
                    return (
                      <tr key={device.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                            <div>
                              <div className="font-medium">{device.name}</div>
                              <div className="text-[10px] text-muted-foreground">{device.model}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          <div>{device.ip}</div>
                          <div className="text-muted-foreground">{device.mac}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">{device.zone}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-32 truncate">{device.os}</td>
                        <td className="px-4 py-3">
                          {device.vulnerabilities > 0 ? (
                            <div className={`flex items-center gap-1 ${device.vulnerabilities > 5 ? 'text-red-500' : device.vulnerabilities > 2 ? 'text-orange-500' : 'text-yellow-500'}`}>
                              <AlertTriangle className="h-3 w-3" />
                              <span className="text-xs font-semibold">{device.vulnerabilities}</span>
                            </div>
                          ) : (
                            <Shield className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(device.lastSeen)}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              device.status === 'online' ? 'text-green-500 border-green-500/30' :
                              device.status === 'suspicious' ? 'text-red-500 border-red-500/30' :
                              'text-gray-500 border-gray-500/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                              device.status === 'online' ? 'bg-green-500' :
                              device.status === 'suspicious' ? 'bg-red-500' : 'bg-gray-500'
                            }`} />
                            {device.status}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(device => {
            const Icon = typeIcons[device.type] || HelpCircle
            const iconColor = typeColors[device.type] || 'text-gray-400'
            return (
              <Card key={device.id} className={`${device.status === 'suspicious' ? 'border-red-500/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{device.name}</div>
                      <div className="text-[10px] text-muted-foreground">{device.type}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${device.status === 'online' ? 'text-green-500 border-green-500/30' : 'text-red-500 border-red-500/30'}`}
                    >
                      {device.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">IP:</span><span className="font-mono">{device.ip}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Zone:</span><span>{device.zone}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Schwachst.:</span>
                      <span className={device.vulnerabilities > 0 ? 'text-orange-500 font-semibold' : 'text-green-500'}>{device.vulnerabilities}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
