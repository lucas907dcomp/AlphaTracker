import { useState } from 'react'
import { toast } from 'sonner'
import { useBancas, type BancaEstado } from '@/hooks/useBancas'
import { CentavosInput } from '@/components/ui/CentavosInput'
import { Button } from '@/components/ui/Button'

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function diasLabel(dias: number | null): string {
  if (dias === null) return 'nunca atualizado'
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}

const COR_DOT: Record<BancaEstado['corStatus'], string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
}

// Inline form para atualizar saldo de uma casa
function AtualizarSaldoForm({
  estado,
  onSave,
  onCancel,
}: {
  estado: BancaEstado
  onSave: (saldo: number) => Promise<void>
  onCancel: () => void
}) {
  const [saldo, setSaldo] = useState<number | null | undefined>(
    estado.estimativaAtual ?? undefined
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saldo == null) return
    setSaving(true)
    try {
      await onSave(saldo)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
      <CentavosInput
        value={saldo}
        onChange={setSaldo}
        placeholder="0,00"
      />
      <Button
        onClick={handleSave}
        disabled={saving || saldo == null}
        loading={saving}
        className="shrink-0"
      >
        Salvar
      </Button>
      <button
        onClick={onCancel}
        className="text-xs font-mono text-slate-600 hover:text-slate-400 transition-colors"
      >
        cancelar
      </button>
    </div>
  )
}

