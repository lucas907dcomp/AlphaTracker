import { toast } from 'sonner'
import { OperacaoForm } from './OperacaoForm'
import { useOperacoes } from '@/hooks/useOperacoes'
import type { Operacao } from '@/types'
import type { OperacaoFormData } from '@/schemas/operacaoSchema'

interface EditOperacaoModalProps {
  operacao: Operacao
  onClose: () => void
}

export function EditOperacaoModal({ operacao, onClose }: EditOperacaoModalProps) {
  const { updateOperacao } = useOperacoes()

  const defaultValues: OperacaoFormData = {
    tipo: operacao.tipo,
    data: operacao.data,
    valorPagoFixo: operacao.valor_pago_fixo ?? undefined,
    valorFreebet: operacao.valor_freebet ?? undefined,
    notas: operacao.notas ?? undefined,
    operacaoOrigemId: operacao.operacao_origem_id ?? null,
    custoLiberacao: operacao.custo_liberacao ?? null,
    legs: operacao.apostas!.map((a, i) => ({
      casaId: a.casa_id,
      stake: a.stake,
      isFreebet: a.is_freebet,
      isDoubleGreen: a.is_double_green,
      valorPagoFixo: operacao.tipo === 'FreebetSePerder' && i === 0 ? a.gross_return : undefined,
    })),
  }

  async function handleSubmit(data: OperacaoFormData) {
    try {
      await updateOperacao({ operacao, data })
      toast.success('Operação atualizada!')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar operação')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-100">Editar Operação</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <OperacaoForm defaultValues={defaultValues} onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
