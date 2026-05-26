import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { router } from '@/router'
import { queryClient } from '@/lib/queryClient'

function ThemeInitializer() {
  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'dark'
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(stored)
  }, [])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
