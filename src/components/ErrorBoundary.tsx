import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-red-900/50 rounded-xl p-6 max-w-md w-full space-y-3">
            <p className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">Erro inesperado</p>
            <p className="text-sm text-slate-400">
              Algo deu errado. Recarregue a página para continuar.
            </p>
            {this.state.error && (
              <p className="text-xs font-mono text-slate-600 break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-mono text-slate-400 hover:text-slate-100 border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded transition-colors"
            >
              Recarregar →
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
