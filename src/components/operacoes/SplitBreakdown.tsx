import type { Operacao, OperacaoOrigem, OperacaoTipo } from '@/types'

const tipoLabel: Record<OperacaoTipo, string> = {
  Freebet: 'FB',
  Extracao: 'EXT',
  SuperOdd: 'SODD',
  TentativaDuplo: 'TDPL',
  Aposta: 'BET',
  FreebetSePerder: 'FBSP',
}

interface Props {
  operacao: Operacao
  origem?: OperacaoOrigem | null
}

export function SplitBreakdown({ operacao, origem }: Props) {
  if (operacao.pnl == null) return null

  const parceiro = operacao.apostas?.[0]?.casa?.parceiro ?? null
  const custo = operacao.custo_liberacao ?? 0
  // pnl stored is gross (custo not deducted — already counted in GeradaFreebet op)
  const lucroTotal = operacao.pnl
  const lucroParaSplit = Math.round((lucroTotal - custo) * 100) / 100

  const showCusto = custo > 0
  const showSplit = parceiro != null

  if (!showCusto && !showSplit) return null

  // Build inline origin label for the custo line
  const origemLabel = origem?.data
    ? (() => {
        const date = new Date(origem.data + 'T00:00:00').toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        })
        const tipo = tipoLabel[origem.tipo] ?? origem.tipo
        const fb = origem.valor_freebet != null
          ? ` FB R$${origem.valor_freebet.toFixed(2).replace('.', ',')}`
          : ''
        return `${tipo} ${date}${fb}`
      })()
    : null

  const parteParceiro = showSplit
    ? Math.round(lucroParaSplit * (parceiro!.percentual / 100) * 100) / 100
    : null
  const parteUser = parteParceiro != null
    ? Math.round((lucroTotal - parteParceiro) * 100) / 100
    : null

  return (
    <div className="border-t border-slate-800 pt-2 space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600 font-mono">Lucro operação</span>
        <span className={`font-mono tabular-nums ${lucroTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {lucroTotal >= 0 ? '+' : ''}R${lucroTotal.toFixed(2).replace('.', ',')}
        </span>
      </div>
      {showCusto && (
        <>
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-mono">
              Custo freebet{origemLabel ? <span className="text-slate-700"> ({origemLabel})</span> : null}
              <span className="text-slate-700"> (já contabilizado)</span>
            </span>
            <span className="font-mono tabular-nums text-slate-600">
              −R${custo.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="flex justify-between text-xs border-t border-slate-800/60 pt-1">
            <span className="text-slate-500 font-mono">Base do split</span>
            <span className={`font-mono tabular-nums ${lucroParaSplit >= 0 ? 'text-slate-300' : 'text-red-400'}`}>
              {lucroParaSplit >= 0 ? '+' : ''}R${lucroParaSplit.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </>
      )}
      {showSplit && parteParceiro != null && parteUser != null && (
        <>
          <div className={`flex justify-between text-xs ${showCusto ? '' : 'border-t border-slate-800/60 pt-1'}`}>
            <span className="text-amber-500/70 font-mono">{parceiro!.nome} ({parceiro!.percentual}%)</span>
            <span className={`font-mono tabular-nums ${parteParceiro >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
              {parteParceiro >= 0 ? '+' : ''}R${parteParceiro.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="flex justify-between text-xs border-t border-slate-800/60 pt-1">
            <span className="text-slate-400 font-mono font-semibold">Sua parte ({100 - parceiro!.percentual}%)</span>
            <span className={`font-mono tabular-nums font-semibold ${parteUser >= 0 ? 'text-green-300' : 'text-red-400'}`}>
              {parteUser >= 0 ? '+' : ''}R${parteUser.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </>
      )}
      {!showSplit && showCusto && (
        <div className="flex justify-between text-xs border-t border-slate-800/60 pt-1">
          <span className="text-slate-400 font-mono font-semibold">Seu lucro</span>
          <span className={`font-mono tabular-nums font-semibold ${lucroTotal >= 0 ? 'text-green-300' : 'text-red-400'}`}>
            {lucroTotal >= 0 ? '+' : ''}R${lucroTotal.toFixed(2).replace('.', ',')}
          </span>
        </div>
      )}
    </div>
  )
}
