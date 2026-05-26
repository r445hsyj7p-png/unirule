import { useState } from 'react'
import { Eye, EyeOff, Shield, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/authApi'
import { useAuthStore } from '@/lib/authStore'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Mindestens 8 Zeichen', ok: password.length >= 8 },
    { label: 'Großbuchstabe',        ok: /[A-Z]/.test(password) },
    { label: 'Zahl oder Sonderzeichen', ok: /[\d\W]/.test(password) },
  ]
  if (!password) return null
  return (
    <div className="space-y-1 mt-2">
      {checks.map(c => (
        <div key={c.label} className={`flex items-center gap-2 text-xs ${c.ok ? 'text-green-500' : 'text-muted-foreground'}`}>
          <Check className={`h-3 w-3 ${c.ok ? 'opacity-100' : 'opacity-30'}`} />
          {c.label}
        </div>
      ))}
    </div>
  )
}

export default function Setup() {
  const setAuthenticated = useAuthStore(s => s.setAuthenticated)
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const passwordsMatch = password === confirm
  const canSubmit = username.trim().length >= 2 && password.length >= 8 && passwordsMatch && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const res = await authApi.setup(username.trim(), password)
      setAuthenticated(res.username)
    } catch (err) {
      const e = err as { message?: string }
      setError(e.message ?? 'Setup fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Brand */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Unirule</span>
          </div>
          <h1 className="text-lg font-semibold">Willkommen bei Unirule</h1>
          <p className="text-sm text-muted-foreground">
            Richte deinen Administrator-Account ein, um zu beginnen.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Schritt 1 von 1</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="username">Benutzername</label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="z.B. admin"
              className="h-10"
              disabled={loading}
            />
            {username.trim().length > 0 && username.trim().length < 2 && (
              <p className="text-xs text-destructive">Mindestens 2 Zeichen erforderlich.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">Passwort</label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="confirm">Passwort bestätigen</label>
            <Input
              id="confirm"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="h-10"
              disabled={loading}
            />
            {confirm.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive">Passwörter stimmen nicht überein.</p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-10" disabled={!canSubmit}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Setup abschließen & Anmelden'}
          </Button>
        </form>
      </div>
    </div>
  )
}
