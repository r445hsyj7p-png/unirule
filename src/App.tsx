import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { router } from '@/router'
import { queryClient } from '@/lib/queryClient'
import { useAppearanceStore, applyFont, applyFavicon } from '@/lib/appearanceStore'

function ThemeInitializer() {
  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'dark'
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(stored)
  }, [])
  return null
}

/** Applies font + favicon from persisted store on mount and on every change. */
function AppearanceApplier() {
  const font          = useAppearanceStore(s => s.font)
  const faviconDataUrl = useAppearanceStore(s => s.faviconDataUrl)

  useEffect(() => { applyFont(font) },          [font])
  useEffect(() => { applyFavicon(faviconDataUrl) }, [faviconDataUrl])

  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <AppearanceApplier />
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
