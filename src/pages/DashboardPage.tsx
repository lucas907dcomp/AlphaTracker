import { useState } from 'react'
import { useDashboard, type DashboardPeriod, type CustomDateRange, type DashboardFilters } from '@/hooks/useDashboard'
import { PeriodToggle } from '@/components/dashboard/PeriodToggle'
import { PnLSummaryCard } from '@/components/dashboard/PnLSummaryCard'
import { PnLBarChart } from '@/components/dashboard/PnLBarChart'
import type { OperacaoTipo } from '@/types'

const TIPOS: { value: OperacaoTipo; label: string }[] = [
  { value: 'Extracao', label: 'Extração' },
  { value: 'Freebet', label: 'Freebet' },
  { value: 'FreebetSePerder', label: 'FB se Perder' },
  { value: 'SuperOdd', label: 'Super Odd' },
  { value: 'TentativaDuplo', label: 'Duplo' },
  { value: 'Aposta', label: 'Aposta' },
]

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('week')
  const [customRange, setCustomRange] = useState<CustomDateRange>({ start: '', end: '' })
  const [filters, setFilters] = useState<DashboardFilters>({ tipos: [], casaIds: [] })
  const [showFilters, setShowFilters] = useState(false)

  const { totalPnl, chartData, pendentesCount, availableCasas, isLoading, isFetching, isError } =
    useDashboard(period, customRange, filters)

  const activeFilterCount = filters.tipos.length + filters.casaIds.length

  function toggleTipo(tipo: OperacaoTipo) {
    setFilters(prev => ({
      ...prev,
      tipos: prev.tipos.includes(tipo)
        ? prev.tipos.filter(t => t !== tipo)
        : [...prev.tipos, tipo],
    }))
  }

  function toggleCasa(id: string) {
    setFilters(prev => ({
      ...prev,
      casaIds: prev.casaIds.includes(id)
        ? prev.casaIds.filter(c => c !== id)
        : [...prev.casaIds, id],
    }))
  }

  function clearFilters() {
    setFilters({ tipos: [], casaIds: [] })
  }

  if (isLoading) return <p className="text-slate-600 p-4 text-sm">Carregando dashboard...</p>
  if (isError) return <p className="text-red-400 p-4 text-sm">Erro ao carregar dashboard.</p>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest">Dashboard</span>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-700 font-mono animate-pulse">atualizando...</span>
          )}
        </div>
        <PeriodToggle
          value={period}
          onChange={setPeriod}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
      </div>

      {/* Filter toggle */}
      <div className="space-y-2">
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 text-xs font-mono transition-colors ${
            activeFilterCount > 0
              ? 'text-blue-400 hover:text-blue-300'
              : 'text-slate-600 hover:text-slate-400'
          }`}
        >
          <span>{showFilters ? '▲' : '▼'}</span>
          <span>Filtros</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {showFilters && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
            {/* Tipo filter */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-widest">Tipo</span>
              <div className="flex flex-wrap gap-1.5">
                {TIPOS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleTipo(value)}
                    className={`text-xs font-mono px-2.5 py-1 rounded border transition-colors ${
                      filters.tipos.includes(value)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Casa filter */}
            {availableCasas.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-widest">Casa</span>
                <div className="flex flex-wrap gap-1.5">
                  {availableCasas.map(casa => (
                    <button
                      key={casa.id}
                      onClick={() => toggleCasa(casa.id)}
                      className={`text-xs font-mono px-2.5 py-1 rounded border transition-colors ${
                        filters.casaIds.includes(casa.id)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      {casa.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs font-mono text-slate-600 hover:text-red-400 transition-colors"
              >
                Limpar filtros ×
              </button>
            )}
          </div>
        )}
      </div>

      <PnLSummaryCard totalPnl={totalPnl} period={period} pendentesCount={pendentesCount} customRange={customRange} />
      <PnLBarChart data={chartData} />
    </div>
  )
}
