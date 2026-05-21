import { useFreebetsDisponiveis } from '@/hooks/useFreebetsDisponiveis'
import type { Operacao } from '@/types'

const tipoLabel: Record<string, string> = {
  Freebet: 'FB',
  FreebetSePerder: 'FBSP',
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function buildLabel(op: Operacao): string {
  const tipo = tipoLabel[op.tipo] ?? op.tipo
  const casa = op.apostas?.[0]?.casa?.nome ?? '?'
  const date = formatDateShort(op.data)
  const fb = op.valor_freebet != null ? ` — FB R$${op.valor_freebet.toFixed(2).replace('.', ',')}` : ''
  const pnlStr = op.pnl != null
    ? ` (${op.pnl >= 0 ? '+' : ''}R$${op.pnl.toFixed(2).replace('.', ',')})`
    : ''
  return `${tipo} — ${casa} — ${date}${fb}${pnlStr}`
}

interface Props {
  value: string | null
  onChange: (id: string | null) => void
  onCustoLiberacaoChange: (custo: number) => void
  error?: string
}

export function FreebetOrigemPicker({ value, onChange, onCustoLiberacaoChange, error }: Props) {
  const { data: freebets = [], isLoading } = useFreebetsDisponiveis()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value || null
    onChange(id)
    if (id) {
      const op = freebets.find(f => f.id === id)
      const custo = op?.pnl != null ? Math.max(0, -op.pnl) : 0
      onCustoLiberacaoChange(custo)
    } else {
      onCustoLiberacaoChange(0)
    }
  }

  return (
    <div className="space-y-1">
      <span className="text-xs text-slate-500 font-mono uppercase tracking-wide">Origem Freebet</span>
      <select
        value={value ?? ''}
        onChange={handleChange}
        disabled={isLoading}
        className={`bg-slate-800 border ${
          error ? 'border-red-500' : 'border-slate-700'
        } text-slate-100 rounded px-3 py-2 w-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm`}
      >
        <option value="">— Nenhuma (manual) —</option>
        {freebets.map(op => (
          <option key={op.id} value={op.id}>
            {buildLabel(op)}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {freebets.length === 0 && !isLoading && (
        <p className="text-xs text-slate-600">Nenhuma freebet disponível para vincular.</p>
      )}
    </div>
  )
}
