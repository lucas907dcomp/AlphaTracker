import { useState } from 'react'
import { useDashboard, type DashboardPeriod, type CustomDateRange } from '@/hooks/useDashboard'
import { PeriodToggle } from '@/components/dashboard/PeriodToggle'
import { PnLSummaryCard } from '@/components/dashboard/PnLSummaryCard'
import { PnLBarChart } from '@/components/dashboard/PnLBarChart'

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('week')
  const [customRange, setCustomRange] = useState<CustomDateRange>({ start: '', end: '' })
  const { totalPnl, chartData, pendentesCount, isLoading, isFetching, isError } = useDashboard(period, customRange)

  if (isLoading) return <p className="text-slate-600 p-4 text-sm">Carregando dashboard...</p>
  if (isError) return <p className="text-red-400 p-4 text-sm">Erro ao carregar dashboard.</p>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
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
      <PnLSummaryCard totalPnl={totalPnl} period={period} pendentesCount={pendentesCount} customRange={customRange} />
      <PnLBarChart data={chartData} />
    </div>
  )
}
