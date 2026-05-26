import { Settings as SettingsIcon, Save, Shield, Bell, Database, Palette } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function Settings() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Plattform-Konfiguration</p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Allgemein</TabsTrigger>
          <TabsTrigger value="security">Sicherheit</TabsTrigger>
          <TabsTrigger value="notifications">Benachrichtigungen</TabsTrigger>
          <TabsTrigger value="data">Daten</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Palette className="h-4 w-4" />Erscheinungsbild</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Dark Mode</div>
                  <div className="text-xs text-muted-foreground">Standard ist Dark Mode (empfohlen für Security-Monitoring)</div>
                </div>
                <Badge variant="outline" className="text-green-500 border-green-500/30">Aktiv</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Schriftart</div>
                  <div className="text-xs text-muted-foreground font-mono">Geist + Geist Mono</div>
                </div>
                <Badge variant="outline">Standard</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Workspace-Name</label>
                <Input defaultValue="Hauptnetzwerk GmbH" className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Organisation</label>
                <Input defaultValue="Muster GmbH" className="h-8 text-sm" />
              </div>
              <Button size="sm"><Save className="h-4 w-4" />Speichern</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" />Zero Trust Konfiguration</CardTitle>
              <CardDescription className="text-xs">Parameter für die Policy Engine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Default Deny Modus', desc: 'Alle nicht explizit erlaubten Verbindungen blockieren', active: true },
                { label: 'Lateral Movement Detection', desc: 'Anomaler East-West-Traffic wird als Bedrohung gemeldet', active: true },
                { label: 'Automatische Policy-Vorschläge', desc: 'Batfish analysiert täglich Konfigurationsänderungen', active: true },
                { label: 'IoT-Quarantäne bei Anomalie', desc: 'IoT-Geräte werden bei Verdacht automatisch isoliert', active: false },
              ].map(setting => (
                <div key={setting.label} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{setting.label}</div>
                    <div className="text-xs text-muted-foreground">{setting.desc}</div>
                  </div>
                  <div className={`w-10 h-5 rounded-full cursor-pointer transition-colors flex items-center px-0.5 ${setting.active ? 'bg-green-500 justify-end' : 'bg-muted justify-start'}`}>
                    <div className="w-4 h-4 rounded-full bg-white shadow" />
                  </div>
                </div>
              ))}
              <Button size="sm"><Save className="h-4 w-4" />Konfiguration speichern</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" />Alert-Schwellwerte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Kritische Alerts sofort', desc: 'E-Mail + Push bei severity=critical', active: true },
                { label: 'Tägliche Zusammenfassung', desc: '08:00 Uhr — alle offenen Alerts', active: true },
                { label: 'Neue Geräte im Netzwerk', desc: 'Benachrichtigung bei unbekannten MAC-Adressen', active: false },
                { label: 'Policy-Genehmigungsanfragen', desc: 'Wenn neue Empfehlungen verfügbar sind', active: true },
              ].map(setting => (
                <div key={setting.label} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{setting.label}</div>
                    <div className="text-xs text-muted-foreground">{setting.desc}</div>
                  </div>
                  <div className={`w-10 h-5 rounded-full cursor-pointer transition-colors flex items-center px-0.5 ${setting.active ? 'bg-green-500 justify-end' : 'bg-muted justify-start'}`}>
                    <div className="w-4 h-4 rounded-full bg-white shadow" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" />Datenhaltung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Log-Aufbewahrung (Tage)</label>
                <Input type="number" defaultValue="90" className="h-8 text-sm w-32" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Metriken-Aufbewahrung (Tage)</label>
                <Input type="number" defaultValue="365" className="h-8 text-sm w-32" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">UniFi Controller URL</label>
                <Input defaultValue="https://unifi.corp.local:8443" className="h-8 text-sm" />
              </div>
              <Button size="sm"><Save className="h-4 w-4" />Speichern</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
