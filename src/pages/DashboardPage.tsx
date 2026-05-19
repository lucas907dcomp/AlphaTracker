import { useState } from 'react'
import { useDashboard, type DashboardPeriod } from '@/hooks/useDashboard'
import { PeriodToggle } from '@/components/dashboard/PeriodToggle'
import { PnLSummaryCard } from '@/components/dashboard/PnLSummaryCard'
import { PnLBarChart } from '@/components/dashboard/PnLBarChart'

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('week')
  const { totalPnl, chartData, pendentesCount, isLoading, isError } = useDashboard(period)

  if (isLoading) return <p className="text-slate-600 p-4 text-sm">Carregando dashboard...</p>
  if (isError) return <p className="text-red-400 p-4 text-sm">Erro ao carregar dashboard.</p>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest">Dashboard</span>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>
      <PnLSummaryCard totalPnl={totalPnl} period={period} pendentesCount={pendentesCount} />
      <PnLBarChart data={chartData} />
    </div>
  )
}
