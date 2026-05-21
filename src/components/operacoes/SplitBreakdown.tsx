import type { Operacao } from '@/types'

interface Props {
  operacao: Operacao
}

export function SplitBreakdown({ operacao }: Props) {
  const parceiro = operacao.apostas?.[0]?.casa?.parceiro
  if (!parceiro || operacao.pnl == null) return null

  const custo = operacao.custo_liberacao ?? 0
  const lucroLiquido = operacao.pnl - custo
  const parteParceiro = Math.round(lucroLiquido * (parceiro.percentual / 100) * 100) / 100
  const parteUser = Math.round(lucroLiquido * (1 - parceiro.percentual / 100) * 100) / 100

  return (
    <div className="border-t border-slate-800 pt-2 space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600 font-mono">Lucro bruto</span>
        <span className={`font-mono tabular-nums ${operacao.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {operacao.pnl >= 0 ? '+' : ''}R${operacao.pnl.toFixed(2).replace('.', ',')}
        </span>
      </div>
      {custo > 0 && (
        <div className="flex justify-between text-xs">
          <span className="text-slate-600 font-mono">Custo liberação</span>
          <span className="font-mono tabular-nums text-red-400">
            −R${custo.toFixed(2).replace('.', ',')}
          </span>
        </div>
      )}
      <div className="flex justify-between text-xs border-t border-slate-800/60 pt-1">
        <span className="text-slate-500 font-mono">Lucro líquido</span>
        <span className={`font-mono tabular-nums font-semibold ${lucroLiquido >= 0 ? 'text-green-300' : 'text-red-400'}`}>
          {lucroLiquido >= 0 ? '+' : ''}R${lucroLiquido.toFixed(2).replace('.', ',')}
        </span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-amber-500/70 font-mono">{parceiro.nome} ({parceiro.percentual}%)</span>
        <span className={`font-mono tabular-nums ${parteParceiro >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
          {parteParceiro >= 0 ? '+' : ''}R${parteParceiro.toFixed(2).replace('.', ',')}
        </span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-slate-500 font-mono">Sua parte ({100 - parceiro.percentual}%)</span>
        <span className={`font-mono tabular-nums ${parteUser >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {parteUser >= 0 ? '+' : ''}R${parteUser.toFixed(2).replace('.', ',')}
        </span>
      </div>
    </div>
  )
}
