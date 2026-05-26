import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from '@/router'
import { useEffect } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000, gcTime: 5 * 60 * 1000 },
  },
})

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
