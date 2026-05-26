import { useRef } from 'react'
import { Settings as SettingsIcon, Save, Shield, Bell, Database, Palette, Upload, RotateCcw, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAppearanceStore, applyFont, applyFavicon, type FontChoice } from '@/lib/appearanceStore'

// ── Font option card ──────────────────────────────────────────────────────────

function FontCard({
  id, label, preview, mono, description, selected, onSelect,
}: {
  id: FontChoice; label: string; preview: string; mono: string
  description: string; selected: boolean; onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`relative rounded-lg border p-4 text-left w-full transition-all ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border hover:border-foreground/30'
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Check className="h-3 w-3 text-primary-foreground" />
        </span>
      )}
      <div
        className="text-lg font-semibold leading-tight mb-1"
        style={{ fontFamily: id === 'geist' ? 'Geist, sans-serif' : "'Open Sans', sans-serif" }}
      >
        {label}
      </div>
      <div
        className="text-xs text-muted-foreground mb-2"
        style={{ fontFamily: id === 'geist' ? "'Geist Mono', monospace" : "'Open Sans', sans-serif" }}
      >
        {mono}
      </div>
      <div
        className="text-sm text-foreground/80 mb-2"
        style={{ fontFamily: id === 'geist' ? 'Geist, sans-serif' : "'Open Sans', sans-serif" }}
      >
        {preview}
      </div>
      <div className="text-[10px] text-muted-foreground">{description}</div>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const { font, faviconDataUrl, setFont, setFavicon } = useAppearanceStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFontSelect(f: FontChoice) {
    setFont(f)
    applyFont(f)
  }

  function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 512 * 1024) {
      alert('Datei zu groß — maximal 512 KB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setFavicon(dataUrl)
      applyFavicon(dataUrl)
    }
    reader.readAsDataURL(file)

    // reset input so the same file can be re-selected
    e.target.value = ''
  }

  function resetFavicon() {
    setFavicon(null)
    applyFavicon(null)
  }

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
          {/* ── Appearance ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Erscheinungsbild
              </CardTitle>
              <CardDescription className="text-xs">
                Schriftart und Favicon werden im Browser gespeichert und sofort angewendet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Dark mode (read-only indicator) */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Dark Mode</div>
                  <div className="text-xs text-muted-foreground">Standard ist Dark Mode (empfohlen für Security-Monitoring)</div>
                </div>
                <Badge variant="outline" className="text-green-500 border-green-500/30">Aktiv</Badge>
              </div>

              {/* Font selector */}
              <div>
                <div className="text-sm font-medium mb-1">Schriftart</div>
                <div className="text-xs text-muted-foreground mb-3">
                  Wird sofort angewendet — keine Seite neu laden nötig.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FontCard
                    id="geist"
                    label="Geist"
                    preview="Security Dashboard — Echtzeit-Übersicht"
                    mono="fn analyze() → ThreatLevel"
                    description="Vercel · Sans + Mono · Standard"
                    selected={font === 'geist'}
                    onSelect={() => handleFontSelect('geist')}
                  />
                  <FontCard
                    id="opensans"
                    label="Open Sans"
                    preview="Security Dashboard — Echtzeit-Übersicht"
                    mono="Netzwerk · Firewall · Policies"
                    description="Google · Variable · Humanistisch"
                    selected={font === 'opensans'}
                    onSelect={() => handleFontSelect('opensans')}
                  />
                </div>
              </div>

              {/* Favicon */}
              <div>
                <div className="text-sm font-medium mb-1">Favicon</div>
                <div className="text-xs text-muted-foreground mb-3">
                  PNG, SVG oder ICO · max. 512 KB · wird im Browser-Tab und Lesezeichen angezeigt.
                </div>
                <div className="flex items-center gap-4">
                  {/* Current favicon preview */}
                  <div className="w-14 h-14 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={faviconDataUrl ?? '/favicon.svg'}
                      alt="Aktuelles Favicon"
                      className="w-10 h-10 object-contain"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/svg+xml,image/x-icon,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={handleFaviconUpload}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Bild hochladen
                    </Button>
                    {faviconDataUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs gap-1.5 text-muted-foreground"
                        onClick={resetFavicon}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Standard wiederherstellen
                      </Button>
                    )}
                    {!faviconDataUrl && (
                      <span className="text-[10px] text-muted-foreground">Standard-Favicon aktiv</span>
                    )}
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* ── Workspace ── */}
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
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Zero Trust Konfiguration
              </CardTitle>
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
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Alert-Schwellwerte
              </CardTitle>
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
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Datenhaltung
              </CardTitle>
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
