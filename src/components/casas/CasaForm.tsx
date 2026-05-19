import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { casaSchema, type CasaFormData } from '@/schemas/casaSchema'
import { useCasas } from '@/hooks/useCasas'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function CasaForm() {
  const { createCasa } = useCasas()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CasaFormData>({ resolver: zodResolver(casaSchema), defaultValues: { nome: '' } })

  async function onSubmit(data: CasaFormData) {
    try {
      await createCasa(data.nome)
      reset()
      toast.success('Casa adicionada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar casa')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2 items-end">
      <div className="flex-1">
        <Input
          label="Nome da Casa"
          placeholder="Ex: Betano"
          error={errors.nome?.message}
          {...register('nome')}
        />
      </div>
      <Button type="submit" loading={isSubmitting}>
        Adicionar
      </Button>
    </form>
  )
}
