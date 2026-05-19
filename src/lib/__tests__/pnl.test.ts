import { describe, it, expect } from 'vitest'
import { calcularCenariosPnL } from '@/lib/pnl'
import type { Aposta } from '@/types'

function makeAposta(overrides: { stake: number; gross_return: number } & Partial<Aposta>): Aposta {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    operacao_id: '00000000-0000-0000-0000-000000000002',
    casa_id: '00000000-0000-0000-0000-000000000003',
    is_freebet: false,
    is_double_green: false,
    resultado: 'Pendente',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('calcularCenariosPnL', () => {
  it('simétrico básico — gross_return fixo, 2 legs', () => {
    const apostas: Aposta[] = [
      makeAposta({ stake: 100, gross_return: 200 }),
      makeAposta({ stake: 20, gross_return: 85 }),
    ]
    const result = calcularCenariosPnL(apostas)
    expect(result).toHaveLength(2)
    expect(result[0].pnl).toBe(80)
    expect(result[1].pnl).toBe(-35)
  })

  it('freebet SNR — leg com is_freebet=true excluída do custo', () => {
    const apostas: Aposta[] = [
      makeAposta({ stake: 100, gross_return: 200, is_freebet: false }),
      makeAposta({ stake: 20, gross_return: 85, is_freebet: true }),
    ]
    const result = calcularCenariosPnL(apostas)
    expect(result).toHaveLength(2)
    expect(result[0].pnl).toBe(100)
    expect(result[1].pnl).toBe(-15)
  })

  it('assimétrico — 3 cenários com gross_return diferente por leg', () => {
    const apostas: Aposta[] = [
      makeAposta({ stake: 100, gross_return: 200 }),
      makeAposta({ stake: 20, gross_return: 85 }),
      makeAposta({ stake: 39, gross_return: 85 }),
    ]
    const result = calcularCenariosPnL(apostas)
    expect(result).toHaveLength(3)
    expect(result[0].pnl).toBe(41)
    expect(result[1].pnl).toBe(-74)
    expect(result[2].pnl).toBe(-74)
  })

  it('duplo green — grossReturn dobrado quando is_double_green=true', () => {
    const apostas: Aposta[] = [
      makeAposta({ stake: 100, gross_return: 200, is_double_green: false }),
      makeAposta({ stake: 20, gross_return: 85, is_double_green: true }),
    ]
    const result = calcularCenariosPnL(apostas)
    expect(result).toHaveLength(2)
    expect(result[0].pnl).toBe(80)
    expect(result[1].pnl).toBe(50)
  })

  it('precisão decimal — 0.1 + 0.2 sem erro de float nativo', () => {
    const apostas: Aposta[] = [
      makeAposta({ stake: 0.1, gross_return: 0.2 }),
      makeAposta({ stake: 0.2, gross_return: 0.3 }),
    ]
    const result = calcularCenariosPnL(apostas)
    expect(result).toHaveLength(2)
    expect(result[0].pnl).toBe(-0.1)
    expect(result[1].pnl).toBe(0)
  })

  it('N legs — 4 casas e 5 casas', () => {
    const make4 = (): Aposta[] =>
      Array.from({ length: 4 }, () => makeAposta({ stake: 50, gross_return: 200 }))

    const make5 = (): Aposta[] =>
      Array.from({ length: 5 }, () => makeAposta({ stake: 20, gross_return: 100 }))

    const result4 = calcularCenariosPnL(make4())
    expect(result4).toHaveLength(4)
    expect(result4.every(c => c.pnl === 0)).toBe(true)

    const result5 = calcularCenariosPnL(make5())
    expect(result5).toHaveLength(5)
    expect(result5.every(c => c.pnl === 0)).toBe(true)
  })
})
