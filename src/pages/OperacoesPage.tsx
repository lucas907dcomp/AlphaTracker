import { useState } from 'react'
import { toast } from 'sonner'
import { OperacaoList } from '@/components/operacoes/OperacaoList'
import { OperacaoForm } from '@/components/operacoes/OperacaoForm'
import { EditOperacaoModal } from '@/components/operacoes/EditOperacaoModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useOperacoes } from '@/hooks/useOperacoes'
import { Calculadora } from '@/components/calculadora/Calculadora'
import type { Operacao } from '@/types'
import type { OperacaoFormData } from '@/schemas/operacaoSchema'

export default function OperacoesPage() {
  const [formKey, setFormKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<Operacao | null>(null)
  const [editTarget, setEditTarget] = useState<Operacao | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { createOperacao, deleteOperacao } = useOperacoes()

  async function handleCreate(data: OperacaoFormData) {
    try {
      await createOperacao(data)
      toast.success('Operação salva!')
      setFormKey(k => k + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar operação')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteOperacao(deleteTarget.id)
      toast.success('Operação excluída!')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir operação')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest mb-3">
          Nova Operação
        </div>
        <OperacaoForm key={formKey} onSubmit={handleCreate} />
      </div>

      <Calculadora />

      <div>
        <div className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest mb-3">
          Histórico
        </div>
        <OperacaoList onEdit={setEditTarget} onDelete={setDeleteTarget} />
      </div>

      {deleteTarget !== null && (
        <ConfirmDialog
          title="Excluir Operação"
          message="Tem certeza que deseja excluir esta operação? Esta ação não pode ser desfeita."
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {editTarget !== null && (
        <EditOperacaoModal
          operacao={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
