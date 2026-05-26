import { Plug, RefreshCw, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockIntegrations } from '@/data/mock'
import { timeAgo } from '@/lib/utils'

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  connected: { label: 'Verbunden', color: 'text-green-500 border-green-500/20 bg-green-500/10', icon: CheckCircle },
  error: { label: 'Fehler', color: 'text-red-500 border-red-500/20 bg-red-500/10', icon: XCircle },
  idle: { label: 'Bereit', color: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10', icon: Clock },
}

const toolDocs: Record<string, { desc: string; link: string; setup: string }> = {
  'UniFi Poller': {
    desc: 'Sammelt Metriken aus UniFi-Controllern via API und liefert sie an InfluxDB/Prometheus.',
    link: 'https://github.com/unifi-poller/unifi-poller',
    setup: 'docker run -e UP_UNIFI_DEFAULT_URL=https://unifi:8443 ghcr.io/unifi-poller/unifi-poller:latest',
  },
  'go-unifi': {
    desc: 'Go-Bibliothek für direkte UniFi API-Interaktion. Ermöglicht Firewall-Regel-Erstellung via API.',
    link: 'https://github.com/paultyng/go-unifi',
    setup: 'go get github.com/paultyng/go-unifi/unifi',
  },
  'Batfish': {
    desc: 'Analysiert Netzwerkkonfigurationen (Cisco, Juniper, Palo Alto, UniFi) auf Policy-Verletzungen.',
    link: 'https://www.batfish.org/',
    setup: 'docker run -p 9997:9997 -p 9996:9996 batfish/batfish:latest',
  },
  'ntopng': {
    desc: 'Hochperformante Traffic-Analyse mit Anomalie-Erkennung, DNS-Monitoring und Geo-IP.',
    link: 'https://www.ntop.org/products/traffic-analysis/ntop/',
    setup: 'apt install ntopng && ntopng -i eth0 -w 3000',
  },
  'Graphviz': {
    desc: 'Generiert automatisch Netzwerk-Topologie-Diagramme aus Batfish/UniFi-Daten.',
    link: 'https://graphviz.org/',
    setup: 'pip install graphviz && dot -Tsvg topology.dot -o topology.svg',
  },
  'pyunifi': {
    desc: 'Python-Client für UniFi Controller REST-API. Ideal für Skripting und Automatisierung.',
    link: 'https://github.com/finish06/pyunifi',
    setup: 'pip install pyunifi',
  },
}

export default function Integrations() {
  const connected = mockIntegrations.filter(i => i.status === 'connected').length
  const errors = mockIntegrations.filter(i => i.status === 'error').length

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrationen</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Open-Source-Tool-Anbindung und Konfiguration</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" />
          Alle neu verbinden
        </Button>
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <div className="text-xl font-bold text-green-500">{connected}</div>
              <div className="text-xs text-muted-foreground">Verbunden</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <div>
              <div className="text-xl font-bold text-red-500">{errors}</div>
              <div className="text-xs text-muted-foreground">Fehler</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Plug className="h-6 w-6 text-muted-foreground" />
            <div>
              <div className="text-xl font-bold">{mockIntegrations.length}</div>
              <div className="text-xs text-muted-foreground">Gesamt</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Architecture diagram */}
      <Card className="bg-muted/20 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Datenfluss-Architektur</CardTitle>
          <CardDescription className="text-xs">Wie Open-Source-Tools Unirule mit Daten versorgen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre">
{`UniFi Controller ──┬─► UniFi Poller ──► Metriken/Geräte → Unirule Dashboard
                   └─► go-unifi ──────► API-Kontrolle  → Policy Engine
                   └─► pyunifi ──────► Automatisierung → Regeländerungen

Netzwerk-Traffic ──► ntopng ──────────► Anomalie-Daten → Threat Engine
                                      └► DNS-Monitoring → Log Explorer

Konfigurationen ───► Batfish ─────────► Policy-Analyse → Policy Engine
                                      └► Erreichbarkeit → Zero Trust Score

Batfish + UniFi ───► Graphviz ────────► SVG-Topologie  → Netzwerkkarte`}
          </div>
        </CardContent>
      </Card>

      {/* Integration cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockIntegrations.map(integration => {
          const status = statusConfig[integration.status]
          const StatusIcon = status.icon
          const docs = toolDocs[integration.name]
          return (
            <Card key={integration.id} className={integration.status === 'error' ? 'border-red-500/30' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="text-3xl shrink-0">{integration.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{integration.name}</span>
                      <Badge variant="outline" className="text-[9px]">v{integration.version}</Badge>
                      <Badge className={`text-[9px] border ${status.color}`}>
                        <StatusIcon className="h-2.5 w-2.5 mr-1" />
                        {status.label}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">{integration.category}</Badge>
                    </div>
                    {docs && <p className="text-xs text-muted-foreground mb-2">{docs.desc}</p>}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
                      <span>Letzte Sync: {timeAgo(integration.lastSync)}</span>
                      {integration.datapoints > 0 && (
                        <><span>·</span><span>{integration.datapoints.toLocaleString('de')} Datenpunkte</span></>
                      )}
                    </div>
                    {docs && (
                      <div className="bg-muted/50 rounded-md p-2 mb-3">
                        <div className="text-[9px] text-muted-foreground uppercase mb-1">Quick Setup</div>
                        <code className="text-[10px] break-all">{docs.setup}</code>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1">
                        <RefreshCw className="h-3 w-3" />
                        Neu verbinden
                      </Button>
                      {docs && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs">
                          <ExternalLink className="h-3 w-3" />
                          Docs
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
