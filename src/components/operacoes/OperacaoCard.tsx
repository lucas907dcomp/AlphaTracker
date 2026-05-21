import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SplitBreakdown } from './SplitBreakdown'
import type { Operacao, OperacaoTipo, OperacaoStatus, Aposta } from '@/types'

const tipoBadge: Record<OperacaoTipo, string> = {
  Freebet: 'bg-purple-500/20 text-purple-400',
  Extracao: 'bg-blue-500/20 text-blue-400',
  SuperOdd: 'bg-orange-500/20 text-orange-400',
  TentativaDuplo: 'bg-yellow-500/20 text-yellow-400',
  Aposta: 'bg-slate-500/20 text-slate-400',
  FreebetSePerder: 'bg-pink-500/20 text-pink-400',
}

const tipoLabel: Record<OperacaoTipo, string> = {
  Freebet: 'FB',
  Extracao: 'EXT',
  SuperOdd: 'SODD',
  TentativaDuplo: 'TDPL',
  Aposta: 'BET',
  FreebetSePerder: 'FBSP',
}

const statusBadge: Partial<Record<OperacaoStatus, { label: string; className: string }>> = {
  GeradaFreebet: {
    label: 'Freebet Disponível',
    className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  },
}

interface OperacaoCardProps {
  operacao: Operacao
  onEdit: (operacao: Operacao) => void
  onDelete: (operacao: Operacao) => void
  onToggleDG: (apostaId: string, operacaoId: string, isDoubleGreen: boolean) => void
  onMarcarFreebet: (operacaoId: string, apostas: Aposta[], ganhouPrimeira: boolean, geradaFreebet?: boolean) => void
}

