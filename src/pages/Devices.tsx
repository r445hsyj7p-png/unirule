import { useState } from 'react'
import { Server, Wifi, Monitor, Printer, Cpu, HelpCircle, Shield, AlertTriangle, Search, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDevices, useClients } from '@/hooks/useUnifi'
import { useConnectionStore } from '@/lib/store'
import { DataState, RowSkeleton } from '@/components/ui/empty-state'
import { formatBytes } from '@/lib/utils'
import type { UnifiDeviceRow, UnifiClientRow } from '@/lib/api'

const typeIcons: Record<string, React.ElementType> = {
  // Infrastructure types from UniFi
  ugw: Shield, udm: Shield, usg: Shield,
  usw: Server, uxg: Server,
  uap: Wifi,
  // OUI-derived categories
  gateway: Shield, switch: Server, ap: Wifi,
  user: Monitor, mobile: Monitor,
  server: Server,
  iot: Cpu, camera: Cpu, printer: Printer, voip: Monitor,
  // fallbacks
  workstation: Monitor, laptop: Monitor, client: Monitor,
  unknown: HelpCircle,
}
const typeColors: Record<string, string> = {
  ugw: 'text-red-500', udm: 'text-red-500', usg: 'text-red-500',
  usw: 'text-blue-500', uxg: 'text-blue-500',
  uap: 'text-green-500',
  gateway: 'text-red-500', switch: 'text-blue-500', ap: 'text-green-500',
  user: 'text-gray-400', mobile: 'text-violet-400',
  client: 'text-gray-400', workstation: 'text-gray-400', laptop: 'text-gray-400',
  server: 'text-purple-500',
  iot: 'text-cyan-500', camera: 'text-orange-400', printer: 'text-gray-400',
  voip: 'text-yellow-500',
  unknown: 'text-gray-400',
}

type AnyDevice = (UnifiDeviceRow & { _kind: 'infra' }) | (UnifiClientRow & { _kind: 'client' })

