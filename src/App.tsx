import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useFreebetsDisponiveis } from '@/hooks/useFreebetsDisponiveis'

function FreebetsBadge() {
  const { data: freebets = [] } = useFreebetsDisponiveis()
  if (freebets.length === 0) return null
  return (
    <span className="ml-0.5 bg-amber-500 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none align-middle">
      {freebets.length}
    </span>
  )
}

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
            Operações<FreebetsBadge />
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
          <NavLink
            to="/bancas"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isActive ? 'text-green-400 bg-green-400/10' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`
            }
          >
            Bancas
          </NavLink>
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/30 px-2.5 py-1 rounded transition-colors"
        >
          Sair
        </button>
      </nav>
      <Outlet />
    </div>
  )
}
