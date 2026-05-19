import type { DashboardPeriod } from '@/hooks/useDashboard'

interface PeriodToggleProps {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
}

const OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'day', label: 'Hoje' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
]

export function PeriodToggle({ value, onChange }: PeriodToggleProps) {
  return (
    <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-slate-700 text-slate-100'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
