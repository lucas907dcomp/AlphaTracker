import { useState, useRef, useEffect, forwardRef } from 'react'

interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
  className?: string
  autoFocus?: boolean
}

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
  function Combobox(
    { options, value, onChange, onBlur, placeholder = 'Casa...', error, className = '', autoFocus },
    ref
  ) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [highlighted, setHighlighted] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedLabel = options.find(o => o.value === value)?.label ?? ''

    const filtered =
      query.trim() === ''
        ? options
        : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))

    function handleSelect(opt: ComboboxOption) {
      onChange(opt.value)
      setQuery('')
      setOpen(false)
    }

    function handleFocus() {
      setQuery('')
      setOpen(true)
      setHighlighted(0)
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
      setQuery(e.target.value)
      setHighlighted(0)
      if (!open) setOpen(true)
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (!open) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true) }
        return
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlighted(h => Math.min(h + 1, filtered.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlighted(h => Math.max(h - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filtered[highlighted]) handleSelect(filtered[highlighted])
          break
        case 'Escape':
          setOpen(false)
          setQuery('')
          break
        case 'Tab':
          // Select highlighted item but don't preventDefault — let Tab move focus naturally
          if (filtered[highlighted]) handleSelect(filtered[highlighted])
          break
      }
    }

    useEffect(() => {
      function handleOutsideClick(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false)
          setQuery('')
        }
      }
      document.addEventListener('mousedown', handleOutsideClick)
      return () => document.removeEventListener('mousedown', handleOutsideClick)
    }, [])

    const displayValue = open ? query : selectedLabel

    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <input
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => {
              setOpen(false)
              setQuery('')
            }, 150)
            onBlur?.()
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          className={`bg-slate-800 border ${
            error ? 'border-red-500' : 'border-slate-700'
          } text-slate-100 placeholder-slate-500 rounded px-3 py-2 w-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm`}
        />
        {open && filtered.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded shadow-2xl max-h-48 overflow-auto">
            {filtered.map((opt, i) => (
              <li
                key={opt.value}
                onMouseDown={e => {
                  e.preventDefault()
                  handleSelect(opt)
                }}
                className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                  i === highlighted
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-200 hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    )
  }
)
