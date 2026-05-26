import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, CheckCircle, Clock, AlertTriangle, ChevronRight, Brain } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useFirewallRules, useNetworks, useThreats } from '@/hooks/useUnifi'
import { useConnectionStore } from '@/lib/store'
import { DataState } from '@/components/ui/empty-state'
import { severityBg } from '@/lib/utils'

interface PolicySuggestion {
  id: string
  title: string
  description: string
  reasoning: string
  suggestedRule: string
  impact: string
  effort: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_review' | 'approved'
  category: string
  source: string
  affectedZones: string[]
}

const effortLabel: Record<string, string> = { low: 'Gering', medium: 'Mittel', high: 'Hoch' }
const effortColor: Record<string, string> = {
  low: 'text-green-500 bg-green-500/10 border-green-500/20',
  medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  high: 'text-red-500 bg-red-500/10 border-red-500/20',
}

const sourceLabel: Record<string, string> = {
  'batfish-analyse': '🐟 Batfish',
  'policy-engine': '⚡ Policy Engine',
  'ntopng-scan': '📊 ntopng',
}

export default function Policies() {
  const navigate = useNavigate()
  const configured = useConnectionStore(s => s.configured)

  const firewallQ = useFirewallRules()
  const networksQ = useNetworks()
  const { threats, isLoading, isError, refetch } = useThreats()

  const [selected, setSelected] = useState<PolicySuggestion | null>(null)
  const [approved, setApproved] = useState<Set<string>>(new Set())

  const suggestions = useMemo<PolicySuggestion[]>(() => {
    const items: PolicySuggestion[] = []
    const firewall = firewallQ.data ?? []
    const networks = networksQ.data ?? []

    // Disabled firewall rules → suggest enabling
    firewall.filter(r => !r.enabled).forEach(r => {
      items.push({
        id: `fw-${r.id}`,
        title: `Deaktivierte Regel aktivieren: ${r.name}`,
        description: `Die Firewall-Regel "${r.name}" ist deaktiviert. Quell-Adresse: ${r.srcAddress || 'any'}, Ziel: ${r.dstAddress || 'any'} (${r.protocol}).`,
        reasoning: `Deaktivierte Firewall-Regeln hinterlassen Lücken im Schutz. Regel "${r.name}" im Regelset "${r.ruleset}" sollte reaktiviert oder durch eine aktuellere Regel ersetzt werden.`,
        suggestedRule: `rule ${r.name} { action=${r.action}; src=${r.srcAddress || 'any'}; dst=${r.dstAddress || 'any'}; proto=${r.protocol}; enabled=true }`,
        impact: 'high',
        effort: 'low',
        status: 'pending',
        category: 'Firewall',
        source: 'policy-engine',
        affectedZones: [r.ruleset || 'WAN_IN'],
      })
    })

    // Networks without VLAN → suggest segmentation
    networks.filter(n => !n.vlan && n.purpose !== 'corporate').forEach(n => {
      items.push({
        id: `seg-${n.id}`,
        title: `VLAN-Segmentierung für ${n.name}`,
        description: `Netzwerk "${n.name}" (${n.cidr}) hat kein VLAN-Tag. Zero-Trust empfiehlt strikte Layer-2-Segmentierung.`,
        reasoning: `Ohne VLAN-Segmentierung können Geräte in "${n.name}" lateral kommunizieren. Ein dediziertes VLAN isoliert dieses Netzwerksegment und verhindert laterale Bewegungen.`,
        suggestedRule: `network ${n.name} { vlan=<ID>; subnet=${n.cidr}; isolate=true; acl=deny-lateral }`,
        impact: 'medium',
        effort: 'medium',
        status: 'pending',
        category: 'Segmentierung',
        source: 'batfish-analyse',
        affectedZones: [n.name],
      })
    })

    // High/critical threats → suggest blocking rules
    threats.filter(t => t.severity === 'critical' || t.severity === 'high').slice(0, 5).forEach(t => {
      items.push({
        id: `thr-${t.id}`,
        title: `Isolationsregel für ${t.device}`,
        description: `${t.title} — Gerät ${t.device} erzeugt wiederholt Sicherheitsevents. Blockierungsregel empfohlen.`,
        reasoning: `Das Gerät "${t.device}" wurde als Bedrohungsquelle identifiziert (${t.category}). Eine Isolationsregel verhindert weitere Ausbreitung.`,
        suggestedRule: `firewall { block src=${t.device}; direction=both; log=true; comment="Auto: ${t.title.slice(0, 40)}" }`,
        impact: t.severity,
        effort: t.severity === 'critical' ? 'low' : 'medium',
        status: 'in_review',
        category: 'Bedrohungsabwehr',
        source: 'ntopng-scan',
        affectedZones: [t.zone],
      })
    })

    // No IDS rules detected → suggest enabling threat detection
    const hasIdsRule = firewall.some(r =>
      r.ruleset?.toLowerCase().includes('ids') || r.name?.toLowerCase().includes('ids')
    )
    if (!hasIdsRule && configured && (firewall.length > 0 || networks.length > 0)) {
      items.push({
        id: 'ids-001',
        title: 'Intrusion Detection aktivieren',
        description: 'Keine IDS/IPS-Regeln gefunden. UniFi Threat Management bietet eingebaute Angriffserkennung.',
        reasoning: 'Ohne IDS/IPS-System bleiben Zero-Day-Angriffe und unbekannte Bedrohungen unentdeckt. UniFi\'s eingebautes Threat Management kann ohne Konfigurationsaufwand aktiviert werden.',
        suggestedRule: 'threat-management { ids=enabled; ips=enabled; sensitivity=medium; auto-block=true }',
        impact: 'critical',
        effort: 'low',
        status: 'pending',
        category: 'IDS/IPS',
        source: 'policy-engine',
        affectedZones: networks.map(n => n.name).slice(0, 3),
      })
    }

    return items
  }, [firewallQ.data, networksQ.data, threats, configured])

  function approve(id: string) {
    setApproved(prev => new Set([...prev, id]))
    setSelected(null)
  }

  const pending     = suggestions.filter(p => p.status === 'pending'  && !approved.has(p.id))
  const inReview    = suggestions.filter(p => p.status === 'in_review' && !approved.has(p.id))
  const approvedList = suggestions.filter(p => approved.has(p.id)     || p.status === 'approved')

  function PolicyCard({ policy }: { policy: PolicySuggestion }) {
    return (
      <Card
        className="cursor-pointer hover:border-foreground/20 transition-colors"
        onClick={() => setSelected(policy)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <Badge className={`${severityBg(policy.impact)} border text-[10px] uppercase`}>
                  {policy.impact}
                </Badge>
                <Badge className={`border text-[10px] ${effortColor[policy.effort]}`}>
                  Aufwand: {effortLabel[policy.effort]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{policy.category}</Badge>
              </div>
              <h3 className="text-sm font-semibold">{policy.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{policy.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] text-muted-foreground">
                  {sourceLabel[policy.source] || policy.source}
                </span>
                <div className="flex gap-1">
                  {policy.affectedZones.map(z => (
                    <Badge key={z} variant="outline" className="text-[9px] py-0">{z}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Policy Engine</h1>
          <p className="text-muted-foreground text-sm mt-0.5">KI-gestützte Zero-Trust-Empfehlungen</p>
        </div>
        <Button size="sm" onClick={() => { firewallQ.refetch(); networksQ.refetch(); refetch() }}>
          <Brain className="h-4 w-4" />
          Neue Analyse starten
        </Button>
      </div>

      {!configured ? (
        <DataState notConfigured isLoading={false} isError={false} />
      ) : isLoading ? (
        <DataState isLoading isError={false} />
      ) : isError ? (
        <DataState isLoading={false} isError errorMessage="Fehler beim Laden" onRetry={refetch} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-6 w-6 text-yellow-500" />
                <div>
                  <div className="text-xl font-bold text-yellow-500">{pending.length}</div>
                  <div className="text-xs text-muted-foreground">Ausstehend</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-blue-500" />
                <div>
                  <div className="text-xl font-bold text-blue-500">{inReview.length}</div>
                  <div className="text-xs text-muted-foreground">In Prüfung</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <div className="text-xl font-bold text-green-500">{approvedList.length}</div>
                  <div className="text-xs text-muted-foreground">Genehmigt</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis sources info */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium">Analyse-Quellen</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Empfehlungen werden aus <strong>Batfish</strong>-Konfigurationsanalysen,
                    <strong> ntopng</strong>-Traffic-Auswertungen und der internen Policy Engine generiert.
                    Batfish prüft Netzwerkkonfigurationen auf Erreichbarkeitspfade und Policy-Lücken.
                    ntopng liefert Anomalie-Erkennungen aus dem Live-Traffic.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px]">🐟 Batfish v2024.01</Badge>
                    <Badge variant="outline" className="text-[10px]">📊 ntopng v6.2</Badge>
                    <Badge variant="outline" className="text-[10px]">⚡ Policy Engine v1.0</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick link to violations */}
          <Card
            className="border-orange-500/20 bg-orange-500/5 cursor-pointer hover:border-orange-500/40 transition-colors"
            onClick={() => navigate('/policies/violations')}
          >
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">
                  {inReview.length + pending.length} aktive Policy-Empfehlungen → Details anzeigen
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-orange-500" />
            </CardContent>
          </Card>

          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Ausstehend ({pending.length})</TabsTrigger>
              <TabsTrigger value="review">In Prüfung ({inReview.length})</TabsTrigger>
              <TabsTrigger value="approved">Genehmigt ({approvedList.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4 space-y-3">
              {pending.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Keine ausstehenden Empfehlungen
                </CardContent></Card>
              ) : pending.map(p => <PolicyCard key={p.id} policy={p} />)}
            </TabsContent>

            <TabsContent value="review" className="mt-4 space-y-3">
              {inReview.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Keine Empfehlungen in Prüfung
                </CardContent></Card>
              ) : inReview.map(p => <PolicyCard key={p.id} policy={p} />)}
            </TabsContent>

            <TabsContent value="approved" className="mt-4 space-y-3">
              {approvedList.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Noch keine Empfehlungen genehmigt
                </CardContent></Card>
              ) : approvedList.map(p => (
                <Card key={p.id} className="border-green-500/20 bg-green-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">{p.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{p.category} · {sourceLabel[p.source] || p.source}</p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-7"
                        onClick={() => setApproved(prev => { const s = new Set(prev); s.delete(p.id); return s })}>
                        Rollback
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex gap-2 mb-1">
                  <Badge className={`${severityBg(selected.impact)} border text-[10px] uppercase`}>{selected.impact}</Badge>
                  <Badge className={`border text-[10px] ${effortColor[selected.effort]}`}>Aufwand: {effortLabel[selected.effort]}</Badge>
                </div>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>{selected.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1.5">Begründung</div>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">{selected.reasoning}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1.5">Vorgeschlagene Regel</div>
                  <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs border">{selected.suggestedRule}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1.5">Betroffene Zonen</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {selected.affectedZones.map(z => (
                      <Badge key={z} variant="outline">{z}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={() => approve(selected.id)}>
                    <CheckCircle className="h-4 w-4" />
                    Genehmigen & Anwenden
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                    Ablehnen
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
