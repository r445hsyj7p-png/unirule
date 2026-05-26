/**
 * Auth state — tracks whether the user is logged in and who they are.
 * NOT persisted (HttpOnly cookie handles persistence server-side).
 */
import { create } from 'zustand'

interface AuthState {
  checked: boolean       // has /api/auth/status been called yet?
  configured: boolean    // has setup wizard been completed?
  authenticated: boolean
  username: string | null
  setStatus: (s: { configured: boolean; authenticated: boolean; username: string | null }) => void
  setAuthenticated: (username: string) => void
  setUnauthenticated: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  checked:       false,
  configured:    false,
  authenticated: false,
  username:      null,
  setStatus: ({ configured, authenticated, username }) =>
    set({ checked: true, configured, authenticated, username }),
  setAuthenticated: (username) =>
    set({ checked: true, configured: true, authenticated: true, username }),
  setUnauthenticated: () =>
    set({ authenticated: false, username: null }),
}))
