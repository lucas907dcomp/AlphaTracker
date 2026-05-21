import { toast } from 'sonner'
import { useCasas } from '@/hooks/useCasas'
import { useParceiros } from '@/hooks/useParceiros'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

export function CasaList() {
  const { casas, isLoading, deactivateCasa, updateCasaParceiro } = useCasas()
  const { parceiros } = useParceiros()

  if (isLoading) {
    return <p className="text-slate-600 text-sm">Carregando...</p>
  }

  if (casas.length === 0) {
    return <p className="text-slate-700 text-sm">Nenhuma casa cadastrada.</p>
  }

  async function handleDeactivate(id: string, nome: string) {
    try {
      await deactivateCasa(id)
      toast.success(`${nome} desativada`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao desativar casa')
    }
  }

  async function handleParceiroChange(casaId: string, value: string) {
    try {
      await updateCasaParceiro({ casaId, parceiroId: value || null })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar parceiro')
    }
  }

  const parceiroOptions = [
    { value: '', label: 'Minha conta' },
    ...parceiros.map(p => ({ value: p.id, label: `${p.nome} (${p.percentual}%)` })),
  ]

  return (
    <ul className="flex flex-col gap-1.5">
      {casas.map(casa => (
        <li
          key={casa.id}
          className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg"
        >
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-200 text-sm">{casa.nome}</span>
              {casa.parceiro && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
                  {casa.parceiro.nome}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {parceiros.length > 0 && (
              <Select
                options={parceiroOptions}
                value={casa.parceiro_id ?? ''}
                onChange={e => handleParceiroChange(casa.id, e.target.value)}
                className="text-xs py-1 min-w-[120px]"
              />
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeactivate(casa.id, casa.nome)}
            >
              Desativar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
