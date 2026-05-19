import { z } from 'zod'
import type { OperacaoTipo } from '@/types'

export const legSchema = z.object({
  casaId: z.string().uuid('Casa inválida'),
  stake: z.number({ invalid_type_error: 'Stake obrigatório' }).positive('Stake deve ser > 0'),
  isFreebet: z.boolean().default(false),
  isDoubleGreen: z.boolean().default(false),
  valorPagoFixo: z.number().positive().optional(),
})

export const operacaoSchema = z.object({
  tipo: z.enum(['Freebet', 'Extracao', 'SuperOdd', 'TentativaDuplo', 'Aposta', 'FreebetSePerder'] as const satisfies readonly [OperacaoTipo, ...OperacaoTipo[]]),
  data: z.string().min(1, 'Data obrigatória'),
  valorPagoFixo: z.number().positive().nullable().optional(),
  valorFreebet: z.number().positive().optional(),
  notas: z.string().optional(),
  legs: z.array(legSchema).min(1, 'Ao menos 1 leg obrigatória'),
})

export type LegFormData = z.infer<typeof legSchema>
export type OperacaoFormData = z.infer<typeof operacaoSchema>
