import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { router } from '@/router'
import { queryClient } from '@/lib/queryClient'
import { useAppearanceStore, applyFont, applyFavicon } from '@/lib/appearanceStore'
import { useThemeStore } from '@/lib/themeStore'
import { AuthGuard } from '@/components/AuthGuard'

/** Applies theme class (dark/light) to <html> on mount and on change. */
function ThemeApplier() {
  const theme = useThemeStore(s => s.theme)
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
  }, [theme])
  return null
}

/** Applies font + favicon from persisted store on mount and on every change. */
function AppearanceApplier() {
  const font           = useAppearanceStore(s => s.font)
  const faviconDataUrl = useAppearanceStore(s => s.faviconDataUrl)
  useEffect(() => { applyFont(font) },           [font])
  useEffect(() => { applyFavicon(faviconDataUrl) }, [faviconDataUrl])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      <AppearanceApplier />
      <AuthGuard>
        <RouterProvider router={router} />
      </AuthGuard>
    </QueryClientProvider>
  )
}
