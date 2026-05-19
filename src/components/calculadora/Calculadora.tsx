import { useState, useMemo } from 'react'

type TipoCalc = 'padrao' | 'freebet' | 'fspd'

function fmt(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

function parseNum(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0
}

interface CalcResult {
  tipo: TipoCalc
  target1: number
  stakes: number[]
  // padrão / freebet
  totalStakes: number
  pnl: number
  // fspd only
  lucroDesejado?: number
  budgetOthers?: number
  targetOthers?: number
  pnlOther?: number
}

function digitsToDisplay(digits: string): string {
  return digits ? (parseInt(digits, 10) / 100).toFixed(2).replace('.', ',') : ''
}

function digitsToValue(digits: string): number {
  return digits ? parseInt(digits, 10) / 100 : 0
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '')
}

export function Calculadora() {
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<TipoCalc>('padrao')
  const [col1Digits, setCol1Digits] = useState('')
  const [odds, setOdds] = useState<string[]>(['', '', ''])
  const [lucroDigits, setLucroDigits] = useState('')

  const calc = useMemo((): CalcResult => {
    const s1 = digitsToValue(col1Digits)
    const o1 = parseNum(odds[0])

    if (tipo === 'padrao') {
      const target1 = s1 * o1
      const stakes = odds.map((odd, i) => {
        if (i === 0) return s1
        const o = parseNum(odd)
        return target1 > 0 && o > 0 ? target1 / o : 0
      })
      const totalStakes = stakes.reduce((a, b) => a + b, 0)
      return { tipo, target1, stakes, totalStakes, pnl: target1 > 0 ? target1 - totalStakes : 0 }
    }

    if (tipo === 'freebet') {
      const target1 = s1 * (o1 - 1)
      const stakes = odds.map((odd, i) => {
        if (i === 0) return s1
        const o = parseNum(odd)
        return target1 > 0 && o > 0 ? target1 / o : 0
      })
      const totalStakes = stakes.slice(1).reduce((a, b) => a + b, 0)
      return { tipo, target1, stakes, totalStakes, pnl: target1 > 0 ? target1 - totalStakes : 0 }
    }

    // fspd: col1 is real money (not freebet), target1 = s1 × odd1
    const lucroDesejado = digitsToValue(lucroDigits)
    const target1 = s1 * o1
    // budget for other casas = what's left after paying back s1 and desired profit
    const budgetOthers = target1 - s1 - lucroDesejado

    if (target1 <= 0 || budgetOthers <= 0) {
      return { tipo, target1, stakes: odds.map(() => 0), totalStakes: 0, pnl: 0, lucroDesejado, budgetOthers: 0, targetOthers: 0, pnlOther: 0 }
    }

    const sumInvOdds = odds.slice(1).reduce((sum, odd) => {
      const o = parseNum(odd)
      return o > 0 ? sum + 1 / o : sum
    }, 0)

    const targetOthers = sumInvOdds > 0 ? budgetOthers / sumInvOdds : 0
    const stakes = odds.map((odd, i) => {
      if (i === 0) return s1
      const o = parseNum(odd)
      return targetOthers > 0 && o > 0 ? targetOthers / o : 0
    })

    return {
      tipo,
      target1,
      stakes,
      totalStakes: s1 + budgetOthers,
      pnl: lucroDesejado,
      lucroDesejado,
      budgetOthers,
      targetOthers,
      // when others win: col1 bet is lost (-s1) + net from others
      pnlOther: Math.round((targetOthers - budgetOthers - s1) * 100) / 100,
    }
  }, [col1Digits, odds, tipo, lucroDigits])

  function setOdd(i: number, v: string) {
    setOdds(prev => prev.map((o, idx) => idx === i ? v : o))
  }

  function addCol() {
    setOdds(prev => [...prev, ''])
  }

  function removeCol(i: number) {
    if (odds.length <= 2) return
    setOdds(prev => prev.filter((_, idx) => idx !== i))
  }

  function switchTipo(t: TipoCalc) {
    setTipo(t)
    setCol1Digits('')
    setLucroDigits('')
  }

  const col1Label = tipo === 'freebet' ? 'Freebet' : 'Apostado'
  const isFree = tipo === 'freebet'

  // Retorno row: for col1 on fspd it's target1; for freebet it's target1 (= fb×(odd-1)); for padrão all same
  function getRetorno(i: number): number {
    if (i === 0) return calc.target1
    if (tipo === 'fspd') return calc.targetOthers ?? 0
    return calc.target1
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors"
      >
        Calculadora ▼
      </button>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
            Calculadora
          </span>
          <div className="flex gap-1">
            {([
              ['padrao', 'Padrão'],
              ['freebet', 'Freebet'],
              ['fspd', 'FB se Perder'],
            ] as [TipoCalc, string][]).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTipo(t)}
                className={`text-xs font-mono px-2.5 py-0.5 rounded border transition-colors ${
                  tipo === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-slate-500 border-slate-700 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-slate-600 hover:text-slate-300 transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Lucro desejado input (fspd only) */}
      {tipo === 'fspd' && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
            Lucro se casa 1 vencer:
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={digitsToDisplay(lucroDigits)}
            onChange={e => setLucroDigits(onlyDigits(e.target.value))}
            placeholder="0,00"
            className="w-24 h-8 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-600 rounded px-2 text-sm font-mono text-right focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 pb-1" style={{ minWidth: 'max-content' }}>
          {/* Row labels */}
          <div className="flex flex-col gap-1 pt-6 shrink-0">
            <div className="h-9 flex items-center pr-3">
              <span className="text-xs font-mono text-slate-600 uppercase tracking-wide whitespace-nowrap">
                {col1Label}
              </span>
            </div>
            <div className="h-9 flex items-center pr-3">
              <span className="text-xs font-mono text-slate-600 uppercase tracking-wide">Odd</span>
            </div>
            <div className="h-9 flex items-center pr-3">
              <span className="text-xs font-mono text-slate-600 uppercase tracking-wide">Retorno</span>
            </div>
          </div>

          {/* Columns */}
          {odds.map((odd, i) => (
            <div key={i} className="flex flex-col gap-1 w-28 shrink-0">
              {/* Column header */}
              <div className="h-6 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">
                  Casa {i + 1}
                  {isFree && i === 0 && (
                    <span className="ml-1 text-[10px] text-purple-400">FB</span>
                  )}
                </span>
                {i >= 2 && (
                  <button
                    type="button"
                    onClick={() => removeCol(i)}
                    className="text-slate-700 hover:text-red-400 text-base leading-none transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Stake / FB input (col1) or auto display (col2+) */}
              {i === 0 ? (
                <input
                  type="text"
                  inputMode="numeric"
                  value={digitsToDisplay(col1Digits)}
                  onChange={e => setCol1Digits(onlyDigits(e.target.value))}
                  placeholder="0,00"
                  className="h-9 w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-600 rounded px-2 text-sm font-mono text-right focus:outline-none focus:border-blue-500 transition-colors"
                />
              ) : (
                <div className="h-9 w-full bg-slate-800/40 border border-slate-800 rounded px-2 flex items-center justify-end text-sm font-mono text-slate-300 tabular-nums">
                  {calc.stakes[i] > 0
                    ? fmt(calc.stakes[i])
                    : <span className="text-slate-600">—</span>}
                </div>
              )}

              {/* Odd input */}
              <input
                type="text"
                inputMode="decimal"
                value={odd}
                onChange={e => setOdd(i, e.target.value)}
                placeholder="0.00"
                className="h-9 w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-600 rounded px-2 text-sm font-mono text-right focus:outline-none focus:border-blue-500 transition-colors"
              />

              {/* Return display */}
              <div className="h-9 w-full bg-slate-800/40 border border-slate-800 rounded px-2 flex items-center justify-end text-sm font-mono text-slate-400 tabular-nums">
                {getRetorno(i) > 0
                  ? fmt(getRetorno(i))
                  : <span className="text-slate-600">—</span>}
              </div>
            </div>
          ))}

          {/* Add column */}
          <div className="flex flex-col gap-1 pt-6 shrink-0 pl-1">
            <div className="h-9" />
            <div className="h-9 flex items-center">
              <button
                type="button"
                onClick={addCol}
                className="text-xs font-mono text-slate-600 hover:text-blue-400 transition-colors whitespace-nowrap"
              >
                + casa
              </button>
            </div>
            <div className="h-9" />
          </div>
        </div>
      </div>

      {/* Summary */}
      {calc.target1 > 0 && (
        <div className="border-t border-slate-800 pt-2 space-y-1">
          {tipo === 'fspd' ? (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-xs font-mono text-slate-500 w-36">Casa 1 vence:</span>
                <span className="text-sm font-mono font-bold text-green-400 tabular-nums">
                  +R${fmt(calc.pnl)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-xs font-mono text-slate-500 w-36">Outras vencem:</span>
                <span className={`text-sm font-mono font-bold tabular-nums ${(calc.pnlOther ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(calc.pnlOther ?? 0) >= 0 ? '+' : '-'}R${fmt(Math.abs(calc.pnlOther ?? 0))}
                </span>
                {calc.totalStakes > 0 && (
                  <span className="text-xs font-mono text-slate-600">
                    apostado: R${fmt(calc.totalStakes)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="text-xs font-mono text-slate-500">
                Retorno: <span className="text-slate-300 tabular-nums">R${fmt(calc.target1)}</span>
              </span>
              {tipo === 'freebet' ? (
                <span className="text-xs font-mono text-slate-500">
                  Apostado: <span className="text-slate-300 tabular-nums">R${fmt(calc.totalStakes)}</span>
                  <span className="text-slate-600 ml-1">(FB grátis)</span>
                </span>
              ) : (
                <span className="text-xs font-mono text-slate-500">
                  Total apostado: <span className="text-slate-300 tabular-nums">R${fmt(calc.totalStakes)}</span>
                </span>
              )}
              <span className={`text-sm font-mono font-bold tabular-nums ${calc.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {calc.pnl >= 0 ? '+' : '-'}R${fmt(Math.abs(calc.pnl))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
