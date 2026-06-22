import { Suspense, lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from '@/App'
import LoginPage from '@/pages/LoginPage'
import CasasPage from '@/pages/CasasPage'
import OperacoesPage from '@/pages/OperacoesPage'

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ParceirosPage = lazy(() => import('@/pages/ParceirosPage'))
const BancasPage = lazy(() => import('@/pages/BancasPage'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <App />,
    children: [
      {
        path: '/dashboard',
        element: (
          <Suspense fallback={<div className="p-4 text-slate-600 text-sm">Carregando...</div>}>
            <DashboardPage />
          </Suspense>
        ),
      },
      { path: '/casas', element: <CasasPage /> },
      {
        path: '/parceiros',
        element: (
          <Suspense fallback={<div className="p-4 text-slate-600 text-sm">Carregando...</div>}>
            <ParceirosPage />
          </Suspense>
        ),
      },
      { path: '/operacoes', element: <OperacoesPage /> },
      { path: '/operacoes/nova', element: <Navigate to="/operacoes" replace /> },
      {
        path: '/bancas',
        element: (
          <Suspense fallback={<div className="p-4 text-slate-600 text-sm">Carregando...</div>}>
            <BancasPage />
          </Suspense>
        ),
      },
    ],
  },
])