// Card de uma casa
function CasaCard({
  estado,
  onSave,
}: {
  estado: BancaEstado
  onSave: (casaId: string, saldo: number) => Promise<void>
}) {
  const [editando, setEditando] = useState(false)

  const hasMovimento = estado.stakesAposSnapshot > 0 || estado.retornosAposSnapshot > 0

  async function handleSave(saldo: number) {
    await onSave(estado.casa.id, saldo)
    setEditando(false)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${COR_DOT[estado.corStatus]}`} />
          <span className="font-medium text-slate-100 text-sm">{estado.casa.nome}</span>
          {estado.opsRecentes > 0 && (
            <span className="text-[10px] font-mono text-slate-500">
              {estado.opsRecentes === 1 ? '⚡ 1 op' : `⚡ ${estado.opsRecentes} ops`} /30d
            </span>
          )}
        </div>
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            className="text-xs font-mono text-slate-500 hover:text-blue-400 border border-slate-700 hover:border-blue-700 px-2 py-0.5 rounded transition-colors"
          >
            {estado.ultimaBanca ? 'Atualizar' : 'Registrar'}
          </button>
        )}
      </div>

      {/* Dados */}
      {estado.ultimaBanca ? (
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-bold text-slate-100 tabular-nums">
              R$ {fmt(estado.ultimaBanca.saldo)}
            </span>
            <span className="text-xs text-slate-600 font-mono">{diasLabel(estado.diasSemAtualizar)}</span>
          </div>

          {hasMovimento && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {estado.stakesAposSnapshot > 0 && (
                <span className="text-xs font-mono text-slate-500">
                  saíram: <span className="text-red-400 tabular-nums">-R$ {fmt(estado.stakesAposSnapshot)}</span>
                </span>
              )}
              {estado.retornosAposSnapshot > 0 && (
                <span className="text-xs font-mono text-slate-500">
                  retornaram: <span className="text-green-400 tabular-nums">+R$ {fmt(estado.retornosAposSnapshot)}</span>
                </span>
              )}
            </div>
          )}

          {estado.estimativaAtual !== null && hasMovimento && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-slate-600">Estimativa atual:</span>
              <span className={`text-sm font-mono font-bold tabular-nums ${
                estado.estimativaAtual >= 0 ? 'text-slate-200' : 'text-red-400'
              }`}>
                ~R$ {fmt(estado.estimativaAtual)}
              </span>
              <span className="text-[10px] text-slate-700 font-mono">(imprecisa)</span>
            </div>
          )}

          {estado.stakesPendentes > 0 && (
            <div className="text-xs font-mono text-yellow-600/80">
              R$ {fmt(estado.stakesPendentes)} em apostas pendentes
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-600 font-mono">
          Nenhum saldo registrado ainda
          {estado.opsRecentes > 0 && (
            <span className="text-yellow-600/80"> — {estado.opsRecentes} op(s) recente(s)!</span>
          )}
        </p>
      )}

      {editando && (
        <AtualizarSaldoForm
          estado={estado}
          onSave={handleSave}
          onCancel={() => setEditando(false)}
        />
      )}
    </div>
  )
}

// Modal Modo Contagem
function ModoContagem({
  estados,
  onSave,
  onClose,
}: {
  estados: BancaEstado[]
  onSave: (casaId: string, saldo: number) => Promise<void>
  onClose: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [saldo, setSaldo] = useState<number | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(new Set<string>())

  const current = estados[idx]
  if (!current) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
          <p className="text-green-400 font-mono text-sm font-bold">✓ Contagem concluída!</p>
          <p className="text-slate-400 text-sm">{saved.size} casa(s) atualizada(s).</p>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </div>
    )
  }

  async function handleSave() {
    if (saldo == null) return
    setSaving(true)
    try {
      await onSave(current.casa.id, saldo)
      setSaved(prev => new Set(prev).add(current.casa.id))
      advance()
    } finally {
      setSaving(false)
    }
  }

  function advance() {
    setSaldo(undefined)
    setIdx(i => i + 1)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest">
            Modo Contagem
          </span>
          <span className="text-xs font-mono text-slate-600">
            {idx + 1} / {estados.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${((idx) / estados.length) * 100}%` }}
          />
        </div>

        {/* Casa atual */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${COR_DOT[current.corStatus]}`} />
            <span className="font-medium text-slate-100">{current.casa.nome}</span>
          </div>
          {current.ultimaBanca && (
            <p className="text-xs font-mono text-slate-600">
              Último registro: R$ {fmt(current.ultimaBanca.saldo)} ({diasLabel(current.diasSemAtualizar)})
            </p>
          )}
          {current.estimativaAtual !== null && current.ultimaBanca && (
            <p className="text-xs font-mono text-slate-600">
              Estimativa: ~R$ {fmt(current.estimativaAtual)}
            </p>
          )}
        </div>

        {/* Input */}
        <div>
          <label className="text-xs font-mono text-slate-500 uppercase tracking-wide block mb-1.5">
            Saldo atual
          </label>
          <CentavosInput
            value={saldo}
            onChange={setSaldo}
            placeholder="0,00"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || saldo == null}
            loading={saving}
            className="flex-1"
          >
            Salvar →
          </Button>
          <button
            onClick={advance}
            className="text-xs font-mono text-slate-500 hover:text-slate-300 border border-slate-700 px-3 rounded transition-colors"
          >
            Pular
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full text-xs font-mono text-slate-700 hover:text-slate-500 transition-colors"
        >
          Cancelar contagem
        </button>
      </div>
    </div>
  )
}

export default function BancasPage() {
  const { estadosPorCasa, isLoading, saveBanca } = useBancas()
  const [modoContagem, setModoContagem] = useState(false)

  async function handleSave(casaId: string, saldo: number) {
    try {
      await saveBanca({ casaId, saldo })
      toast.success('Saldo registrado!')
    } catch {
      toast.error('Erro ao salvar saldo')
    }
  }

  if (isLoading) return <p className="text-slate-600 p-4 text-sm">Carregando bancas...</p>

  const semRegistro = estadosPorCasa.filter(e => !e.ultimaBanca).length
  const desatualizadas = estadosPorCasa.filter(e => e.corStatus === 'red' && e.ultimaBanca).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest">Bancas</span>
          {(semRegistro > 0 || desatualizadas > 0) && (
            <p className="text-xs text-slate-600 font-mono mt-0.5">
              {semRegistro > 0 && <span className="text-yellow-600">{semRegistro} sem registro</span>}
              {semRegistro > 0 && desatualizadas > 0 && <span className="text-slate-700"> · </span>}
              {desatualizadas > 0 && <span className="text-red-500/80">{desatualizadas} desatualizadas</span>}
            </p>
          )}
        </div>
        {estadosPorCasa.length > 0 && (
          <button
            onClick={() => setModoContagem(true)}
            className="text-xs font-mono text-slate-400 hover:text-slate-100 border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded transition-colors"
          >
            Modo Contagem
          </button>
        )}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-[10px] font-mono text-slate-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {'<'} 7 dias</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> 7–14 dias</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {'>'}14 dias / nunca</span>
      </div>

      {/* Aviso sobre estimativas */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg px-3 py-2">
        <p className="text-[11px] font-mono text-slate-600">
          As estimativas são calculadas a partir dos stakes saídos e retornos confirmados (apostas com resultado). Apostas pendentes não entram no cálculo de estimativa.
        </p>
      </div>

      {/* Cards */}
      {estadosPorCasa.length === 0 ? (
        <p className="text-slate-600 text-sm font-mono">Nenhuma casa ativa cadastrada.</p>
      ) : (
        <div className="space-y-3">
          {estadosPorCasa.map(estado => (
            <CasaCard key={estado.casa.id} estado={estado} onSave={handleSave} />
          ))}
        </div>
      )}

      {modoContagem && (
        <ModoContagem
          estados={estadosPorCasa}
          onSave={handleSave}
          onClose={() => setModoContagem(false)}
        />
      )}
    </div>
  )
}
