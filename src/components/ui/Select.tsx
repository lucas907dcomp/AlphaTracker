import { forwardRef, type SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[]
  label?: string
  error?: string
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ options, label, error, placeholder, className = '', ...props }, ref) {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`bg-slate-800 border ${
              error ? 'border-red-500' : 'border-slate-700'
            } text-slate-100 rounded px-3 py-2 w-full pr-8 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none text-sm ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled style={{ background: '#1e293b' }}>
                {placeholder}
              </option>
            )}
            {options.map(opt => (
              <option key={opt.value} value={opt.value} style={{ background: '#1e293b' }}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">▾</span>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
