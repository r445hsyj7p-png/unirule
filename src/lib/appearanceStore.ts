/**
 * Appearance settings — font family + custom favicon.
 * Persisted to localStorage via Zustand.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FontChoice = 'geist' | 'opensans'

interface AppearanceState {
  font: FontChoice
  faviconDataUrl: string | null   // null → use default /favicon.svg
  setFont: (font: FontChoice) => void
  setFavicon: (dataUrl: string | null) => void
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      font: 'geist',
      faviconDataUrl: null,
      setFont: (font) => set({ font }),
      setFavicon: (faviconDataUrl) => set({ faviconDataUrl }),
    }),
    { name: 'unirule-appearance' },
  ),
)

// ── Helpers called from App.tsx ───────────────────────────────────────────────

export function applyFont(font: FontChoice) {
  if (font === 'opensans') {
    document.documentElement.style.setProperty('--font-sans', "'Open Sans', sans-serif")
    document.documentElement.style.setProperty('--font-mono', "'Open Sans', monospace")
  } else {
    document.documentElement.style.setProperty('--font-sans', 'Geist, sans-serif')
    document.documentElement.style.setProperty('--font-mono', "'Geist Mono', monospace")
  }
}

export function applyFavicon(dataUrl: string | null) {
  const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
  if (link) link.href = dataUrl ?? '/favicon.svg'
}
