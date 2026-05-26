/**
 * Zustand store for global connection state
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConnectionState {
  configured: boolean
  url: string
  username: string
  site: string
  setConnected: (url: string, username: string, site: string) => void
  setDisconnected: () => void
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      configured: false,
      url: '',
      username: '',
      site: 'default',
      setConnected: (url, username, site) => set({ configured: true, url, username, site }),
      setDisconnected: () => set({ configured: false, url: '', username: '', site: 'default' }),
    }),
    { name: 'unirule-connection' }
  )
)
