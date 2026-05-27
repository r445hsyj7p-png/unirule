import { useRef, useState, useEffect } from 'react'
import {
  Save, Shield, Bell, Database,
  Palette, Upload, RotateCcw, Check, Sun, Moon, Lock,
  Eye, EyeOff, RefreshCw, CheckCircle2, AlertTriangle,
  HardDrive, FileText, Bell as BellIcon, Cpu,
  Trash2, History, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAppearanceStore, applyFont, applyFavicon, type FontChoice } from '@/lib/appearanceStore'
import { useThemeStore } from '@/lib/themeStore'
import { api } from '@/lib/api'
import { useDbStats, useAppSettings, useAuditLog, useSecuritySettings, useNotificationSettings } from '@/hooks/useUnifi'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { formatBytes } from '@/lib/utils'
import type { AuditLogEntry, PurgeResult, SecuritySettings, NotificationSettings } from '@/lib/api'

// ── Module-scope constants for Phase 4 tabs ───────────────────────────────────

const SECURITY_DEFAULTS: SecuritySettings = {
  defaultDeny: true, lateralMovement: true, autoPolicySuggestions: true, iotQuarantine: false,
}

const SECURITY_ITEMS: Array<{ key: keyof SecuritySettings; label: string; desc: string }> = [
  { key: 'defaultDeny',           label: 'Default Deny Modus',             desc: 'Alle nicht explizit erlaubten Verbindungen blockieren' },
  { key: 'lateralMovement',       label: 'Lateral Movement Detection',     desc: 'Anomaler East-West-Traffic wird als Bedrohung gemeldet' },
  { key: 'autoPolicySuggestions', label: 'Automatische Policy-Vorschläge', desc: 'Analyse der Konfigurationsänderungen' },
  { key: 'iotQuarantine',         label: 'IoT-Quarantäne bei Anomalie',    desc: 'IoT-Geräte werden bei Verdacht automatisch isoliert' },
]

const NOTIFICATION_DEFAULTS: NotificationSettings = {
  criticalImmediate: true, dailyDigest: true, newDevices: false, policyApprovals: true,
}

const NOTIFICATION_ITEMS: Array<{ key: keyof NotificationSettings; label: string; desc: string }> = [
  { key: 'criticalImmediate', label: 'Kritische Alerts sofort',     desc: 'E-Mail + Push bei severity=critical' },
  { key: 'dailyDigest',       label: 'Tägliche Zusammenfassung',    desc: '08:00 Uhr — alle offenen Alerts' },
  { key: 'newDevices',        label: 'Neue Geräte im Netzwerk',     desc: 'Benachrichtigung bei unbekannten MAC-Adressen' },
  { key: 'policyApprovals',   label: 'Policy-Genehmigungsanfragen', desc: 'Wenn neue Empfehlungen verfügbar sind' },
]

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

// ── Admin Password Card ───────────────────────────────────────────────────────

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-8 text-sm"
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShow(v => !v)}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

