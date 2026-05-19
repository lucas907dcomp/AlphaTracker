import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const { signIn, signUp, session } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        toast.error(error.message)
      } else {
        navigate('/dashboard', { replace: true })
      }
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Conta criada! Fazendo login...')
        const { error: loginError } = await signIn(email, password)
        if (!loginError) navigate('/dashboard', { replace: true })
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-mono font-bold text-2xl tracking-tight">
            <span className="text-green-400">Alpha</span>
            <span className="text-slate-100">Tracker</span>
          </span>
          <p className="text-slate-500 text-sm mt-1">Matched Betting Tracker</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
            <Button type="submit" loading={loading} className="w-full mt-2">
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
          <p className="text-sm text-center text-slate-500">
            {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              {mode === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
