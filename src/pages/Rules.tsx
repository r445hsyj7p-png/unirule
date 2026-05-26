import { BookOpen, Plus, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockFirewallRules } from '@/data/mock'

export default function Rules() {
  const enabled = mockFirewallRules.filter(r => r.enabled).length
  const disabled = mockFirewallRules.filter(r => !r.enabled).length

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Firewall-Regeln</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{mockFirewallRules.length} Regeln konfiguriert</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4" />
            Batfish validieren
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Regel hinzufügen
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <div className="text-xl font-bold text-green-500">{enabled}</div>
              <div className="text-xs text-muted-foreground">Aktiv</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-gray-400" />
            <div>
              <div className="text-xl font-bold">{disabled}</div>
              <div className="text-xs text-muted-foreground">Deaktiviert</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            <div>
              <div className="text-xl font-bold text-yellow-500">1</div>
              <div className="text-xs text-muted-foreground">Zero-Trust-Lücken</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning about missing rule */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-sm">Zero-Trust-Lücke erkannt</div>
              <p className="text-xs text-muted-foreground mt-1">
                Regel <code className="bg-muted px-1 rounded">DENY_IOT_TO_CORP</code> ist deaktiviert.
                Das IoT-Segment kann aktuell auf das Corp LAN zugreifen.
                Batfish-Analyse bestätigt diesen Pfad als kritisches Risiko.
              </p>
              <Button size="sm" variant="outline" className="mt-2 h-7 text-xs">Regel aktivieren</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Regelname</th>
                  <th className="text-left px-4 py-3 font-medium">Aktion</th>
                  <th className="text-left px-4 py-3 font-medium">Quelle</th>
                  <th className="text-left px-4 py-3 font-medium">Ziel</th>
                  <th className="text-left px-4 py-3 font-medium">Port / Proto</th>
                  <th className="text-left px-4 py-3 font-medium">Hits</th>
                  <th className="text-left px-4 py-3 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {mockFirewallRules.map(rule => (
                  <tr key={rule.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${!rule.enabled ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className={`w-2 h-2 rounded-full ${rule.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium">{rule.name}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] border ${
                        rule.action === 'allow'
                          ? 'text-green-500 bg-green-500/10 border-green-500/20'
                          : 'text-red-500 bg-red-500/10 border-red-500/20'
                      }`}>
                        {rule.action.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-32 truncate">{rule.src}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-32 truncate">{rule.dst}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {rule.port === 'any' ? <span className="text-muted-foreground">any</span> : `${rule.port}/${rule.protocol}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{rule.hits.toLocaleString('de')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2">Edit</Button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground">
                          {rule.enabled ? 'Deakt.' : 'Akt.'}
                        </Button>
                      </div>
                    </td>
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