function getIcon(type: string) {
  const t = type?.toLowerCase() ?? ''
  return typeIcons[t] ?? HelpCircle
}
function getColor(type: string) {
  const t = type?.toLowerCase() ?? ''
  return typeColors[t] ?? 'text-gray-400'
}
function deviceTypeKey(device: AnyDevice): string {
  if (device._kind === 'infra') return device.type
  // For clients, prefer OUI-derived category over generic 'client'
  const cli = device as UnifiClientRow & { _kind: 'client' }
  return cli.category ?? 'unknown'
}
function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export default function Devices() {
  const configured = useConnectionStore(s => s.configured)
  const devQ = useDevices()
  const cliQ = useClients()
  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState<'table' | 'grid'>('table')

  const infraDevices: AnyDevice[] = (devQ.data ?? []).map(d => ({ ...d, _kind: 'infra' as const }))
  const clientDevices: AnyDevice[] = (cliQ.data ?? []).map(c => ({ ...c, _kind: 'client' as const }))
  const all: AnyDevice[] = [...infraDevices, ...clientDevices]

  const zones = [...new Set(clientDevices.map(c => (c as UnifiClientRow & { _kind: 'client' }).zone).filter(Boolean))]

  const filtered = all.filter(d => {
    const name = d.name ?? ''
    const ip = d.ip ?? ''
    const mac = d.mac ?? ''
    const zone = d._kind === 'client' ? (d as UnifiClientRow).zone : ''
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) ||
      ip.includes(search) || mac.toLowerCase().includes(search.toLowerCase())
    const matchZone = zoneFilter === 'all' || zone === zoneFilter
    const matchType = typeFilter === 'all' || (d._kind === typeFilter) ||
      (d._kind === 'infra' && typeFilter === 'infra') ||
      (d._kind === 'client' && typeFilter === 'client')
    return matchSearch && matchZone && matchType
  })

  const isLoading = devQ.isLoading || cliQ.isLoading
  const isError = devQ.isError || cliQ.isError
  const errorMsg = (devQ.error as Error)?.message ?? (cliQ.error as Error)?.message

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Geräte-Inventar</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {configured
              ? isLoading ? 'Lade…' : `${infraDevices.length} Infrastruktur · ${clientDevices.length} Clients`
              : 'Nicht verbunden'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { devQ.refetch(); cliQ.refetch() }}>
            <RefreshCw className="h-4 w-4" />Aktualisieren
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView(v => v === 'grid' ? 'table' : 'grid')}>
            {view === 'grid' ? 'Tabelle' : 'Kacheln'}
          </Button>
        </div>
      </div>

      {!configured ? (
        <DataState notConfigured />
      ) : isError ? (
        <DataState isError errorMessage={errorMsg} onRetry={() => { devQ.refetch(); cliQ.refetch() }} />
      ) : (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{all.filter(d => d.status === 'online').length}</div>
              <div className="text-xs text-muted-foreground">Online</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-red-500">{all.filter(d => d.status !== 'online').length}</div>
              <div className="text-xs text-muted-foreground">Offline</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{infraDevices.length}</div>
              <div className="text-xs text-muted-foreground">Infrastruktur</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{clientDevices.length}</div>
              <div className="text-xs text-muted-foreground">Clients</div>
            </CardContent></Card>
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Name, IP, MAC…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Typ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="infra">Infrastruktur</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
              </SelectContent>
            </Select>
            {zones.length > 0 && (
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Zone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Zonen</SelectItem>
                  {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <span className="self-center text-xs text-muted-foreground">{filtered.length} / {all.length}</span>
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
                        <th className="text-left px-4 py-3 font-medium">Zone / VLAN</th>
                        <th className="text-left px-4 py-3 font-medium">Traffic</th>
                        <th className="text-left px-4 py-3 font-medium">Zuletzt</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <RowSkeleton rows={8} cols={6} />
                      ) : filtered.map(device => {
                        const Icon = getIcon(deviceTypeKey(device))
                        const color = getColor(deviceTypeKey(device))
                        const cli = device._kind === 'client' ? device as UnifiClientRow : null
                        return (
                          <tr key={device.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                                <div>
                                  <div className="font-medium">{device.name}</div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    {device._kind === 'infra'
                                      ? (device as UnifiDeviceRow).model
                                      : (device as UnifiClientRow).oui || '—'
                                    }
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">
                              <div>{device.ip || '—'}</div>
                              <div className="text-muted-foreground">{device.mac}</div>
                            </td>
                            <td className="px-4 py-3">
                              {cli?.zone
                                ? <Badge variant="outline" className="text-[10px]">{cli.zone}{cli.vlan ? ` (VLAN ${cli.vlan})` : ''}</Badge>
                                : <span className="text-muted-foreground text-xs">Infrastruktur</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {cli ? (
                                <div>
                                  <span className="text-blue-400">↓{formatBytes(cli.rxBytes)}</span>
                                  {' / '}
                                  <span className="text-green-400">↑{formatBytes(cli.txBytes)}</span>
                                </div>
                              ) : (
                                device._kind === 'infra'
                                  ? <span>{(device as UnifiDeviceRow).clients} Clients</span>
                                  : '—'
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(device.lastSeen)}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`text-[10px] ${device.status === 'online' ? 'text-green-500 border-green-500/30' : 'text-gray-500 border-gray-500/30'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${device.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
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
                const Icon = getIcon(deviceTypeKey(device))
                const color = getColor(deviceTypeKey(device))
                const cli = device._kind === 'client' ? device as UnifiClientRow : null
                return (
                  <Card key={device.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-muted"><Icon className={`h-4 w-4 ${color}`} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{device.name}</div>
                          <div className="text-[10px] text-muted-foreground">{device._kind}</div>
                        </div>
                        <Badge variant="outline" className={`text-[9px] ${device.status === 'online' ? 'text-green-500 border-green-500/30' : 'text-gray-500'}`}>
                          {device.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">IP:</span><span className="font-mono">{device.ip || '—'}</span></div>
                        {cli?.zone && <div className="flex justify-between"><span className="text-muted-foreground">Zone:</span><span>{cli.zone}</span></div>}
                        {cli && <div className="flex justify-between"><span className="text-muted-foreground">Traffic:</span><span>{formatBytes(cli.rxBytes + cli.txBytes)}</span></div>}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
