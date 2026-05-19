import { calcularCenariosPnL } from '@/lib/pnl'
import type { LegFormData } from '@/schemas/operacaoSchema'
import type { Aposta, Casa } from '@/types'

interface PnLPreviewProps {
  legs: LegFormData[]
  casas: Casa[]
}

export function PnLPreview({ legs, casas }: PnLPreviewProps) {
  const validLegs = legs.filter(l => l.casaId && l.stake > 0)

  if (validLegs.length === 0) return null

  const apostas: Aposta[] = validLegs.map((leg, idx) => ({
    id: `preview-${idx}`,
    operacao_id: 'preview',
    casa_id: leg.casaId,
    stake: leg.stake,
    gross_return: leg.stake,
    is_freebet: leg.isFreebet,
    is_double_green: false,
    resultado: 'Pendente',
    created_at: '',
    updated_at: '',
    casa: casas.find(c => c.id === leg.casaId),
  }))

  const cenarios = calcularCenariosPnL(apostas)

  return (
    <div className="border border-slate-800 rounded-md overflow-hidden">
      <div className="bg-slate-800/50 px-3 py-1 text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
        PnL Preview
      </div>
      <table className="w-full text-xs">
        <tbody>
          {cenarios.map(c => (
            <tr key={c.casaId} className="border-t border-slate-800/50">
              <td className="px-3 py-1.5 text-slate-400">{c.casaNome || 'Casa'}</td>
              <td className={`px-3 py-1.5 text-right font-mono font-semibold tabular-nums ${c.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {c.pnl >= 0 ? '+' : ''}R${c.pnl.toFixed(2).replace('.', ',')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
