import { useNavigate } from 'react-router-dom'
import { WifiOff, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  isLoading?: boolean
  isError?: boolean
  notConfigured?: boolean
  errorMessage?: string
  onRetry?: () => void
  empty?: boolean
  emptyText?: string
}

export function DataState({ isLoading, isError, notConfigured, errorMessage, onRetry, empty, emptyText }: Props) {
  const navigate = useNavigate()

  if (isLoading) return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-3" />
      <span className="text-sm">Lade Daten vom UniFi-Controller…</span>
    </div>
  )

  if (notConfigured) return (
    <Card className="border-dashed border-blue-500/30 bg-blue-500/5 mx-auto max-w-md mt-12">
      <CardContent className="p-8 text-center">
        <WifiOff className="h-12 w-12 mx-auto mb-4 text-blue-400/60" />
        <h3 className="font-semibold mb-2">Kein UniFi-System verbunden</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Verbinde dich mit deinem UniFi Controller um echte Daten zu sehen.
        </p>
        <Button onClick={() => navigate('/integrations')}>
          <WifiOff className="h-4 w-4" />
          Jetzt verbinden
        </Button>
      </CardContent>
    </Card>
  )

  if (isError) return (
    <Card className="border-red-500/30 bg-red-500/5 mx-auto max-w-md mt-12">
      <CardContent className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400/60" />
        <h3 className="font-semibold mb-2">Verbindungsfehler</h3>
        <p className="text-sm text-muted-foreground mb-4 font-mono">{errorMessage ?? 'Konnte keine Daten abrufen'}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />Erneut versuchen
          </Button>
        )}
      </CardContent>
    </Card>
  )

  if (empty) return (
    <div className="py-16 text-center text-muted-foreground">
      <p className="text-sm">{emptyText ?? 'Keine Daten vorhanden'}</p>
    </div>
  )

  return null
}

/** Inline spinner for table rows */
export function RowSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3 bg-muted rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