function AdminPasswordCard() {
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const canSubmit =
    oldPw.trim().length > 0 &&
    newPw.length >= 8 &&
    newPw === confirmPw

  const confirmMismatch = confirmPw.length > 0 && newPw !== confirmPw

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setErrorMsg(null)
    try {
      await api.changePassword(oldPw, newPw)
      setSuccess(true)
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Passwort konnte nicht geändert werden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Administrator
        </CardTitle>
        <CardDescription className="text-xs">
          Anmeldedaten des lokalen Admin-Accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Aktuelles Passwort</label>
            <PasswordInput value={oldPw} onChange={setOldPw} placeholder="Aktuelles Passwort" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Neues Passwort</label>
            <PasswordInput value={newPw} onChange={setNewPw} placeholder="Mind. 8 Zeichen" />
            {newPw.length > 0 && newPw.length < 8 && (
              <p className="text-[11px] text-yellow-600">Mind. 8 Zeichen erforderlich</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Neues Passwort bestätigen</label>
            <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="Passwort wiederholen" />
            {confirmMismatch && (
              <p className="text-[11px] text-red-500">Passwörter stimmen nicht überein</p>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Passwort wurde geändert
            </div>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={!canSubmit || loading}
            className="w-full"
          >
            {loading
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Wird gespeichert…</>
              : <><Save className="h-3.5 w-3.5" />Passwort ändern</>
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Blocked IPs Card ──────────────────────────────────────────────────────────

interface BlockedIp {
  ip: string
  lockedAt: number
  lockedUntil: number
}

/** Formats a past timestamp as "vor X Min/Std" */
function formatRelative(ms: number): string {
  const diff = Date.now() - ms   // positive = past
  if (diff < 60_000) return 'gerade eben'
  if (diff < 3_600_000) return `vor ${Math.floor(diff / 60_000)} Min`
  if (diff < 86_400_000) return `vor ${Math.floor(diff / 3_600_000)} Std`
  return `vor ${Math.floor(diff / 86_400_000)} Tagen`
}

/** Formats a future timestamp as "in X Min/Std" */
function formatUntil(ms: number): string {
  const diff = ms - Date.now()   // positive = future
  if (diff <= 0) return 'abgelaufen'
  if (diff < 60_000) return `in ${Math.ceil(diff / 1_000)} Sek`
  if (diff < 3_600_000) return `in ${Math.ceil(diff / 60_000)} Min`
  if (diff < 86_400_000) return `in ${Math.ceil(diff / 3_600_000)} Std`
  return `in ${Math.ceil(diff / 86_400_000)} Tagen`
}

function formatAbsolute(ms: number): string {
  return new Date(ms).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function BlockedIpsCard() {
  const [loading, setLoading] = useState(false)
  const [ips, setIps] = useState<BlockedIp[] | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function fetchBlockedIps() {
    setLoading(true)
    setErrorMsg(null)
    try {
      const data = await api.getBlockedIps()
      setIps(data)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Gesperrte IPs
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Adressen die durch Rate-Limiting temporär gesperrt wurden
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={fetchBlockedIps}
            disabled={loading}
          >
            {loading
              ? <RefreshCw className="h-3 w-3 animate-spin" />
              : <RefreshCw className="h-3 w-3" />}
            Aktualisieren
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {errorMsg}
          </div>
        )}

        {ips === null && !loading && (
          <p className="text-xs text-muted-foreground">Klicke auf Aktualisieren um die Liste zu laden.</p>
        )}

        {ips !== null && ips.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Keine gesperrten IPs
          </div>
        )}

        {ips !== null && ips.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">IP</th>
                  <th className="px-3 py-2 text-left font-medium">Gesperrt seit</th>
                  <th className="px-3 py-2 text-left font-medium">Gesperrt bis</th>
                </tr>
              </thead>
              <tbody>
                {ips.map(entry => (
                  <tr key={entry.ip} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono font-medium">{entry.ip}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <span title={formatAbsolute(entry.lockedAt)}>{formatRelative(entry.lockedAt)}</span>
                      <span className="ml-1 text-[10px]">({formatAbsolute(entry.lockedAt)})</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <span title={formatAbsolute(entry.lockedUntil)}>{formatUntil(entry.lockedUntil)}</span>
                      <span className="ml-1 text-[10px]">({formatAbsolute(entry.lockedUntil)})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-3">
          Sperren werden beim Server-Neustart zurückgesetzt
        </p>
      </CardContent>
    </Card>
  )
}

// ── Daten Tab ─────────────────────────────────────────────────────────────────

function DataTab() {
  const qc = useQueryClient()
  const statsQ    = useDbStats()
  const settingsQ = useAppSettings()
  const stats     = statsQ.data
  const settings  = settingsQ.data

  const [eventsRetention,    setEventsRetention]    = useState<string | null>(null)
  const [metricsRetention,   setMetricsRetention]   = useState<string | null>(null)
  const [snapshotRetention,  setSnapshotRetention]  = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Use server values as defaults when loaded
  const evVal  = eventsRetention   ?? settings?.events_retention_days    ?? '30'
  const meVal  = metricsRetention  ?? settings?.metrics_retention_days   ?? '90'
  const snVal  = snapshotRetention ?? settings?.snapshots_retention_days ?? '14'

  // Initialize form values from server once loaded
  useEffect(() => {
    if (!settings) return
    if (eventsRetention   === null) setEventsRetention(settings.events_retention_days)
    if (metricsRetention  === null) setMetricsRetention(settings.metrics_retention_days)
    if (snapshotRetention === null) setSnapshotRetention(settings.snapshots_retention_days)
  }, [settings])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    try {
      await api.updateAppSettings({
        events_retention_days:    evVal,
        metrics_retention_days:   meVal,
        snapshots_retention_days: snVal,
      })
      setSaveMsg({ text: 'Einstellungen gespeichert', ok: true })
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['history', 'stats'] })
    } catch (err) {
      setSaveMsg({ text: err instanceof Error ? err.message : 'Fehler beim Speichern', ok: false })
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  return (
    <div className="space-y-4">
      {/* DB stats card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Datenbank-Status
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                SQLite · {stats ? formatBytes(stats.fileSizeBytes) : '…'}
              </CardDescription>
            </div>
            <Button
              variant="outline" size="sm" className="h-7 text-xs gap-1.5"
              onClick={() => { statsQ.refetch(); settingsQ.refetch() }}
              disabled={statsQ.isFetching}
            >
              <RefreshCw className={`h-3 w-3 ${statsQ.isFetching ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                <FileText className="h-3 w-3" />
                Ereignisse
              </div>
              <div className="text-xl font-bold">{stats?.eventCount?.toLocaleString('de') ?? '—'}</div>
              {stats?.oldestEventAt && (
                <div className="text-[10px] text-muted-foreground">
                  seit {new Date(stats.oldestEventAt).toLocaleDateString('de-DE')}
                </div>
              )}
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                <Cpu className="h-3 w-3" />
                Metriken-Einträge
              </div>
              <div className="text-xl font-bold">{stats?.metricsCount?.toLocaleString('de') ?? '—'}</div>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                <BellIcon className="h-3 w-3" />
                Benachrichtigungen
              </div>
              <div className="text-xl font-bold">{stats?.notifCount?.toLocaleString('de') ?? '—'}</div>
              {(stats?.unreadCount ?? 0) > 0 && (
                <div className="text-[10px] text-blue-400">{stats?.unreadCount} ungelesen</div>
              )}
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-xs text-muted-foreground mb-0.5">Bekannte Geräte</div>
              <div className="text-xl font-bold">{stats?.knownDeviceCount?.toLocaleString('de') ?? '—'}</div>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-xs text-muted-foreground mb-0.5">Audit-Log</div>
              <div className="text-xl font-bold">{stats?.auditCount?.toLocaleString('de') ?? '—'}</div>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-xs text-muted-foreground mb-0.5">DB-Größe</div>
              <div className="text-xl font-bold">{stats ? formatBytes(stats.fileSizeBytes) : '—'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retention settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Aufbewahrungsfristen
          </CardTitle>
          <CardDescription className="text-xs">
            Ältere Einträge werden beim nächsten Ingestion-Zyklus automatisch gelöscht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4 max-w-sm">
            {settingsQ.isLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Einstellungen werden geladen…
              </p>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Log-Ereignisse aufbewahren (Tage)</label>
              <Input
                type="number" min={1} max={365}
                value={evVal}
                onChange={e => setEventsRetention(e.target.value)}
                className="h-8 text-sm w-32"
              />
              <p className="text-[10px] text-muted-foreground">Standard: 30 · Min: 1 · Max: 365</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Metriken aufbewahren (Tage)</label>
              <Input
                type="number" min={7} max={730}
                value={meVal}
                onChange={e => setMetricsRetention(e.target.value)}
                className="h-8 text-sm w-32"
              />
              <p className="text-[10px] text-muted-foreground">Standard: 90 · Min: 7 · Max: 730</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Client-Snapshots aufbewahren (Tage)</label>
              <Input
                type="number" min={1} max={90}
                value={snVal}
                onChange={e => setSnapshotRetention(e.target.value)}
                className="h-8 text-sm w-32"
              />
              <p className="text-[10px] text-muted-foreground">Standard: 14 · Min: 1 · Max: 90</p>
            </div>

            {saveMsg && (
              <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                saveMsg.ok
                  ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-600'
              }`}>
                {saveMsg.ok
                  ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                {saveMsg.text}
              </div>
            )}

            <Button type="submit" size="sm" disabled={saving || settingsQ.isLoading}>
              {saving
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Wird gespeichert…</>
                : <><Save className="h-3.5 w-3.5" />Speichern</>
              }
            </Button>
          </form>
        </CardContent>
      </Card>
      {/* Purge section */}
      <PurgeCard />
    </div>
  )
}

// ── Purge card ────────────────────────────────────────────────────────────────

function PurgeCard() {
  const qc = useQueryClient()
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<PurgeResult | null>(null)

  const purgeMut = useMutation({
    mutationFn: api.purgeData,
    onSuccess: (data) => {
      setResult(data)
      setShowConfirm(false)
      qc.invalidateQueries({ queryKey: ['history', 'stats'] })
    },
    onError: () => setShowConfirm(false),
  })

  const total = result
    ? result.eventsDeleted + result.metricsDeleted + result.clientSnapsDeleted + result.deviceSnapsDeleted + result.notifDeleted
    : 0

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-orange-400" />
            Daten bereinigen
          </CardTitle>
          <CardDescription className="text-xs">
            Löscht alle Einträge, die älter als die konfigurierten Aufbewahrungsfristen sind.
            Firewall-Regeln und Einstellungen werden nicht berührt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result && (
            <div className="mb-3 text-xs text-green-500 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              {total} Datensätze gelöscht
              {result.eventsDeleted > 0 && ` · ${result.eventsDeleted} Events`}
              {result.metricsDeleted > 0 && ` · ${result.metricsDeleted} Metriken`}
              {(result.clientSnapsDeleted + result.deviceSnapsDeleted) > 0
                && ` · ${result.clientSnapsDeleted + result.deviceSnapsDeleted} Snapshots`}
              {result.notifDeleted > 0 && ` · ${result.notifDeleted} Benachrichtigungen`}
            </div>
          )}
          {purgeMut.isError && (
            <div className="mb-3 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {(purgeMut.error as Error)?.message ?? 'Fehler beim Bereinigen'}
            </div>
          )}
          <Button
            variant="outline" size="sm"
            className="border-orange-500/40 text-orange-400 hover:text-orange-300 hover:border-orange-500"
            onClick={() => setShowConfirm(true)}
            disabled={purgeMut.isPending}
          >
            <Trash2 className="h-4 w-4" />
            {purgeMut.isPending ? 'Bereinige…' : 'Daten jetzt bereinigen'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daten bereinigen?</DialogTitle>
            <DialogDescription>
              Alle Events, Metriken und Snapshots, die älter als die konfigurierten
              Aufbewahrungsfristen sind, werden unwiderruflich gelöscht.
              Bereits gelesene Benachrichtigungen älter als 7 Tage werden ebenfalls entfernt.
              Dieser Vorgang kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Abbrechen</Button>
            <Button
              variant="destructive"
              onClick={() => purgeMut.mutate()}
              disabled={purgeMut.isPending}
            >
              <Trash2 className="h-4 w-4" />
              {purgeMut.isPending ? 'Lösche…' : 'Bereinigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Audit log tab ─────────────────────────────────────────────────────────────

const AUDIT_PAGE = 50

function AuditTab() {
  const [page, setPage] = useState(0)
  const auditQ = useAuditLog({ limit: AUDIT_PAGE, offset: page * AUDIT_PAGE })
  const entries: AuditLogEntry[] = auditQ.data?.items ?? []
  const total   = auditQ.data?.total ?? 0
  const pages   = Math.max(1, Math.ceil(total / AUDIT_PAGE))

  function actionLabel(action: string) {
    const map: Record<string, string> = {
      firewall_toggle: 'Firewall-Regel geändert',
      purge:           'Daten bereinigt',
      config_save:     'Konfiguration gespeichert',
      config_delete:   'Konfiguration gelöscht',
    }
    return map[action] ?? action
  }
  function actionColor(action: string) {
    if (action === 'purge') return 'text-orange-400'
    if (action.includes('delete')) return 'text-red-400'
    if (action.includes('toggle') || action.includes('save')) return 'text-blue-400'
    return 'text-muted-foreground'
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit-Log
          </CardTitle>
          <CardDescription className="text-xs">
            Aufzeichnung aller Konfigurations- und Firewall-Änderungen · {total} Einträge gesamt
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {auditQ.isLoading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              </div>
            ))}
            {entries.map(e => (
              <div key={e.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                <div className="shrink-0 mt-0.5 min-w-[160px]">
                  <div className={`text-xs font-semibold ${actionColor(e.action)}`}>
                    {actionLabel(e.action)}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {new Date(e.timestamp).toLocaleString('de-DE')}
                    {e.userIp ? ` · ${e.userIp}` : ''}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {e.entityName && (
                    <span className="text-xs font-medium">{e.entityName}</span>
                  )}
                  {e.oldValue !== null && e.newValue !== null && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      <span className="text-red-400">{e.oldValue}</span>
                      {' → '}
                      <span className="text-green-400">{e.newValue}</span>
                    </div>
                  )}
                  {e.newValue !== null && e.oldValue === null && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                      {e.newValue.length > 120 ? `${e.newValue.slice(0, 120)}…` : e.newValue}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!auditQ.isLoading && entries.length === 0 && (
              <div className="py-16 text-center text-muted-foreground text-sm">
                Noch keine Audit-Einträge vorhanden.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />Zurück
          </Button>
          <span className="text-xs text-muted-foreground">Seite {page + 1} / {pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>
            Weiter<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Reusable toggle switch ────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        checked ? 'bg-green-500' : 'bg-muted'
      }`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// ── Generic boolean-settings tab (Phase 4) ───────────────────────────────────

function SettingsToggleTab<T extends { [K in keyof T]: boolean }>({
  data,
  isLoading,
  isError,
  mutationFn,
  queryKey,
  defaults,
  items,
  title,
  titleIcon,
  description,
  successMsg,
}: {
  data:        T | undefined
  isLoading:   boolean
  isError:     boolean
  mutationFn:  (s: Partial<T>) => Promise<{ ok: boolean }>
  queryKey:    unknown[]
  defaults:    T
  items:       Array<{ key: keyof T & string; label: string; desc: string }>
  title:       string
  titleIcon:   React.ReactNode
  description: string
  successMsg:  string
}) {
  const qc       = useQueryClient()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [local,   setLocal]   = useState<T | null>(null)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Seed local from server data on first arrival; functional form avoids adding
  // `local` to the dep array while still reading the latest committed state.
  useEffect(() => {
    if (data) setLocal(prev => prev ?? data)
  }, [data])

  // Clear any pending banner timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const current = local ?? data ?? defaults

  function toggle(key: keyof T) {
    setLocal(prev => ({ ...(prev ?? current), [key]: !(prev ?? current)[key] } as T))
  }

  const saveMut = useMutation({
    mutationFn,
    onSuccess: () => {
      setSaveMsg({ text: successMsg, ok: true })
      // Reset local so the next data arrival (from the invalidation refetch)
      // re-seeds the UI from what the server actually stored.
      // TanStack keeps stale data in the cache during refetch, so `current`
      // falls back to the old `data` — not to `defaults` — until fresh data arrives.
      setLocal(null)
      qc.invalidateQueries({ queryKey })
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setSaveMsg(null), 3000)
    },
    onError: (err) => setSaveMsg({
      text: err instanceof Error ? err.message : 'Fehler beim Speichern', ok: false,
    }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {titleIcon}
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin" />Einstellungen werden geladen…
          </p>
        )}
        {isError && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Einstellungen konnten nicht geladen werden
          </div>
        )}
        {items.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
            <ToggleSwitch checked={current[key]} onChange={() => toggle(key)} />
          </div>
        ))}

        {saveMsg && (
          <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
            saveMsg.ok
              ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-600'
          }`}>
            {saveMsg.ok
              ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
            {saveMsg.text}
          </div>
        )}

        <Button
          size="sm"
          onClick={() => saveMut.mutate(current)}
          disabled={saveMut.isPending || isLoading || isError}
        >
          {saveMut.isPending
            ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Wird gespeichert…</>
            : <><Save className="h-4 w-4" />Konfiguration speichern</>}
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Security tab (Phase 4) ────────────────────────────────────────────────────

function SecurityTab() {
  const { data, isLoading, isError } = useSecuritySettings()
  return (
    <SettingsToggleTab<SecuritySettings>
      data={data} isLoading={isLoading} isError={isError}
      mutationFn={api.updateSecuritySettings}
      queryKey={['settings', 'security']}
      defaults={SECURITY_DEFAULTS}
      items={SECURITY_ITEMS}
      title="Zero Trust Konfiguration"
      titleIcon={<Shield className="h-4 w-4" />}
      description="Parameter für die Policy Engine · Änderungen werden im Audit-Log protokolliert"
      successMsg="Konfiguration gespeichert"
    />
  )
}

// ── Notifications tab (Phase 4) ───────────────────────────────────────────────

function NotificationsTab() {
  const { data, isLoading, isError } = useNotificationSettings()
  return (
    <SettingsToggleTab<NotificationSettings>
      data={data} isLoading={isLoading} isError={isError}
      mutationFn={api.updateNotificationSettings}
      queryKey={['settings', 'notifications']}
      defaults={NOTIFICATION_DEFAULTS}
      items={NOTIFICATION_ITEMS}
      title="Alert-Schwellwerte"
      titleIcon={<Bell className="h-4 w-4" />}
      description="Steuerung wann und wie du benachrichtigt wirst"
      successMsg="Benachrichtigungen gespeichert"
    />
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const { font, faviconDataUrl, setFont, setFavicon } = useAppearanceStore()
  const { theme, setTheme } = useThemeStore()
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
    e.target.value = ''
  }

  function resetFavicon() {
    setFavicon(null)
    applyFavicon(null)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Plattform-Konfiguration</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Allgemein</TabsTrigger>
          <TabsTrigger value="security">Sicherheit</TabsTrigger>
          <TabsTrigger value="notifications">Benachrichtigungen</TabsTrigger>
          <TabsTrigger value="data">Daten</TabsTrigger>
          <TabsTrigger value="audit">Audit-Log</TabsTrigger>
        </TabsList>

        {/* ── Allgemein ── */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Erscheinungsbild
              </CardTitle>
              <CardDescription className="text-xs">
                Farbschema, Schriftart und Favicon werden im Browser gespeichert und sofort angewendet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Theme toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Farbschema</div>
                  <div className="text-xs text-muted-foreground">
                    {theme === 'dark' ? 'Dark Mode aktiv' : 'Light Mode aktiv'}
                  </div>
                </div>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`relative w-14 h-7 rounded-full transition-colors flex items-center px-1 ${
                    theme === 'dark' ? 'bg-primary' : 'bg-muted border'
                  }`}
                  aria-label="Theme umschalten"
                >
                  <span className={`w-5 h-5 rounded-full bg-background shadow flex items-center justify-center transition-transform duration-200 ${
                    theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
                  }`}>
                    {theme === 'dark'
                      ? <Moon className="h-3 w-3 text-foreground" />
                      : <Sun className="h-3 w-3 text-foreground" />
                    }
                  </span>
                </button>
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
                    {faviconDataUrl ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs gap-1.5 text-muted-foreground"
                        onClick={resetFavicon}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Standard wiederherstellen
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Standard-Favicon aktiv</span>
                    )}
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
          {/* ── Administrator card ── */}
          <AdminPasswordCard />

          {/* ── Blocked IPs card ── */}
          <BlockedIpsCard />

        </TabsContent>

        {/* ── Sicherheit ── */}
        <TabsContent value="security" className="mt-4">
          <SecurityTab />
        </TabsContent>

        {/* ── Benachrichtigungen ── */}
        <TabsContent value="notifications" className="mt-4">
          <NotificationsTab />
        </TabsContent>

        {/* ── Daten ── */}
        <TabsContent value="data" className="mt-4">
          <DataTab />
        </TabsContent>

        {/* ── Audit-Log ── */}
        <TabsContent value="audit" className="mt-4">
          <AuditTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
