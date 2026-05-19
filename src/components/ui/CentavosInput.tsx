import { useState, useEffect } from 'react'

interface CentavosInputProps {
  value: number | null | undefined
  onChange: (value: number | undefined) => void
  label?: string
  placeholder?: string
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  error?: string
  tabIndex?: number
}

export function CentavosInput({ value, onChange, label, placeholder = '0,00', className = '', onKeyDown, error, tabIndex }: CentavosInputProps) {
  const [digits, setDigits] = useState<string>(() =>
    value != null ? Math.round(value * 100).toString() : ''
  )

  // Sync when form resets (value → undefined/null from parent)
  useEffect(() => {
    if (value == null) setDigits('')
  }, [value])

  const displayValue = digits
    ? (parseInt(digits, 10) / 100).toFixed(2).replace('.', ',')
    : ''

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const onlyDigits = e.target.value.replace(/\D/g, '')
    setDigits(onlyDigits)
    onChange(onlyDigits === '' ? undefined : parseInt(onlyDigits, 10) / 100)
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        tabIndex={tabIndex}
        className={`bg-slate-800 border text-slate-100 placeholder-slate-500 rounded px-3 py-2 w-full focus:outline-none focus:ring-1 transition-colors text-sm text-right ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500'} ${className}`}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
