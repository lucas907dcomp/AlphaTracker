import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Operacao } from '@/types'

export function useFreebetsDisponiveis(currentOrigemId?: string | null) {
  return useQuery({
    queryKey: ['freebets-disponiveis', currentOrigemId ?? null],
    queryFn: async () => {
      const { data: candidatos, error } = await supabase
        .from('operacoes')
        .select('id, tipo, data, valor_freebet, pnl, apostas(*, casa:casas(*, parceiro:parceiros(*)))')
        .or('and(tipo.eq.Freebet,status.eq.Concluida),and(tipo.eq.FreebetSePerder,status.eq.GeradaFreebet)')
        .order('data', { ascending: false })
      if (error) throw error

      const { data: usadas, error: usadasErr } = await supabase
        .from('operacoes')
        .select('operacao_origem_id')
        .not('operacao_origem_id', 'is', null)
      if (usadasErr) throw usadasErr

      const usadasIds = new Set((usadas ?? []).map(u => u.operacao_origem_id as string))
      // When editing, don't exclude the currently selected origin so it still appears
      if (currentOrigemId) usadasIds.delete(currentOrigemId)

      return (candidatos ?? []).filter(op => !usadasIds.has(op.id)) as Operacao[]
    },
  })
}
