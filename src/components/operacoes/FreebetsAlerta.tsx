import { useState } from 'react'
import { useFreebetsDisponiveis } from '@/hooks/useFreebetsDisponiveis'
import type { Operacao } from '@/types'

function freebetLabel(op: Operacao): string {
  const casa = op.apostas?.[0]?.casa?.nome ?? '?'
  const date = new Date(op.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const valor = op.valor_freebet != null
    ? `R$${op.valor_freebet.toFixed(2).replace('.', ',')}`
    : null
  return [casa, date, valor].filter(Boolean).join(' — ')
}

interface Props {
  onExtrair: (operacaoOrigemId: string) => void
}

export function FreebetsAlerta({ onExtrair }: Props) {
  const [open, setOpen] = useState(true)
  const { data: freebets = [], isLoading } = useFreebetsDisponiveis()

  if (isLoading || freebets.length === 0) return null

  const totalFB = freebets.reduce((s, f) => s + (f.valor_freebet ?? 0), 0)

  return (
    <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold text-sm">⚡</span>
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
            {freebets.length === 1 ? '1 freebet' : `${freebets.length} freebets`} para extrair
          </span>
          {totalFB > 0 && (
            <span className="text-xs font-mono text-amber-500/70">
              — R${totalFB.toFixed(2).replace('.', ',')} total
            </span>
          )}
        </div>
        <span className="text-amber-600/60 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-amber-500/20 divide-y divide-amber-500/10">
          {freebets.map(op => (
            <div key={op.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0">
                  {op.tipo === 'FreebetSePerder' ? 'FBSP' : 'FB'}
                </span>
                <span className="text-sm text-slate-300 truncate">{freebetLabel(op)}</span>
              </div>
              <button
                type="button"
                onClick={() => onExtrair(op.id)}
                className="text-xs font-mono text-amber-400 hover:text-amber-300 border border-amber-500/40 hover:border-amber-400 px-2.5 py-1 rounded transition-colors shrink-0"
              >
                Extrair →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
