import { toast } from 'sonner'
import { useOperacoes } from '@/hooks/useOperacoes'
import { OperacaoCard } from './OperacaoCard'
import type { Operacao, Aposta } from '@/types'

interface Props {
  onEdit: (op: Operacao) => void
  onDelete: (op: Operacao) => void
}

function getLocalDateString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getYesterdayString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateHeader(dateStr: string): string {
  const today = getLocalDateString()
  const yesterday = getYesterdayString()
  if (dateStr === today) return 'HOJE'
  if (dateStr === yesterday) return 'ONTEM'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

export function OperacaoList({ onEdit, onDelete }: Props) {
  const { operacoes, isLoading, isError, toggleDoubleGreen, marcarFreebetSePerder } = useOperacoes()

  if (isLoading) return <p className="text-slate-600 text-sm py-8 text-center">Carregando...</p>
  if (isError) return <p className="text-red-400 text-sm py-4">Erro ao carregar operações.</p>
  if (operacoes.length === 0) {
    return <p className="text-slate-700 text-sm py-8 text-center">Nenhuma operação registrada.</p>
  }

  const dateKeys = [...new Set(operacoes.map(op => op.data))]
  const grouped: Record<string, Operacao[]> = {}
  for (const date of dateKeys) {
    grouped[date] = operacoes.filter(op => op.data === date)
  }

  async function handleMarcarFreebet(operacaoId: string, apostas: Aposta[], ganhouPrimeira: boolean, geradaFreebet?: boolean) {
    try {
      await marcarFreebetSePerder({ operacaoId, apostas, ganhouPrimeira, geradaFreebet })
      if (ganhouPrimeira) toast.success('Resultado registrado — sem freebet gerada.')
      else if (geradaFreebet) toast.success('Freebet gerada! Disponível para extração.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao marcar resultado')
    }
  }

  return (
    <div className="space-y-5">
      {dateKeys.map(date => (
        <div key={date} className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest shrink-0">
              {formatDateHeader(date)}
            </span>
            <div className="flex-1 border-t border-slate-800" />
            <span className="text-xs text-slate-700 shrink-0">{grouped[date].length}</span>
          </div>
          {grouped[date].map(op => (
            <OperacaoCard
              key={op.id}
              operacao={op}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleDG={(apostaId, operacaoId, isDoubleGreen) =>
                toggleDoubleGreen({ apostaId, operacaoId, isDoubleGreen })
              }
              onMarcarFreebet={handleMarcarFreebet}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
