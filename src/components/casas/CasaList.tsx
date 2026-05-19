import { toast } from 'sonner'
import { useCasas } from '@/hooks/useCasas'
import { Button } from '@/components/ui/Button'

export function CasaList() {
  const { casas, isLoading, deactivateCasa } = useCasas()

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

  return (
    <ul className="flex flex-col gap-1.5">
      {casas.map(casa => (
        <li
          key={casa.id}
          className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg"
        >
          <span className="font-medium text-slate-200 text-sm">{casa.nome}</span>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeactivate(casa.id, casa.nome)}
          >
            Desativar
          </Button>
        </li>
      ))}
    </ul>
  )
}
