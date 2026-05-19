import { z } from 'zod'

export const casaSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
})

export type CasaFormData = z.infer<typeof casaSchema>
