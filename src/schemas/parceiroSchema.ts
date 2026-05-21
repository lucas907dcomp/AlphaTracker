import { z } from 'zod'

export const parceiroSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  percentual: z
    .number({ invalid_type_error: 'Percentual obrigatório' })
    .min(1, 'Mínimo 1%')
    .max(99, 'Máximo 99%'),
})

export type ParceiroFormData = z.infer<typeof parceiroSchema>
