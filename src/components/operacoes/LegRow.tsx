import { Controller } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type { OperacaoFormData } from '@/schemas/operacaoSchema'
import type { Casa } from '@/types'
import { Combobox } from '@/components/ui/Combobox'
import { CentavosInput } from '@/components/ui/CentavosInput'

interface LegRowProps {
  index: number
  isLast: boolean
  control: Control<OperacaoFormData>
  onRemove: () => void
  onAddNext: () => void
  casas: Casa[]
  autoFocusCasa?: boolean
  showExtraValorFixo?: boolean
}

export function LegRow({ index, isLast: _isLast, control, onRemove, onAddNext: _onAddNext, casas, autoFocusCasa, showExtraValorFixo }: LegRowProps) {
  const casaOptions = casas.map(c => ({ value: c.id, label: c.nome }))

  return (
    <div className="flex items-center gap-1.5">
      <Controller
        control={control}
        name={`legs.${index}.casaId`}
        render={({ field, fieldState }) => (
          <Combobox
            {...field}
            options={casaOptions}
            placeholder="Casa..."
            error={fieldState.error?.message}
            autoFocus={autoFocusCasa}
            className="flex-1 min-w-0"
          />
        )}
      />
      <Controller
        control={control}
        name={`legs.${index}.stake`}
        render={({ field, fieldState }) => (
          <CentavosInput
            value={field.value || undefined}
            onChange={field.onChange}
            placeholder="0,00"
            error={fieldState.error?.message}
            className="w-24"
          />
        )}
      />
      {showExtraValorFixo && (
        <Controller
          control={control}
          name={`legs.${index}.valorPagoFixo`}
          render={({ field }) => (
            <CentavosInput
              value={field.value ?? undefined}
              onChange={field.onChange}
              placeholder="ret."
              className="w-20"
            />
          )}
        />
      )}
      <Controller
        control={control}
        name={`legs.${index}.isFreebet`}
        render={({ field: { value, onChange, onBlur, ref } }) => (
          <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer whitespace-nowrap select-none">
            <input
              type="checkbox"
              checked={value}
              onChange={e => onChange(e.target.checked)}
              onBlur={onBlur}
              ref={ref}
              tabIndex={-1}
              className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-0"
            />
            FB
          </label>
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={onRemove}
        aria-label="Remover leg"
        className={`text-lg leading-none px-1 transition-colors ${
          index === 0 ? 'invisible pointer-events-none' : 'text-slate-700 hover:text-red-400'
        }`}
      >
        ×
      </button>
    </div>
  )
}
