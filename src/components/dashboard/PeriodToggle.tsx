import type { DashboardPeriod, CustomDateRange } from '@/hooks/useDashboard'

interface PeriodToggleProps {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
  customRange: CustomDateRange
  onCustomRangeChange: (range: CustomDateRange) => void
}

const OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'day', label: 'Hoje' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'custom', label: 'Período' },
]

export function PeriodToggle({ value, onChange, customRange, onCustomRangeChange }: PeriodToggleProps) {
  return (
    <div className="flex flex-col items-end gap-2">
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

      {value === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customRange.start}
            onChange={e => onCustomRangeChange({ ...customRange, start: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-slate-500"
          />
          <span className="text-slate-600 text-xs">→</span>
          <input
            type="date"
            value={customRange.end}
            min={customRange.start}
            onChange={e => onCustomRangeChange({ ...customRange, end: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-slate-500"
          />
        </div>
      )}
    </div>
  )
}
