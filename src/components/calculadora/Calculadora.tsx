import { useState, useMemo } from 'react'

type TipoCalc = 'padrao' | 'fspd'

function fmt(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

function parseNum(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0
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

// Effective back odd after exchange commission: 1 + (odd-1)*(1-c%)
function effectiveBackOdd(odd: number, commPct: number): number {
  if (commPct <= 0) return odd
  return 1 + (odd - 1) * (1 - commPct / 100)
}

interface ColConfig {
  isLay: boolean
  isFreebet: boolean
  commission: string
}

interface ColResult {
  stake: number      // back stake OR lay stake (aposta a favor)
  liability: number  // lay: stake*(odd-1); back: same as stake
  retorno: number    // net return if this col wins
  isLay: boolean
  isFreebet: boolean
}

interface CalcResult {
  tipo: TipoCalc
  target: number
  cols: ColResult[]
  totalCost: number
  pnl: number
  lucroDesejado?: number
  budgetOthers?: number
  targetOthers?: number
  pnlOther?: number
}

interface CalculadoraProps {
  onUseStakes?: (stakes: number[]) => void
}

const DEFAULT_CONFIG: ColConfig = { isLay: false, isFreebet: false, commission: '0' }

export function Calculadora({ onUseStakes }: CalculadoraProps) {
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<TipoCalc>('padrao')
  const [col0Digits, setCol0Digits] = useState('')
  const [odds, setOdds] = useState<string[]>(['', '', ''])
  const [configs, setConfigs] = useState<ColConfig[]>([
    { isLay: false, isFreebet: false, commission: '0' },
    { isLay: false, isFreebet: false, commission: '0' },
    { isLay: false, isFreebet: false, commission: '0' },
  ])
  const [lucroDigits, setLucroDigits] = useState('')

  const calc = useMemo((): CalcResult => {
    const s0 = digitsToValue(col0Digits)
    const o0 = parseNum(odds[0])
    const fb0 = configs[0]?.isFreebet ?? false
    const c0 = parseNum(configs[0]?.commission ?? '0')

    if (tipo === 'padrao') {
      const eo0 = effectiveBackOdd(o0, c0)
      // Target = net return when col0 wins
      const target = fb0
        ? s0 * (o0 - 1) * (1 - c0 / 100)  // freebet: net profit only (stake is free)
        : s0 * eo0                            // back: stake × effective odd

      const cols: ColResult[] = odds.map((odd, i) => {
        const cfg = configs[i] ?? DEFAULT_CONFIG
        const o = parseNum(odd)
        const ci = parseNum(cfg.commission)

        if (i === 0) {
          return { stake: s0, liability: s0, retorno: target, isLay: false, isFreebet: fb0 }
        }

        if (cfg.isLay) {
          const c = ci / 100
          const denom = o - c
          const layStake = target > 0 && o > 0 && denom > 0 ? target / denom : 0
          const liability = layStake > 0 ? Math.round(layStake * (o - 1) * 100) / 100 : 0
          const ls = Math.round(layStake * 100) / 100
          return { stake: ls, liability, retorno: ls, isLay: true, isFreebet: false }
        }

        // Back bet (possibly exchange with commission)
        const eoi = effectiveBackOdd(o, ci)
        const backStake = target > 0 && eoi > 0 ? target / eoi : 0
        return {
          stake: Math.round(backStake * 100) / 100,
          liability: Math.round(backStake * 100) / 100,
          retorno: target,
          isLay: false,
          isFreebet: cfg.isFreebet,
        }
      })

      const totalCost = cols.reduce((sum, col) => {
        if (col.isFreebet) return sum
        return sum + (col.isLay ? col.liability : col.stake)
      }, 0)

      return { tipo, target, cols, totalCost, pnl: target > 0 ? target - totalCost : 0 }
    }

    // fspd
    const lucroDesejado = digitsToValue(lucroDigits)
    const target = s0 * o0
    const budgetOthers = target - s0 - lucroDesejado

    if (target <= 0 || budgetOthers <= 0) {
      return {
        tipo, target, totalCost: 0, pnl: 0,
        cols: odds.map((_, i) => ({ stake: i === 0 ? s0 : 0, liability: i === 0 ? s0 : 0, retorno: 0, isLay: false, isFreebet: false })),
        lucroDesejado, budgetOthers: 0, targetOthers: 0, pnlOther: 0,
      }
    }

    const sumInvOdds = odds.slice(1).reduce((sum, odd) => {
      const o = parseNum(odd)
      return o > 0 ? sum + 1 / o : sum
    }, 0)
    const targetOthers = sumInvOdds > 0 ? budgetOthers / sumInvOdds : 0

    const cols: ColResult[] = odds.map((odd, i) => {
      if (i === 0) return { stake: s0, liability: s0, retorno: target, isLay: false, isFreebet: false }
      const o = parseNum(odd)
      const bs = targetOthers > 0 && o > 0 ? Math.round((targetOthers / o) * 100) / 100 : 0
      return { stake: bs, liability: bs, retorno: targetOthers, isLay: false, isFreebet: false }
    })

    return {
      tipo, target, cols, totalCost: s0 + budgetOthers, pnl: lucroDesejado,
      lucroDesejado, budgetOthers, targetOthers,
      pnlOther: Math.round((targetOthers - budgetOthers - s0) * 100) / 100,
    }
  }, [col0Digits, odds, configs, tipo, lucroDigits])

  function setOdd(i: number, v: string) {
    setOdds(prev => prev.map((o, idx) => idx === i ? v : o))
  }

  function setConfig(i: number, patch: Partial<ColConfig>) {
    setConfigs(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }

  function toggleLay(i: number) {
    const cfg = configs[i]
    const newIsLay = !cfg.isLay
    setConfig(i, {
      isLay: newIsLay,
      isFreebet: false,
      // Auto-fill 2.5% when activating lay if commission was 0
      commission: newIsLay && parseNum(cfg.commission) === 0 ? '2.5' : cfg.commission,
    })
  }

  function addCol() {
    setOdds(prev => [...prev, ''])
    setConfigs(prev => [...prev, { ...DEFAULT_CONFIG }])
  }

  function removeCol(i: number) {
    if (odds.length <= 2) return
    setOdds(prev => prev.filter((_, idx) => idx !== i))
    setConfigs(prev => prev.filter((_, idx) => idx !== i))
  }

  function switchTipo(t: TipoCalc) {
    setTipo(t)
    setCol0Digits('')
    setLucroDigits('')
    if (t === 'fspd') {
      setConfigs(prev => prev.map(c => ({ ...c, isLay: false })))
    }
  }

  // Export: lay cols → liability; back cols → stake
  const exportStakes = calc.cols.map(col =>
    Math.round((col.isLay ? col.liability : col.stake) * 100) / 100
  )

  const hasAnyLay = configs.some((c, i) => i > 0 && c.isLay)

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
            {([['padrao', 'Padrão'], ['fspd', 'FB se Perder']] as [TipoCalc, string][]).map(([t, label]) => (
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

      {/* Lucro desejado (fspd only) */}
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
                Aposta
              </span>
            </div>
            {hasAnyLay && (
              <div className="h-4 flex items-center pr-3">
                <span className="text-[10px] font-mono text-slate-700 whitespace-nowrap">A favor</span>
              </div>
            )}
            <div className="h-9 flex items-center pr-3">
              <span className="text-xs font-mono text-slate-600 uppercase tracking-wide">Odd</span>
            </div>
            <div className="h-7 flex items-center pr-3">
              <span className="text-xs font-mono text-slate-600 uppercase tracking-wide whitespace-nowrap">Comis.</span>
            </div>
            <div className="h-9 flex items-center pr-3">
              <span className="text-xs font-mono text-slate-600 uppercase tracking-wide">Retorno</span>
            </div>
          </div>

          {/* Columns */}
          {odds.map((odd, i) => {
            const cfg = configs[i] ?? DEFAULT_CONFIG
            const col = calc.cols[i] ?? { stake: 0, liability: 0, retorno: 0, isLay: false, isFreebet: false }
            const isLay = i > 0 && cfg.isLay
            const isFb = !isLay && cfg.isFreebet
            const hasComm = parseNum(cfg.commission) > 0

            return (
              <div key={i} className="flex flex-col gap-1 w-28 shrink-0">
                {/* Column header */}
                <div className="h-6 flex items-center justify-between gap-0.5">
                  <span className="text-xs font-mono text-slate-500 shrink-0">
                    Casa {i + 1}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {/* LAY toggle (col1+ only, padrao only) */}
                    {i > 0 && tipo === 'padrao' && (
                      <button
                        type="button"
                        onClick={() => toggleLay(i)}
                        className={`text-[10px] font-mono px-1 py-0.5 rounded border transition-colors leading-none ${
                          isLay
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'text-slate-600 border-slate-700 hover:text-slate-400'
                        }`}
                      >
                        LAY
                      </button>
                    )}
                    {/* FB toggle (back bets only) */}
                    {!isLay && (
                      <button
                        type="button"
                        onClick={() => setConfig(i, { isFreebet: !cfg.isFreebet })}
                        className={`text-[10px] font-mono px-1 py-0.5 rounded border transition-colors leading-none ${
                          isFb
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'text-slate-600 border-slate-700 hover:text-slate-400'
                        }`}
                      >
                        FB
                      </button>
                    )}
                    {i >= 2 && (
                      <button
                        type="button"
                        onClick={() => removeCol(i)}
                        className="text-slate-700 hover:text-red-400 text-base leading-none transition-colors ml-0.5"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Stake row */}
                {i === 0 ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={digitsToDisplay(col0Digits)}
                    onChange={e => setCol0Digits(onlyDigits(e.target.value))}
                    placeholder="0,00"
                    className="h-9 w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-600 rounded px-2 text-sm font-mono text-right focus:outline-none focus:border-blue-500 transition-colors"
                  />
                ) : (
                  <div className={`h-9 w-full rounded px-2 flex items-center justify-end text-sm font-mono tabular-nums ${
                    isLay
                      ? 'bg-orange-950/30 border border-orange-900/40 text-orange-300'
                      : 'bg-slate-800/40 border border-slate-800 text-slate-300'
                  }`}>
                    {isLay
                      ? (col.liability > 0 ? fmt(col.liability) : <span className="text-slate-600">—</span>)
                      : (col.stake > 0 ? fmt(col.stake) : <span className="text-slate-600">—</span>)
                    }
                  </div>
                )}

                {/* Lay stake sub-info (a favor) — only when any lay col exists */}
                {hasAnyLay && (
                  <div className="h-4 flex items-center justify-end">
                    {isLay && col.stake > 0 && (
                      <span className="text-[10px] font-mono text-orange-500/60 tabular-nums">
                        {fmt(col.stake)}
                      </span>
                    )}
                  </div>
                )}

                {/* Odd input */}
                <input
                  type="text"
                  inputMode="decimal"
                  value={odd}
                  onChange={e => setOdd(i, e.target.value)}
                  placeholder={isLay ? 'Lay' : '0.00'}
                  className={`h-9 w-full bg-slate-800 border rounded px-2 text-sm font-mono text-right focus:outline-none transition-colors placeholder-slate-600 text-slate-100 ${
                    isLay
                      ? 'border-orange-900/50 focus:border-orange-500'
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                />

                {/* Commission row — always visible in padrao, spacer in fspd */}
                {tipo === 'padrao' ? (
                  <div className="h-7 flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cfg.commission}
                      onChange={e => setConfig(i, { commission: e.target.value })}
                      placeholder="0"
                      className={`w-full h-7 bg-slate-800 rounded px-2 text-xs font-mono text-right focus:outline-none transition-colors placeholder-slate-600 border ${
                        isLay
                          ? 'border-orange-900/50 text-orange-300 focus:border-orange-500'
                          : hasComm
                            ? 'border-slate-600 text-slate-300 focus:border-slate-500'
                            : 'border-slate-800 text-slate-500 focus:border-slate-600'
                      }`}
                    />
                    <span className="text-[10px] text-slate-600 shrink-0">%</span>
                  </div>
                ) : (
                  <div className="h-7" />
                )}

                {/* Retorno row */}
                <div className={`h-9 w-full rounded px-2 flex items-center justify-end text-sm font-mono tabular-nums bg-slate-800/40 border border-slate-800 ${
                  isLay ? 'text-orange-400/70' : 'text-slate-400'
                }`}>
                  {isLay
                    ? (col.stake > 0 ? fmt(col.stake) : <span className="text-slate-600">—</span>)
                    : (col.retorno > 0 ? fmt(col.retorno) : <span className="text-slate-600">—</span>)
                  }
                </div>
              </div>
            )
          })}

          {/* Add column */}
          <div className="flex flex-col gap-1 pt-6 shrink-0 pl-1">
            <div className="h-9" />
            {hasAnyLay && <div className="h-4" />}
            <div className="h-9 flex items-center">
              <button
                type="button"
                onClick={addCol}
                className="text-xs font-mono text-slate-600 hover:text-blue-400 transition-colors whitespace-nowrap"
              >
                + casa
              </button>
            </div>
            <div className="h-7" />
            <div className="h-9" />
          </div>
        </div>
      </div>

      {/* Summary */}
      {calc.target > 0 && (
        <div className="border-t border-slate-800 pt-2 space-y-2">
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
                {calc.totalCost > 0 && (
                  <span className="text-xs font-mono text-slate-600">
                    apostado: R${fmt(calc.totalCost)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="text-xs font-mono text-slate-500">
                Retorno: <span className="text-slate-300 tabular-nums">R${fmt(calc.target)}</span>
              </span>
              {hasAnyLay ? (
                <span className="text-xs font-mono text-slate-500">
                  Back: <span className="text-slate-300 tabular-nums">R${fmt(
                    calc.cols.reduce((s, c) => !c.isLay && !c.isFreebet ? s + c.stake : s, 0)
                  )}</span>
                  {calc.cols.some(c => c.isLay) && (
                    <> · Resp: <span className="text-orange-300 tabular-nums">R${fmt(
                      calc.cols.reduce((s, c) => c.isLay ? s + c.liability : s, 0)
                    )}</span></>
                  )}
                </span>
              ) : configs[0]?.isFreebet ? (
                <span className="text-xs font-mono text-slate-500">
                  Apostado: <span className="text-slate-300 tabular-nums">R${fmt(calc.totalCost)}</span>
                  <span className="text-slate-600 ml-1">(FB grátis)</span>
                </span>
              ) : (
                <span className="text-xs font-mono text-slate-500">
                  Total apostado: <span className="text-slate-300 tabular-nums">R${fmt(calc.totalCost)}</span>
                </span>
              )}
              <span className={`text-sm font-mono font-bold tabular-nums ${calc.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {calc.pnl >= 0 ? '+' : '-'}R${fmt(Math.abs(calc.pnl))}
              </span>
            </div>
          )}

          {onUseStakes && exportStakes.some(s => s > 0) && (
            <button
              type="button"
              onClick={() => onUseStakes(exportStakes)}
              className="text-xs font-mono text-blue-400 hover:text-blue-300 border border-blue-800 hover:border-blue-600 px-2.5 py-1 rounded transition-colors"
            >
              Usar no formulário →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
