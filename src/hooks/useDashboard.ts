import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { isInPeriod, isInDateRange } from '@/lib/dates'
import type { Operacao } from '@/types'

export type DashboardPeriod = 'day' | 'week' | 'month' | 'custom'
export type CustomDateRange = { start: string; end: string }

// For operations with a partner split, return only the user's portion of pnl
function getUserPnl(op: Operacao): number {
  if (op.pnl == null) return 0
  const hasSplit =
    (op.tipo === 'Extracao' || op.tipo === 'FreebetSePerder' || op.tipo === 'SuperOdd' || op.tipo === 'Aposta' || op.tipo === 'TentativaDuplo') &&
    op.status === 'Concluida' &&
    op.apostas?.[0]?.casa?.parceiro != null
  if (!hasSplit) return op.pnl
  const parceiro = op.apostas![0].casa!.parceiro!
  const custoLiberacao = op.custo_liberacao ?? 0
  const lucroParaSplit = op.pnl - custoLiberacao
  const parteParceiro = Math.round(lucroParaSplit * (parceiro.percentual / 100) * 100) / 100
  return Math.round((op.pnl - parteParceiro) * 100) / 100
}

export function useDashboard(period: DashboardPeriod, dateRange?: CustomDateRange) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['dashboard', period, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      const { data: result, error } = await supabase
        .from('operacoes')
        .select('*, apostas(*, casa:casas(*, parceiro:parceiros(*)))')
      if (error) throw error
      return result as Operacao[]
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
  })

  const operacoes = data ?? []
  // GeradaFreebet also has a set pnl (the qualification cost) and must appear in the dashboard
  const concluidas = operacoes.filter(op => op.status === 'Concluida' || op.status === 'GeradaFreebet')

  const concluidasInPeriod = concluidas.filter(op => {
    if (period === 'custom') {
      if (!dateRange?.start || !dateRange?.end) return false
      return isInDateRange(op.data, dateRange.start, dateRange.end)
    }
    return isInPeriod(op.data, period)
  })

  const totalPnl = concluidasInPeriod.reduce((sum, op) => sum + getUserPnl(op), 0)
  const pendentesCount = operacoes.filter(op => op.status === 'Pendente').length

  let chartData: { label: string; pnl: number }[] = []

  if (period === 'day') {
    chartData = concluidasInPeriod.map(op => ({
      label: op.tipo,
      pnl: getUserPnl(op),
    }))
  } else {
    const grouped: Record<string, number> = {}
    const labelMap: Record<string, string> = {}
    const labelFormat = period === 'week' ? 'EEE' : 'dd/MM'

    for (const op of concluidasInPeriod) {
      const key = op.data
      grouped[key] = (grouped[key] ?? 0) + getUserPnl(op)
      labelMap[key] =
        period === 'week'
          ? format(parseISO(op.data + 'T00:00:00'), labelFormat, { locale: ptBR })
          : format(parseISO(op.data + 'T00:00:00'), labelFormat)
    }

    chartData = Object.keys(grouped)
      .sort()
      .map(key => ({ label: labelMap[key], pnl: grouped[key] }))
  }

  return { totalPnl, chartData, pendentesCount, isLoading, isFetching, isError }
}
