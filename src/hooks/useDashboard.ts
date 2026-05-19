import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { isInPeriod } from '@/lib/dates'
import type { Operacao } from '@/types'

export type DashboardPeriod = 'day' | 'week' | 'month'

export function useDashboard(period: DashboardPeriod) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: async () => {
      const { data: result, error } = await supabase
        .from('operacoes')
        .select('*, apostas(*, casa:casas(*))')
      if (error) throw error
      return result as Operacao[]
    },
  })

  const operacoes = data ?? []
  const concluidas = operacoes.filter(op => op.status === 'Concluida')
  const concluidasInPeriod = concluidas.filter(op => isInPeriod(op.data, period))
  const totalPnl = concluidasInPeriod.reduce((sum, op) => sum + (op.pnl ?? 0), 0)
  const pendentesCount = operacoes.filter(op => op.status === 'Pendente').length

  let chartData: { label: string; pnl: number }[] = []

  if (period === 'day') {
    chartData = concluidasInPeriod.map(op => ({
      label: op.tipo,
      pnl: op.pnl ?? 0,
    }))
  } else {
    const grouped: Record<string, number> = {}
    const labelMap: Record<string, string> = {}
    const labelFormat = period === 'week' ? 'EEE' : 'dd/MM'

    for (const op of concluidasInPeriod) {
      const key = op.data
      grouped[key] = (grouped[key] ?? 0) + (op.pnl ?? 0)
      labelMap[key] =
        period === 'week'
          ? format(parseISO(op.data + 'T00:00:00'), labelFormat, { locale: ptBR })
          : format(parseISO(op.data + 'T00:00:00'), labelFormat)
    }

    chartData = Object.keys(grouped)
      .sort()
      .map(key => ({ label: labelMap[key], pnl: grouped[key] }))
  }

  return { totalPnl, chartData, pendentesCount, isLoading, isError }
}
