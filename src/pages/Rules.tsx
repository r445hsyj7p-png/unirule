import { useState } from 'react'
import { Plus, Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFirewallRules } from '@/hooks/useUnifi'
import { useConnectionStore } from '@/lib/store'
import { DataState, RowSkeleton } from '@/components/ui/empty-state'

export default function Rules() {
  const configured = useConnectionStore(s => s.configured)
  const { data, isLoading, isError, error, refetch } = useFirewallRules()
  const [toggledOff, setToggledOff] = useState<Set<string>>(new Set())

  const rules = data ?? []
  const enabled = rules.filter(r => r.enabled && !toggledOff.has(r.id)).length
  const disabled = rules.length - enabled

  function toggle(id: string) {
    setToggledOff(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Firewall-Regeln</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {configured
              ? isLoading ? 'Lade…' : `${rules.length} Regeln aus UniFi`
              : 'Nicht verbunden'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />Aktualisieren
          </Button>
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4" />Batfish validieren
          </Button>
          <Button size="sm"><Plus className="h-4 w-4" />Regel hinzufügen</Button>
        </div>
      </div>

      {!configured ? (
        <DataState notConfigured />
      ) : isError ? (
        <DataState isError errorMessage={(error as Error)?.message} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div><div className="text-xl font-bold text-green-500">{enabled}</div><div className="text-xs text-muted-foreground">Aktiv</div></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-6 w-6 text-gray-400" />
              <div><div className="text-xl font-bold">{disabled}</div><div className="text-xs text-muted-foreground">Deaktiviert</div></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <div><div className="text-xl font-bold text-yellow-500">{rules.filter(r => !r.enabled || toggledOff.has(r.id)).length}</div><div className="text-xs text-muted-foreground">Nicht aktiv</div></div>
            </CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Name</th>
                      <th className="text-left px-4 py-3 font-medium">Aktion</th>
                      <th className="text-left px-4 py-3 font-medium">Quelle</th>
                      <th className="text-left px-4 py-3 font-medium">Ziel</th>
                      <th className="text-left px-4 py-3 font-medium">Port / Proto</th>
                      <th className="text-left px-4 py-3 font-medium">Ruleset</th>
                      <th className="text-left px-4 py-3 font-medium">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? <RowSkeleton rows={6} cols={8} /> :
                    rules.map(rule => {
                      const active = rule.enabled && !toggledOff.has(rule.id)
                      return (
                        <tr key={rule.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${!active ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3"><div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} /></td>
                          <td className="px-4 py-3 font-mono text-xs font-medium">{rule.name}</td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] border ${rule.action === 'accept' || rule.action === 'allow' ? 'text-green-500 bg-green-500/10 border-green-500/20' : 'text-red-500 bg-red-500/10 border-red-500/20'}`}>
                              {rule.action.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-32 truncate">{rule.srcAddress || 'any'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-32 truncate">{rule.dstAddress || 'any'}</td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {rule.dstPort && rule.dstPort !== 'any' ? `${rule.dstPort}/${rule.protocol}` : <span className="text-muted-foreground">any</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{rule.ruleset}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">Edit</Button>
                              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground" onClick={() => toggle(rule.id)}>
                                {active ? 'Deakt.' : 'Akt.'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
