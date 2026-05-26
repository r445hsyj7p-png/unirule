import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockPolicyViolations, mockFirewallRules } from '@/data/mock'
import { timeAgo, formatNumber } from '@/lib/utils'

export default function PolicyViolations() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Policy-Verletzungen</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {mockPolicyViolations.length} aktive Verstöße · {formatNumber(mockPolicyViolations.reduce((s, v) => s + v.count, 0))} Ereignisse gesamt
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{mockPolicyViolations.length}</div>
            <div className="text-xs text-muted-foreground">Aktive Verstöße</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{formatNumber(mockPolicyViolations.reduce((s, v) => s + v.count, 0))}</div>
            <div className="text-xs text-muted-foreground">Ereignisse gesamt</div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">
              {mockFirewallRules.filter(r => !r.enabled).length}
            </div>
            <div className="text-xs text-muted-foreground">Regeln deaktiviert</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Verletzungsdetails</CardTitle>
          <CardDescription className="text-xs">
            Geräte, die aktive Firewall-Regeln verletzen oder deaktivierte Regeln umgehen
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Verletzte Regel</th>
                  <th className="text-left px-4 py-3 font-medium">Gerät / Quelle</th>
                  <th className="text-left px-4 py-3 font-medium">Verbindung</th>
                  <th className="text-left px-4 py-3 font-medium">Zone</th>
                  <th className="text-right px-4 py-3 font-medium">Ereignisse</th>
                  <th className="text-left px-4 py-3 font-medium">Zuletzt</th>
                  <th className="text-left px-4 py-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {mockPolicyViolations.map(v => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        <span className="font-mono text-xs">{v.rule}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium">{v.device}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{v.srcIp}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      <div>{v.srcIp} → {v.dstIp}</div>
                      <div className="text-[10px]">{v.proto} / Port {v.port}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">{v.zone}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-orange-500">{formatNumber(v.count)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(v.timestamp)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => navigate('/rules')}>
                          Regel aktivieren
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => navigate('/policies')}>
                          <ExternalLink className="h-3 w-3" />
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
