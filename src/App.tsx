import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function App() {
  const { session, loading, signOut } = useAuth()
  const navigate = useNavigate()

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="font-mono font-bold mr-5 tracking-tight">
            <span className="text-green-400">Alpha</span>
            <span className="text-slate-100">Tracker</span>
          </span>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isActive ? 'text-green-400 bg-green-400/10' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/operacoes"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isActive ? 'text-green-400 bg-green-400/10' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`
            }
          >
            Operações
          </NavLink>
          <NavLink
            to="/casas"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isActive ? 'text-green-400 bg-green-400/10' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`
            }
          >
            Casas
          </NavLink>
          <NavLink
            to="/parceiros"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isActive ? 'text-green-400 bg-green-400/10' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`
            }
          >
            Parceiros
          </NavLink>
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Sair
        </button>
      </nav>
      <Outlet />
    </div>
  )
}
