import { createBrowserRouter } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import NetworkMap from '@/pages/NetworkMap'
import Threats from '@/pages/Threats'
import Policies from '@/pages/Policies'
import Rules from '@/pages/Rules'
import Devices from '@/pages/Devices'
import Zones from '@/pages/Zones'
import LogExplorer from '@/pages/LogExplorer'
import Integrations from '@/pages/Integrations'
import Settings from '@/pages/Settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'network-map', element: <NetworkMap /> },
      { path: 'threats', element: <Threats /> },
      { path: 'policies', element: <Policies /> },
      { path: 'rules', element: <Rules /> },
      { path: 'devices', element: <Devices /> },
      { path: 'zones', element: <Zones /> },
      { path: 'logs', element: <LogExplorer /> },
      { path: 'integrations', element: <Integrations /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])
