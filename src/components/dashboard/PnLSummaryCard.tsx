import type { DashboardPeriod, CustomDateRange } from '@/hooks/useDashboard'

interface PnLSummaryCardProps {
  totalPnl: number
  period: DashboardPeriod
  pendentesCount: number
  customRange?: CustomDateRange
}

function formatDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

export function PnLSummaryCard({ totalPnl, period, pendentesCount, customRange }: PnLSummaryCardProps) {
  let periodLabel: string
  if (period === 'day') periodLabel = 'Hoje'
  else if (period === 'week') periodLabel = 'Esta Semana'
  else if (period === 'month') periodLabel = 'Este Mês'
  else if (customRange?.start && customRange?.end)
    periodLabel = `${formatDate(customRange.start)} – ${formatDate(customRange.end)}`
  else periodLabel = 'Período Personalizado'

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
