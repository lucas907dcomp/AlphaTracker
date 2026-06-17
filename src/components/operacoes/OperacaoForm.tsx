import { useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { operacaoSchema, type OperacaoFormData } from '@/schemas/operacaoSchema'
import { useCasas } from '@/hooks/useCasas'
import { LegRow } from './LegRow'
import { FreebetOrigemPicker } from './FreebetOrigemPicker'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { CentavosInput } from '@/components/ui/CentavosInput'

const TIPO_OPTIONS = [
  { value: 'Extracao', label: 'Extração' },
  { value: 'Freebet', label: 'Freebet' },
  { value: 'FreebetSePerder', label: 'Freebet se Perder' },
  { value: 'SuperOdd', label: 'Super Odd' },
  { value: 'TentativaDuplo', label: 'Tentativa Duplo' },
  { value: 'Aposta', label: 'Aposta' },
]

function getLocalDateString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const emptyLeg = { casaId: '', stake: 0, isFreebet: false, isDoubleGreen: false }

interface Props {
  onSubmit: (data: OperacaoFormData) => Promise<void>
  defaultValues?: Partial<OperacaoFormData>
}

export function OperacaoForm({ onSubmit, defaultValues }: Props) {
  const { casas } = useCasas()
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<OperacaoFormData>({
    resolver: zodResolver(operacaoSchema),
    defaultValues: defaultValues ?? {
      tipo: 'Extracao',
      data: getLocalDateString(),
      valorPagoFixo: undefined,
      legs: [emptyLeg, emptyLeg, emptyLeg],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'legs' })
  const watchedTipo = watch('tipo')
  const isFreebetSePerder = watchedTipo === 'FreebetSePerder'
  const isFreebet = watchedTipo === 'Freebet' || isFreebetSePerder
  const isExtracao = watchedTipo === 'Extracao'
  const isAposta = watchedTipo === 'Aposta'

  // Aposta allows only 1 leg — trim extras when switching to this type
  useEffect(() => {
    if (isAposta && fields.length > 1) {
      for (let i = fields.length - 1; i > 0; i--) remove(i)
    }
  }, [isAposta]) // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {/* Tipo + Data + Valor Fixo (FreebetSePerder only) */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[130px]">
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select
                {...field}
                label="Tipo"
                options={TIPO_OPTIONS}
                error={errors.tipo?.message}
              />
            )}
          />
        </div>
        {/* tabIndex=-1: date rarely changes, skip in Tab flow */}
        <div className="w-36">
          <Input
            label="Data"
            type="date"
            tabIndex={-1}
            error={errors.data?.message}
            {...register('data')}
          />
        </div>
        <div className="w-28">
          <Controller
            control={control}
            name="valorPagoFixo"
            render={({ field }) => (
              <CentavosInput
                value={field.value}
                onChange={field.onChange}
                label={isAposta ? 'Retorno' : 'Retorno Bruto'}
                placeholder="0,00"
              />
            )}
          />
        </div>
      </div>

      {/* Valor Freebet annotation (Freebet / FreebetSePerder only) */}
      {isFreebet && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wide whitespace-nowrap">Valor FB recebido</span>
          <div className="w-28">
            <Controller
              control={control}
              name="valorFreebet"
              render={({ field }) => (
                <CentavosInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="0,00"
                />
              )}
            />
          </div>
        </div>
      )}

      {/* Extração: origem freebet + custo liberação */}
      {isExtracao && (
        <div className="space-y-2 border border-slate-800 rounded-lg p-3 bg-slate-900/50">
          <Controller
            control={control}
            name="operacaoOrigemId"
            render={({ field }) => (
              <FreebetOrigemPicker
                value={field.value ?? null}
                onChange={field.onChange}
                onCustoLiberacaoChange={custo => setValue('custoLiberacao', custo > 0 ? custo : null)}
                error={errors.operacaoOrigemId?.message}
              />
            )}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono uppercase tracking-wide whitespace-nowrap">Custo liberação</span>
            <div className="w-28">
              <Controller
                control={control}
                name="custoLiberacao"
                render={({ field }) => (
                  <CentavosInput
                    value={field.value ?? null}
                    onChange={v => field.onChange(v ?? null)}
                    placeholder="0,00"
                  />
                )}
              />
            </div>
            <span className="text-xs text-slate-600">(preenchido automaticamente)</span>
          </div>
        </div>
      )}

      {/* Legs */}
      <div className="space-y-1.5">
        {fields.map((field, i) => (
          <LegRow
            key={field.id}
            index={i}
            isLast={i === fields.length - 1}
            control={control}
            onRemove={() => remove(i)}
            onAddNext={() => append(emptyLeg)}
            casas={casas}
            autoFocusCasa={false}
            showExtraValorFixo={isFreebetSePerder && i === 0}
          />
        ))}
        {!isAposta && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => append(emptyLeg)}
            className="text-xs text-slate-600 hover:text-blue-400 transition-colors mt-1"
          >
            + Adicionar Casa
          </button>
        )}
      </div>

      {/* Observações */}
      <textarea
        {...register('notas')}
        placeholder="Observações (jogo, evento, detalhes...)"
        rows={2}
        className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
      />

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        {(isFreebetSePerder || isAposta) ? (
          <p className="text-xs text-yellow-500/70 font-mono">
            Ficará pendente até marcar resultado
          </p>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={isSubmitting} loading={isSubmitting} className="shrink-0 whitespace-nowrap">
          Salvar →
        </Button>
      </div>
    </form>
  )
}
