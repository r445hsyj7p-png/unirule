/**
 * AuthGuard — wraps the entire app.
 *
 * On mount: calls /api/auth/status to determine state.
 * Renders:
 *   - Loading spinner while checking
 *   - <Setup /> if not configured
 *   - <Login /> if configured but not authenticated
 *   - children if authenticated
 */
import { useEffect } from 'react'
import { Shield } from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { authApi } from '@/lib/authApi'
import Login from '@/pages/Login'
import Setup from '@/pages/Setup'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { checked, configured, authenticated, setStatus } = useAuthStore()

  useEffect(() => {
    authApi.status()
      .then(s => setStatus(s))
      .catch(() => setStatus({ configured: false, authenticated: false, username: null }))
  }, [setStatus])

  if (!checked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-sm animate-pulse">Unirule wird geladen…</div>
        </div>
      </div>
    )
  }

  if (!configured) return <Setup />
  if (!authenticated) return <Login />
  return <>{children}</>
}
