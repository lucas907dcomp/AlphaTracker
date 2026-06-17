import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useParceiros, useAllRepasses } from '@/hooks/useParceiros'
import { useOperacoes } from '@/hooks/useOperacoes'
import { parceiroSchema, type ParceiroFormData } from '@/schemas/parceiroSchema'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CentavosInput } from '@/components/ui/CentavosInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Parceiro, ParceiroRepasse } from '@/types'

function getLocalDateString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateBr(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function RepasseForm({
  parceiro,
  maxValor,
  onDone,
}: {
  parceiro: Parceiro
  maxValor: number
  onDone: () => void
}) {
  const { createRepasse } = useParceiros()

  const schema = z.object({
    valor: z
      .number({ invalid_type_error: 'Valor obrigatório' })
      .positive('Deve ser > 0')
      .max(maxValor, `Máximo R$${maxValor.toFixed(2).replace('.', ',')}`),
    data: z.string().min(1, 'Data obrigatória'),
    notas: z.string().optional(),
  })
  type FormData = z.infer<typeof schema>

  const { control, register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { data: getLocalDateString() },
  })

  async function onSubmit(data: FormData) {
    try {
      await createRepasse({ parceiroId: parceiro.id, valor: data.valor, data: data.data, notas: data.notas })
      toast.success(`Pagamento de R$${data.valor.toFixed(2).replace('.', ',')} registrado para ${parceiro.nome}`)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar pagamento')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 pt-3 border-t border-slate-800 flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[100px]">
          <Controller
            control={control}
            name="valor"
            render={({ field }) => (
              <CentavosInput
                value={field.value}
                onChange={field.onChange}
                label={`Valor pago (máx R$${maxValor.toFixed(2).replace('.', ',')})`}
                placeholder="0,00"
                error={errors.valor?.message}
              />
            )}
          />
        </div>
        <div className="w-36">
          <Input label="Data" type="date" error={errors.data?.message} {...register('data')} />
        </div>
      </div>
      <Input label="Notas (opcional)" placeholder="Ex: Pix realizado" {...register('notas')} />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Confirmar Pagamento'}
        </Button>
      </div>
    </form>
  )
}

function RepassesList({ repasses }: { repasses: ParceiroRepasse[] }) {
  const { deleteRepasse } = useParceiros()
  const [deleteTarget, setDeleteTarget] = useState<ParceiroRepasse | null>(null)

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteRepasse(deleteTarget.id)
      toast.success('Pagamento removido')
    } catch {
      toast.error('Erro ao remover pagamento')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (repasses.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
      <span className="text-xs text-slate-600 uppercase tracking-wide font-mono">Pagamentos registrados</span>
      {repasses.map(r => (
        <div key={r.id} className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono tabular-nums">
            {formatDateBr(r.data)} — R${r.valor.toFixed(2).replace('.', ',')}
          </span>
          {r.notas && <span className="text-slate-700 truncate mx-2">{r.notas}</span>}
          <button
            type="button"
            onClick={() => setDeleteTarget(r)}
            className="text-slate-700 hover:text-red-400 transition-colors text-xs ml-auto shrink-0"
          >
            ×
          </button>
        </div>
      ))}
      {deleteTarget && (
        <ConfirmDialog
          title="Remover pagamento"
          message={`Remover pagamento de R$${deleteTarget.valor.toFixed(2).replace('.', ',')} de ${formatDateBr(deleteTarget.data)}?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

export default function ParceirosPage() {
  const { parceiros, isLoading, createParceiro, deleteParceiro } = useParceiros()
  const { data: allRepasses = [] } = useAllRepasses()
  const { operacoes } = useOperacoes()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null)
  const [repasseOpen, setRepasseOpen] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ParceiroFormData>({
    resolver: zodResolver(parceiroSchema),
  })

  function computeSaldo(parceiroId: string, percentual: number): number {
    const totalSplit = operacoes
      .filter(op =>
        op.status === 'Concluida' &&
        (op.tipo === 'Extracao' || op.tipo === 'FreebetSePerder' || op.tipo === 'SuperOdd' || op.tipo === 'Aposta' || op.tipo === 'TentativaDuplo') &&
        op.pnl != null &&
        op.apostas?.[0]?.casa?.parceiro_id === parceiroId
      )
      .reduce((sum, op) => {
        const custo = op.custo_liberacao ?? 0
        const lucroParaSplit = op.pnl! - custo
        return sum + Math.round(lucroParaSplit * (percentual / 100) * 100) / 100
      }, 0)

    const totalPago = allRepasses
      .filter(r => r.parceiro_id === parceiroId)
      .reduce((sum, r) => sum + r.valor, 0)

    return Math.max(0, Math.round((totalSplit - totalPago) * 100) / 100)
  }

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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
        <div className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest">Novo Parceiro</div>
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
        <div className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest">Cadastrados</div>
        {isLoading && <p className="text-slate-600 text-sm">Carregando...</p>}
        {!isLoading && parceiros.length === 0 && (
          <p className="text-slate-700 text-sm">Nenhum parceiro cadastrado.</p>
        )}
        <ul className="flex flex-col gap-2">
          {parceiros.map(p => {
            const saldo = computeSaldo(p.id, p.percentual)
            const parceiroRepasses = allRepasses.filter(r => r.parceiro_id === p.id)
            const isOpen = repasseOpen === p.id
            return (
              <li key={p.id} className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200 text-sm">{p.nome}</span>
                    <span className="text-xs text-slate-500">{p.percentual}% do lucro líquido</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`font-mono font-semibold text-sm tabular-nums ${saldo > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        R${saldo.toFixed(2).replace('.', ',')}
                      </div>
                      <div className="text-xs text-slate-600">
                        {saldo > 0 ? 'a pagar' : 'zerado'}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {saldo > 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setRepasseOpen(isOpen ? null : p.id)}
                        >
                          {isOpen ? 'Cancelar' : 'Pagar'}
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteTarget({ id: p.id, nome: p.nome })}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <RepasseForm
                    parceiro={p}
                    maxValor={saldo}
                    onDone={() => setRepasseOpen(null)}
                  />
                )}

                <RepassesList repasses={parceiroRepasses} />
              </li>
            )
          })}
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
