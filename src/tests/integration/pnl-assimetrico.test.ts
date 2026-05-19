import { describe, it, expect } from 'vitest'
import { calcularCenariosPnL } from '@/lib/pnl'
import type { Aposta } from '@/types'

// FR-5: Asymmetric PnL — 3 legs with different grossReturn values
// totalCusto = 100 + 20 + 39 = 159 (no freebets)
// Casa1 wins: 200 - 159 = +41
// Casa2 wins:  85 - 159 = -74
// Casa3 wins:  85 - 159 = -74
describe('calcularCenariosPnL — assimétrico 3 legs', () => {
  const apostas: Aposta[] = [
    {
      id: '1', operacao_id: 'op1', casa_id: 'c1',
      stake: 100, gross_return: 200,
      is_freebet: false, is_double_green: false,
      resultado: 'Pendente', created_at: '', updated_at: '',
    },
    {
      id: '2', operacao_id: 'op1', casa_id: 'c2',
      stake: 20, gross_return: 85,
      is_freebet: false, is_double_green: false,
      resultado: 'Pendente', created_at: '', updated_at: '',
    },
    {
      id: '3', operacao_id: 'op1', casa_id: 'c3',
      stake: 39, gross_return: 85,
      is_freebet: false, is_double_green: false,
      resultado: 'Pendente', created_at: '', updated_at: '',
    },
  ]

  it('returns 3 scenarios', () => {
    const result = calcularCenariosPnL(apostas)
    expect(result).toHaveLength(3)
  })

  it('Casa1 wins: pnl = +41', () => {
    const result = calcularCenariosPnL(apostas)
    expect(Number(result[0].pnl.toFixed(2))).toBe(41)
  })

  it('Casa2 wins: pnl = -74', () => {
    const result = calcularCenariosPnL(apostas)
    expect(Number(result[1].pnl.toFixed(2))).toBe(-74)
  })

  it('Casa3 wins: pnl = -74', () => {
    const result = calcularCenariosPnL(apostas)
    expect(Number(result[2].pnl.toFixed(2))).toBe(-74)
  })
})
