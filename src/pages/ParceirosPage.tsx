import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useParceiros } from '@/hooks/useParceiros'
import { parceiroSchema, type ParceiroFormData } from '@/schemas/parceiroSchema'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export default function ParceirosPage() {
  const { parceiros, isLoading, createParceiro, deleteParceiro } = useParceiros()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ParceiroFormData>({
    resolver: zodResolver(parceiroSchema),
  })

  async function onSubmit(data: ParceiroFormData) {
    try {
      await createParceiro(data)
      toast.success(`Parceiro "${data.nome}" cadastrado`)
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar parceiro')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteParceiro(deleteTarget.id)
      toast.success(`Parceiro "${deleteTarget.nome}" removido`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover parceiro')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
      <h1 className="text-xl font-bold text-slate-100">Parceiros</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Novo Parceiro</h2>
        <Input
          label="Nome"
          placeholder="Ex: Fábio"
          error={errors.nome?.message}
          {...register('nome')}
        />
        <Input
          label="Percentual do lucro (%)"
          type="number"
          min={1}
          max={99}
          step={0.5}
          placeholder="Ex: 40"
          error={errors.percentual?.message}
          {...register('percentual', { valueAsNumber: true })}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Cadastrar'}
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Cadastrados</h2>
        {isLoading && <p className="text-slate-600 text-sm">Carregando...</p>}
        {!isLoading && parceiros.length === 0 && (
          <p className="text-slate-700 text-sm">Nenhum parceiro cadastrado.</p>
        )}
        <ul className="flex flex-col gap-1.5">
          {parceiros.map(p => (
            <li
              key={p.id}
              className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg"
            >
              <div className="flex flex-col">
                <span className="font-medium text-slate-200 text-sm">{p.nome}</span>
                <span className="text-xs text-slate-500">{p.percentual}% do lucro líquido</span>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteTarget({ id: p.id, nome: p.nome })}
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Remover parceiro"
          message={`Tem certeza que deseja remover "${deleteTarget.nome}"? As casas vinculadas perderão o vínculo.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
