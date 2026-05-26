import { useState, useEffect } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, HelpCircle, Info,
  ChevronRight, X, Loader2, Play, MinusCircle,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, type SimulationResult, type TraceEntry, type SimulateParams, type UnifiRuleRow } from '@/lib/api'

// ── Verdict Badge ─────────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: SimulationResult['verdict'] }) {
  const map = {
    ALLOW:     { cls: 'bg-green-500/15 text-green-600 border-green-500/30',  icon: <CheckCircle2 className="h-4 w-4" />, label: 'ALLOW' },
    DROP:      { cls: 'bg-red-500/15 text-red-600 border-red-500/30',        icon: <XCircle className="h-4 w-4" />,      label: 'DROP' },
    REJECT:    { cls: 'bg-orange-500/15 text-orange-600 border-orange-500/30', icon: <AlertTriangle className="h-4 w-4" />, label: 'REJECT' },
    UNCERTAIN: { cls: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30', icon: <HelpCircle className="h-4 w-4" />,  label: 'UNCERTAIN' },
  }
  const { cls, icon, label } = map[verdict]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold ${cls}`}>
      {icon}{label}
    </span>
  )
}

// ── Trace Row ─────────────────────────────────────────────────────────────────

function TraceRow({ entry, isMatched }: { entry: TraceEntry; isMatched: boolean }) {
  const iconMap = {
    'match':         <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />,
    'skip':          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />,
    'skip-disabled': <MinusCircle className="h-3.5 w-3.5 text-gray-400 shrink-0" />,
  }

  return (
    <tr className={`border-b last:border-0 transition-colors ${
      isMatched ? 'bg-green-500/5' : ''
    } ${entry.isImplicit ? 'opacity-60' : ''}`}>
      <td className="px-3 py-2">{iconMap[entry.action]}</td>
      <td className="px-3 py-2 font-mono text-xs">
        <span className={isMatched ? 'font-semibold' : ''}>{entry.ruleName}</span>
        {entry.isImplicit && (
          <Badge className="ml-1.5 text-[9px] border border-muted-foreground/30 bg-transparent text-muted-foreground px-1 py-0">
            implicit
          </Badge>
        )}
        {entry.implicitSource && (
          <span className="ml-1 text-[10px] text-muted-foreground">({entry.implicitSource})</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{entry.skipReason ?? ''}</td>
    </tr>
  )
}

// ── Result Display ────────────────────────────────────────────────────────────

function SimResult({ result, label }: { result: SimulationResult; label?: string }) {
  const matchName = result.matchedRule?.name ?? 'Default Deny'

  return (
    <div className="space-y-3">
      {label && <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>}
      <div className="flex items-center gap-3 flex-wrap">
        <VerdictBadge verdict={result.verdict} />
        <span className="text-xs text-muted-foreground">
          Gematchte Regel: <span className="font-mono text-foreground">{matchName}</span>
        </span>
      </div>

      {result.trace.length > 0 && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left w-8"></th>
                <th className="px-3 py-2 text-left font-medium">Regel</th>
                <th className="px-3 py-2 text-left font-medium">Grund</th>
              </tr>
            </thead>
            <tbody>
              {result.trace.map(entry => (
                <TraceRow
                  key={entry.ruleId}
                  entry={entry}
                  isMatched={entry.action === 'match'}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.caveats.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-muted bg-muted/20 px-3 py-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            {result.caveats.map((c, i) => (
              <p key={i} className="text-[11px] text-muted-foreground">{c}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SimulationPanelProps {
  open: boolean
  onClose: () => void
  previewRule?: { id: string; enabled: boolean }
  rulesData?: UnifiRuleRow[]
}

// ── Main component ────────────────────────────────────────────────────────────

export function SimulationPanel({ open, onClose, previewRule, rulesData }: SimulationPanelProps) {
  const [srcIp, setSrcIp] = useState('')
  const [dstIp, setDstIp] = useState('')
  const [dstPort, setDstPort] = useState('')
  const [proto, setProto] = useState<'tcp' | 'udp' | 'icmp' | 'all'>('tcp')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultCurrent, setResultCurrent] = useState<SimulationResult | null>(null)
  const [resultToggled, setResultToggled] = useState<SimulationResult | null>(null)

  // Pre-fill IPs from rule context
  useEffect(() => {
    if (previewRule && rulesData) {
      const rule = rulesData.find(r => r.id === previewRule.id)
      if (rule) {
        if (rule.srcAddress && rule.srcAddress !== 'any' && !rule.srcAddress.includes(',')) {
          setSrcIp(rule.srcAddress.split('/')[0])
        }
        if (rule.dstAddress && rule.dstAddress !== 'any' && !rule.dstAddress.includes(',')) {
          setDstIp(rule.dstAddress.split('/')[0])
        }
      }
    }
  }, [previewRule, rulesData])

  async function runSimulation() {
    if (!srcIp.trim() || !dstIp.trim()) return
    setLoading(true)
    setError(null)
    setResultCurrent(null)
    setResultToggled(null)

    const baseParams: SimulateParams = {
      srcIp: srcIp.trim(),
      dstIp: dstIp.trim(),
      dstPort: dstPort ? parseInt(dstPort, 10) : undefined,
      proto,
    }

    try {
      if (previewRule) {
        // Run two simulations: current state and toggled state
        const [current, toggled] = await Promise.all([
          api.simulatePacket(baseParams),
          api.simulatePacket({
            ...baseParams,
            hypotheticalRules: [{ id: previewRule.id, enabled: !previewRule.enabled }],
          }),
        ])
        setResultCurrent(current)
        setResultToggled(toggled)
      } else {
        const result = await api.simulatePacket(baseParams)
        setResultCurrent(result)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const canRun = srcIp.trim().length > 0 && dstIp.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent
        className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-0"
        // Override the default centered positioning to slide in from the right
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              <DialogTitle className="text-base">Paket-Simulation</DialogTitle>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground bg-muted rounded px-2 py-0.5">
                Simuliert lokale Regelprüfung
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Simuliert die Firewall-Regelauswertung für ein hypothetisches Paket.
            Physikalische Netzwerktopologie wird nicht berücksichtigt.
          </p>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Form */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Quell-IP</label>
              <Input
                value={srcIp}
                onChange={e => setSrcIp(e.target.value)}
                placeholder="z.B. 192.168.20.5"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Ziel-IP</label>
              <Input
                value={dstIp}
                onChange={e => setDstIp(e.target.value)}
                placeholder="z.B. 192.168.10.20"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Port <span className="text-muted-foreground">(optional)</span></label>
              <Input
                type="number"
                value={dstPort}
                onChange={e => setDstPort(e.target.value)}
                placeholder="z.B. 443"
                min={1}
                max={65535}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Protokoll</label>
              <Select value={proto} onValueChange={v => setProto(v as typeof proto)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="udp">UDP</SelectItem>
                  <SelectItem value="icmp">ICMP</SelectItem>
                  <SelectItem value="all">Alle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {previewRule && (
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
              <Info className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                Vor/Nach-Vergleich aktiv — Regel wird hypothetisch{' '}
                <span className="font-semibold">{previewRule.enabled ? 'deaktiviert' : 'aktiviert'}</span>.
              </span>
            </div>
          )}

          <Button
            onClick={runSimulation}
            disabled={!canRun || loading}
            className="w-full"
            size="sm"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Simuliere…</>
              : <><Play className="h-4 w-4" />Simulation starten</>
            }
          </Button>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Results */}
          {resultCurrent && !previewRule && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ergebnis</div>
              <SimResult result={resultCurrent} />
            </div>
          )}

          {resultCurrent && resultToggled && previewRule && (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vor/Nach Vergleich</div>
              <div className="space-y-4">
                <div className="rounded-md border p-3 space-y-3">
                  <SimResult result={resultCurrent} label="Aktuell" />
                </div>
                <div className="rounded-md border p-3 space-y-3">
                  <SimResult result={resultToggled} label={previewRule.enabled ? 'Nach Deaktivierung' : 'Nach Aktivierung'} />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogClose asChild>
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Schließen</span>
          </button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