export function OperacaoCard({ operacao, onEdit, onDelete, onToggleDG, onMarcarFreebet }: OperacaoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const dateLabel = new Date(operacao.data + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
  const casasNomes = operacao.apostas?.map(a => a.casa?.nome ?? '?').join(', ') ?? ''
  const isPendente = operacao.status === 'Pendente'
  const isGeradaFreebet = operacao.status === 'GeradaFreebet'
  const isFreebetSePerder = operacao.tipo === 'FreebetSePerder'
  const isFreebet = operacao.tipo === 'Freebet' || isFreebetSePerder
  const primeiraCasa = operacao.apostas?.[0]?.casa?.nome ?? null
  const parceiro = operacao.apostas?.[0]?.casa?.parceiro ?? null

  const hasSplit = (operacao.tipo === 'Extracao' || operacao.tipo === 'FreebetSePerder') &&
    operacao.status === 'Concluida' &&
    parceiro != null &&
    operacao.pnl != null

  // Show breakdown when there's a split OR when extraction has a liberation cost
  const showBreakdown = operacao.status === 'Concluida' && operacao.pnl != null && (
    hasSplit || (operacao.tipo === 'Extracao' && (operacao.custo_liberacao ?? 0) > 0)
  )

  // Split amounts for header display
  const parteParceiro = hasSplit && parceiro
    ? Math.round(operacao.pnl! * (parceiro.percentual / 100) * 100) / 100
    : null
  const parteUser = hasSplit && parteParceiro != null
    ? Math.round((operacao.pnl! - parteParceiro) * 100) / 100
    : null

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${
      isPendente
        ? 'bg-slate-900 border-yellow-500/20'
        : 'bg-slate-900 border-slate-800'
    }`}>
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-800/60 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${tipoBadge[operacao.tipo]}`}>
          {tipoLabel[operacao.tipo]}
        </span>

        {isPendente ? (
          <span className="text-xs font-mono text-yellow-500/70 shrink-0">PEND</span>
        ) : isGeradaFreebet ? (
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded shrink-0 ${statusBadge.GeradaFreebet!.className}`}>
            {statusBadge.GeradaFreebet!.label}
          </span>
        ) : hasSplit && parteUser != null && parteParceiro != null ? (
          <>
            <span className={`font-mono font-semibold text-sm tabular-nums shrink-0 ${parteUser >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {parteUser >= 0 ? '+' : ''}R${parteUser.toFixed(2).replace('.', ',')}
            </span>
            <span className={`font-mono text-xs tabular-nums shrink-0 ${parteParceiro >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
              {parteParceiro >= 0 ? '+' : ''}R${parteParceiro.toFixed(2).replace('.', ',')} {parceiro!.nome}
            </span>
          </>
        ) : (
          operacao.pnl !== null && (
            <span className={`font-mono font-semibold text-sm tabular-nums shrink-0 ${operacao.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {operacao.pnl >= 0 ? '+' : ''}R${operacao.pnl.toFixed(2).replace('.', ',')}
            </span>
          )
        )}

        {isFreebet && operacao.valor_freebet != null && primeiraCasa && (
          operacao.tipo === 'Freebet' ||
          isPendente ||
          operacao.apostas?.[0]?.resultado === 'Perdeu'
        ) && (
          <span className="text-xs font-mono text-purple-400/70 shrink-0">
            +R${operacao.valor_freebet.toFixed(2).replace('.', ',')} FB {primeiraCasa}
          </span>
        )}

        <span className="text-slate-500 text-xs truncate flex-1 min-w-0">{casasNomes}</span>
        <span className="text-slate-600 text-xs shrink-0 tabular-nums">{dateLabel}</span>
        <span className="text-slate-700 text-xs shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 px-4 py-3 space-y-3">
          {operacao.apostas && operacao.apostas.length > 0 && (
            <table className="w-full">
              <tbody>
                {operacao.apostas.map(aposta => (
                  <tr key={aposta.id}>
                    <td className="py-1 pr-3 text-slate-300 text-sm">
                      {aposta.casa?.nome ?? '?'}
                      {aposta.is_freebet && (
                        <span className="ml-1.5 text-xs text-purple-400 font-mono">FB</span>
                      )}
                    </td>
                    <td className="py-1 pr-1 text-slate-500 font-mono text-xs tabular-nums text-right">
                      {aposta.stake}
                    </td>
                    <td className="py-1 px-1 text-slate-700 text-xs">→</td>
                    <td className="py-1 pr-3 text-slate-300 font-mono text-xs tabular-nums">
                      {aposta.gross_return}
                    </td>
                    <td className="py-1">
                      <button
                        type="button"
                        title={aposta.is_double_green ? 'Remover Duplo Verde' : 'Marcar Duplo Verde'}
                        onClick={() => onToggleDG(aposta.id, operacao.id, !aposta.is_double_green)}
                        className={`text-xs px-1.5 py-0.5 rounded border transition-colors font-mono ${
                          aposta.is_double_green
                            ? 'bg-green-500/20 text-green-400 border-green-500/40'
                            : 'text-slate-700 border-slate-800 hover:text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        DG
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Cost/split breakdown (passes origin for inline label) */}
          {showBreakdown && (
            <SplitBreakdown operacao={operacao} origem={operacao.operacao_origem} />
          )}

          {/* FreebetSePerder pre-calculated scenarios */}
          {isFreebetSePerder && isPendente && operacao.apostas && operacao.apostas.length > 0 && (() => {
            const apostas = operacao.apostas!
            const totalCusto = apostas.reduce((sum, a) => sum + (a.is_freebet ? 0 : a.stake), 0)
            const pnlLucrou = Math.round((apostas[0].gross_return - totalCusto) * 100) / 100
            const pnlFreebet = Math.round(((apostas[1]?.gross_return ?? apostas[0].gross_return) - totalCusto) * 100) / 100
            return (
              <div className="border-t border-slate-800 pt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-16 font-mono">Lucrar →</span>
                  <span className={`text-xs font-mono font-semibold tabular-nums ${pnlLucrou >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pnlLucrou >= 0 ? '+' : ''}R${pnlLucrou.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-16 font-mono">Freebet →</span>
                  <span className={`text-xs font-mono font-semibold tabular-nums ${pnlFreebet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pnlFreebet >= 0 ? '+' : ''}R${pnlFreebet.toFixed(2).replace('.', ',')}
                  </span>
                  {operacao.valor_freebet != null && primeiraCasa && (
                    <span className="text-xs font-mono text-purple-400/70">
                      +R${operacao.valor_freebet.toFixed(2).replace('.', ',')} FB {primeiraCasa}
                    </span>
                  )}
                </div>
              </div>
            )
          })()}

          {/* FreebetSePerder result marking */}
          {isFreebetSePerder && isPendente && operacao.apostas && operacao.apostas.length > 0 && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800 flex-wrap">
              <span className="text-xs text-slate-500 mr-1">Resultado:</span>
              <button
                type="button"
                onClick={() => onMarcarFreebet(operacao.id, operacao.apostas!, true)}
                className="text-xs px-3 py-1.5 rounded border border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors font-medium"
              >
                Não gerou freebet ✓
              </button>
              <button
                type="button"
                onClick={() => onMarcarFreebet(operacao.id, operacao.apostas!, false, true)}
                className="text-xs px-3 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors font-medium"
              >
                Gerou freebet
              </button>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1 border-t border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => onEdit(operacao)}>
              Editar
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(operacao)}>
              Excluir
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
