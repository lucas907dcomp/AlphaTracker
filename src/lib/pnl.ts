import Decimal from 'decimal.js'
import type { Aposta, CenarioPnL } from '@/types'

export function calcularCenariosPnL(apostas: Aposta[]): CenarioPnL[] {
  const totalCusto = apostas
    .filter(a => !a.is_freebet)
    .reduce((acc, a) => acc.plus(new Decimal(a.stake)), new Decimal(0))

  return apostas.map(aposta => {
    const gr = aposta.is_double_green
      ? new Decimal(aposta.gross_return).times(2)
      : new Decimal(aposta.gross_return)
    return {
      casaId: aposta.casa_id,
      casaNome: aposta.casa?.nome ?? '',
      pnl: gr.minus(totalCusto).toDecimalPlaces(2).toNumber(),
    }
  })
}
