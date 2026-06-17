import { useState } from 'react'
import { toast } from 'sonner'
import { useOperacoes } from '@/hooks/useOperacoes'
import { OperacaoCard } from './OperacaoCard'
import type { Operacao, Aposta, OperacaoTipo, OperacaoStatus } from '@/types'

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

const TIPO_OPTIONS: { value: OperacaoTipo | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'Extracao', label: 'Extração' },
  { value: 'Freebet', label: 'Freebet' },
  { value: 'FreebetSePerder', label: 'FB se Perder' },
  { value: 'SuperOdd', label: 'Super Odd' },
  { value: 'TentativaDuplo', label: 'Tent. Duplo' },
  { value: 'Aposta', label: 'Aposta' },
]

const STATUS_OPTIONS: { value: OperacaoStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'Pendente', label: 'Pendente' },
  { value: 'Concluida', label: 'Concluída' },
  { value: 'GeradaFreebet', label: 'Freebet Gerada' },
]

export function OperacaoList({ onEdit, onDelete }: Props) {
  const { operacoes, isLoading, isError, toggleDoubleGreen, marcarFreebetSePerder, marcarResultadoAposta } = useOperacoes()
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<OperacaoTipo | ''>('')
  const [statusFilter, setStatusFilter] = useState<OperacaoStatus | ''>('')

  if (isLoading) return <p className="text-slate-600 text-sm py-8 text-center">Carregando...</p>
  if (isError) return <p className="text-red-400 text-sm py-4">Erro ao carregar operações.</p>
  if (operacoes.length === 0) {
    return <p className="text-slate-700 text-sm py-8 text-center">Nenhuma operação registrada.</p>
  }

  const usedOrigemIds = new Set(
    operacoes.filter(op => op.operacao_origem_id != null).map(op => op.operacao_origem_id!)
  )

  const searchLower = search.toLowerCase()
  const filtered = operacoes.filter(op => {
    if (tipoFilter && op.tipo !== tipoFilter) return false
    if (statusFilter && op.status !== statusFilter) return false
    if (searchLower) {
      const casasStr = op.apostas?.map(a => a.casa?.nome ?? '').join(' ').toLowerCase() ?? ''
      const notasStr = (op.notas ?? '').toLowerCase()
      if (!casasStr.includes(searchLower) && !notasStr.includes(searchLower)) return false
    }
    return true
  })

  const dateKeys = [...new Set(filtered.map(op => op.data))]
  const grouped: Record<string, Operacao[]> = {}
  for (const date of dateKeys) {
    grouped[date] = filtered.filter(op => op.data === date)
  }

  const hasFilters = search || tipoFilter || statusFilter

  async function handleMarcarFreebet(operacaoId: string, apostas: Aposta[], ganhouPrimeira: boolean, geradaFreebet?: boolean) {
    try {
      await marcarFreebetSePerder({ operacaoId, apostas, ganhouPrimeira, geradaFreebet })
      if (ganhouPrimeira) toast.success('Resultado registrado — sem freebet gerada.')
      else if (geradaFreebet) toast.success('Freebet gerada! Disponível para extração.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao marcar resultado')
    }
  }

  async function handleMarcarAposta(operacaoId: string, aposta: Aposta, ganhou: boolean) {
    try {
      await marcarResultadoAposta({ operacaoId, aposta, ganhou })
      toast.success(ganhou ? 'Aposta vencedora registrada!' : 'Aposta perdida registrada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao marcar resultado')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por casa ou observação..."
          className="flex-1 min-w-[180px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-600 transition-colors"
        />
        <select
          value={tipoFilter}
          onChange={e => setTipoFilter(e.target.value as OperacaoTipo | '')}
          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-slate-600 transition-colors"
        >
          {TIPO_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as OperacaoStatus | '')}
          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-slate-600 transition-colors"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(''); setTipoFilter(''); setStatusFilter('') }}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors px-1"
          >
            Limpar ×
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-700 text-sm py-6 text-center">Nenhuma operação encontrada.</p>
      ) : (
        <div className="space-y-5">
          {hasFilters && (
            <p className="text-xs text-slate-700 font-mono">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
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
                  isOrigemUtilizada={usedOrigemIds.has(op.id)}
                  onToggleDG={(apostaId, operacaoId, isDoubleGreen) =>
                    toggleDoubleGreen({ apostaId, operacaoId, isDoubleGreen })
                  }
                  onMarcarFreebet={handleMarcarFreebet}
                  onMarcarAposta={handleMarcarAposta}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
