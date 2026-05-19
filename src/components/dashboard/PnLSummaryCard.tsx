import type { DashboardPeriod } from '@/hooks/useDashboard'

interface PnLSummaryCardProps {
  totalPnl: number
  period: DashboardPeriod
  pendentesCount: number
}

export function PnLSummaryCard({ totalPnl, period, pendentesCount }: PnLSummaryCardProps) {
  const periodLabel =
    period === 'day' ? 'Hoje' : period === 'week' ? 'Esta Semana' : 'Este Mês'

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest mb-2">{periodLabel}</p>
      <p className={`text-3xl font-bold font-mono tabular-nums ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {totalPnl >= 0 ? '+' : ''}R${totalPnl.toFixed(2).replace('.', ',')}
      </p>
      {pendentesCount > 0 && (
        <p className="text-xs text-slate-600 mt-2">{pendentesCount} pendente(s)</p>
      )}
    </div>
  )
}
