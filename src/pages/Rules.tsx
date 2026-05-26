import { useState } from 'react'
import {
  Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Loader2, Play,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useFirewallRules } from '@/hooks/useUnifi'
import { useConnectionStore } from '@/lib/store'
import { DataState, RowSkeleton } from '@/components/ui/empty-state'
import { api, type UnifiRuleRow } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SimulationPanel } from '@/components/SimulationPanel'

// ── Toggle confirmation dialog ────────────────────────────────────────────────

interface ToggleDialogProps {
  rule: UnifiRuleRow | null
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
  rulesData: UnifiRuleRow[]
}

function ToggleDialog({ rule, onConfirm, onCancel, isPending, rulesData }: ToggleDialogProps) {
  if (!rule) return null
  const willEnable = !rule.enabled
  const action = willEnable ? 'aktivieren' : 'deaktivieren'
  const actionTitle = willEnable ? 'Aktivieren' : 'Deaktivieren'

  return (
    <Dialog open={Boolean(rule)} onOpenChange={v => { if (!v) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Firewall-Regel {action}</DialogTitle>
          <DialogDescription>
            Bitte bestätige die Änderung an der folgenden Regel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <span className="font-mono text-sm font-medium">{rule.name}</span>
            <div className="text-xs text-muted-foreground mt-0.5">
              {rule.ruleset} · {rule.action.toUpperCase()} · {rule.srcAddress || 'any'} → {rule.dstAddress || 'any'}
            </div>
          </div>

          {willEnable ? (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              Regel wird sofort aktiv.
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Deaktivieren kann Sicherheitslücken öffnen.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Abbrechen
          </Button>
          <Button
            size="sm"
            disabled={isPending}
            className={willEnable
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'}
            onClick={onConfirm}
          >
            {isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Wird gespeichert…</>
              : actionTitle
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Rules() {
  const configured = useConnectionStore(s => s.configured)
  const { data, isLoading, isError, error, refetch } = useFirewallRules()
  const queryClient = useQueryClient()

  const [pendingToggle, setPendingToggle] = useState<UnifiRuleRow | null>(null)
  const [simulationOpen, setSimulationOpen] = useState(false)
  const [optimisticState, setOptimisticState] = useState<Record<string, boolean>>({})
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.toggleFirewallRule(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifi', 'firewall'] })
      showToast('Regel erfolgreich geändert', true)
    },
    onError: (_err, vars) => {
      // Revert optimistic state
      setOptimisticState(prev => {
        const next = { ...prev }
        delete next[vars.id]
        return next
      })
      showToast('Fehler beim Ändern der Regel', false)
    },
  })

  function showToast(text: string, ok: boolean) {
    setToastMsg({ text, ok })
    setTimeout(() => setToastMsg(null), 3000)
  }

  function requestToggle(rule: UnifiRuleRow) {
    setPendingToggle(rule)
  }

  function confirmToggle() {
    if (!pendingToggle) return
    const newEnabled = !pendingToggle.enabled
    // Apply optimistic update
    setOptimisticState(prev => ({ ...prev, [pendingToggle.id]: newEnabled }))
    setPendingToggle(null)
    toggleMutation.mutate({ id: pendingToggle.id, enabled: newEnabled })
  }

  const rules = data ?? []

  // Merge optimistic state into display rules
  const displayRules = rules.map(r =>
    r.id in optimisticState ? { ...r, enabled: optimisticState[r.id] } : r
  )

  const enabled  = displayRules.filter(r => r.enabled).length
  const disabled = displayRules.length - enabled

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
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
          <Button variant="outline" size="sm" onClick={() => setSimulationOpen(true)}>
            <Play className="h-4 w-4" />Simulation
          </Button>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg transition-all ${
          toastMsg.ok
            ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
        }`}>
          {toastMsg.ok
            ? <CheckCircle className="h-4 w-4 shrink-0" />
            : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {toastMsg.text}
        </div>
      )}

      {!configured ? (
        <DataState notConfigured />
      ) : isError ? (
        <DataState isError errorMessage={(error as Error)?.message} onRetry={() => refetch()} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <div className="text-xl font-bold text-green-500">{enabled}</div>
                <div className="text-xs text-muted-foreground">Aktiv</div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-6 w-6 text-gray-400" />
              <div>
                <div className="text-xl font-bold">{disabled}</div>
                <div className="text-xs text-muted-foreground">Deaktiviert</div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <div>
                <div className="text-xl font-bold text-yellow-500">
                  {displayRules.filter(r => !r.enabled).length}
                </div>
                <div className="text-xs text-muted-foreground">Nicht aktiv</div>
              </div>
            </CardContent></Card>
          </div>

          {/* Table */}
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
                    displayRules.map(rule => {
                      const isToggling = toggleMutation.isPending &&
                        toggleMutation.variables?.id === rule.id

                      return (
                        <tr
                          key={rule.id}
                          className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${!rule.enabled ? 'opacity-50' : ''}`}
                        >
                          <td className="px-4 py-3">
                            {isToggling
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              : <div className={`w-2 h-2 rounded-full ${rule.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                            }
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-medium">{rule.name}</td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] border ${
                              rule.action === 'accept' || rule.action === 'allow'
                                ? 'text-green-500 bg-green-500/10 border-green-500/20'
                                : 'text-red-500 bg-red-500/10 border-red-500/20'
                            }`}>
                              {rule.action.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-32 truncate">
                            {rule.srcAddress || 'any'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-32 truncate">
                            {rule.dstAddress || 'any'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {rule.dstPort && rule.dstPort !== 'any'
                              ? `${rule.dstPort}/${rule.protocol}`
                              : <span className="text-muted-foreground">any</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{rule.ruleset}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2 text-muted-foreground"
                                disabled={isToggling || toggleMutation.isPending}
                                onClick={() => requestToggle(rule)}
                              >
                                {isToggling
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : rule.enabled ? 'Deakt.' : 'Akt.'
                                }
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                title="Simulation"
                                onClick={() => setSimulationOpen(true)}
                              >
                                <Shield className="h-3 w-3" />
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

      {/* Toggle confirmation dialog */}
      <ToggleDialog
        rule={pendingToggle}
        onConfirm={confirmToggle}
        onCancel={() => setPendingToggle(null)}
        isPending={toggleMutation.isPending}
        rulesData={rules}
      />

      {/* Simulation panel */}
      <SimulationPanel
        open={simulationOpen}
        onClose={() => setSimulationOpen(false)}
        rulesData={rules}
      />
    </div>
  )
}
