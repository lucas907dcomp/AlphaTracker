import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Operacao, Aposta } from '@/types'
import type { OperacaoFormData } from '@/schemas/operacaoSchema'

type UpdateOperacaoParams = {
  operacao: Operacao
  data: OperacaoFormData
}

type ToggleDGParams = {
  apostaId: string
  operacaoId: string
  isDoubleGreen: boolean
}

type MarcarFreebetSePerderParams = {
  operacaoId: string
  apostas: Aposta[]
  ganhouPrimeira: boolean
  geradaFreebet?: boolean
}

type MarcarResultadoApostaParams = {
  operacaoId: string
  aposta: Aposta
  ganhou: boolean
}

export function useOperacoes() {
  const queryClient = useQueryClient()

  const { data: operacoes = [], isLoading, isError } = useQuery({
    queryKey: ['operacoes'],
    queryFn: async () => {
      const { data: result, error } = await supabase
        .from('operacoes')
        .select('*, apostas(*, casa:casas(*, parceiro:parceiros(*))), operacao_origem:operacoes!operacao_origem_id(id, tipo, data, valor_freebet)')
        .order('data', { ascending: false })
      if (error) throw error
      return result as Operacao[]
    },
  })

  const { mutateAsync: createOperacao } = useMutation({
    mutationFn: async (data: OperacaoFormData) => {
      const { data: { session } } = await supabase.auth.getSession()
      const isFreebetSePerder = data.tipo === 'FreebetSePerder'
      const isAposta = data.tipo === 'Aposta'
      const isPending = isFreebetSePerder || isAposta
      const totalCusto = data.legs.reduce((sum, leg) => sum + (leg.isFreebet ? 0 : leg.stake), 0)
      // custo_liberacao is informational only — already counted when FreebetSePerder was marked
      const computedPnl = data.valorPagoFixo != null
        ? Math.round((data.valorPagoFixo - totalCusto) * 100) / 100
        : 0

      const { data: opData, error: opError } = await supabase
        .from('operacoes')
        .insert({
          user_id: session!.user.id,
          tipo: data.tipo,
          data: data.data,
          valor_pago_fixo: data.valorPagoFixo ?? null,
          valor_freebet: data.valorFreebet ?? null,
          notas: data.notas ?? null,
          status: isPending ? 'Pendente' : 'Concluida',
          pnl: isPending ? null : computedPnl,
          operacao_origem_id: data.operacaoOrigemId ?? null,
          custo_liberacao: data.custoLiberacao ?? null,
        })
        .select('id')
        .single()
      if (opError) throw opError

      const apostasToInsert = data.legs.map((leg, i) => ({
        operacao_id: opData.id,
        casa_id: leg.casaId,
        stake: leg.stake,
        gross_return: isFreebetSePerder && i === 0 && leg.valorPagoFixo
          ? leg.valorPagoFixo
          : (data.valorPagoFixo ?? leg.stake),
        is_freebet: leg.isFreebet,
        is_double_green: false,
        resultado: 'Pendente',
      }))

      const { error: apostasError } = await supabase.from('apostas').insert(apostasToInsert)
      if (apostasError) throw apostasError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operacoes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const { mutateAsync: deleteOperacao } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('operacoes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operacoes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const { mutateAsync: marcarFreebetSePerder } = useMutation({
    mutationFn: async ({ operacaoId, apostas, ganhouPrimeira, geradaFreebet }: MarcarFreebetSePerderParams) => {
      const [primeiraAposta, ...outrasApostas] = apostas
      const outraIds = outrasApostas.map(a => a.id)

      if (ganhouPrimeira) {
        const { error: w } = await supabase
          .from('apostas').update({ resultado: 'Ganhou' }).eq('id', primeiraAposta.id)
        if (w) throw w
        if (outraIds.length > 0) {
          const { error: l } = await supabase
            .from('apostas').update({ resultado: 'Perdeu' }).in('id', outraIds)
          if (l) throw l
        }
      } else {
        const { error: l } = await supabase
          .from('apostas').update({ resultado: 'Perdeu' }).eq('id', primeiraAposta.id)
        if (l) throw l
        if (outraIds.length > 0) {
          const { error: w } = await supabase
            .from('apostas').update({ resultado: 'Ganhou' }).in('id', outraIds)
          if (w) throw w
        }
      }

      const totalCusto = apostas.reduce((sum, a) => sum + (a.is_freebet ? 0 : a.stake), 0)
      const grossReturn = ganhouPrimeira
        ? primeiraAposta.gross_return
        : (outrasApostas[0]?.gross_return ?? 0)
      const pnl = Math.round((grossReturn - totalCusto) * 100) / 100

      // GeradaFreebet: principal perdeu e bônus foi creditado — status especial
      const status = (!ganhouPrimeira && geradaFreebet) ? 'GeradaFreebet' : 'Concluida'

      const { error } = await supabase
        .from('operacoes')
        .update({ pnl, status })
        .eq('id', operacaoId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operacoes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const { mutateAsync: updateOperacao } = useMutation({
    mutationFn: async ({ operacao, data }: UpdateOperacaoParams) => {
      const isFSP = data.tipo === 'FreebetSePerder'
      const isAposta = data.tipo === 'Aposta'
      const isPending = isFSP || isAposta
      const totalCusto = data.legs.reduce((sum, leg) => sum + (leg.isFreebet ? 0 : leg.stake), 0)
      const computedPnl = !isPending && data.valorPagoFixo != null
        ? Math.round((data.valorPagoFixo - totalCusto) * 100) / 100
        : 0
      const { error: opError } = await supabase
        .from('operacoes')
        .update({
          tipo: data.tipo,
          data: data.data,
          valor_pago_fixo: data.valorPagoFixo ?? null,
          valor_freebet: data.valorFreebet ?? null,
          notas: data.notas ?? null,
          status: isPending ? 'Pendente' : 'Concluida',
          pnl: isPending ? null : computedPnl,
          operacao_origem_id: data.operacaoOrigemId ?? null,
          custo_liberacao: data.custoLiberacao ?? null,
        })
        .eq('id', operacao.id)
      if (opError) throw opError

      const { error: deleteError } = await supabase
        .from('apostas')
        .delete()
        .eq('operacao_id', operacao.id)
      if (deleteError) throw deleteError

      const apostasToInsert = data.legs.map((leg, i) => ({
        operacao_id: operacao.id,
        casa_id: leg.casaId,
        stake: leg.stake,
        gross_return: isFSP && i === 0 && leg.valorPagoFixo
          ? leg.valorPagoFixo
          : (data.valorPagoFixo ?? leg.stake),
        is_freebet: leg.isFreebet,
        is_double_green: leg.isDoubleGreen,
      }))
      const { error: insertError } = await supabase.from('apostas').insert(apostasToInsert)
      if (insertError) throw insertError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operacoes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const { mutateAsync: marcarResultadoAposta } = useMutation({
    mutationFn: async ({ operacaoId, aposta, ganhou }: MarcarResultadoApostaParams) => {
      const { error: apostasErr } = await supabase
        .from('apostas')
        .update({ resultado: ganhou ? 'Ganhou' : 'Perdeu' })
        .eq('id', aposta.id)
      if (apostasErr) throw apostasErr

      const pnl = ganhou
        ? Math.round((aposta.gross_return - aposta.stake) * 100) / 100
        : Math.round(-aposta.stake * 100) / 100

      const { error } = await supabase
        .from('operacoes')
        .update({ pnl, status: 'Concluida' })
        .eq('id', operacaoId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operacoes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const { mutateAsync: toggleDoubleGreen } = useMutation({
    mutationFn: async ({ apostaId, operacaoId, isDoubleGreen }: ToggleDGParams) => {
      const { data: aposta, error: fetchErr } = await supabase
        .from('apostas')
        .select('gross_return')
        .eq('id', apostaId)
        .single()
      if (fetchErr) throw fetchErr

      const { error: toggleErr } = await supabase
        .from('apostas')
        .update({ is_double_green: isDoubleGreen })
        .eq('id', apostaId)
      if (toggleErr) throw toggleErr

      const { data: opData, error: opErr } = await supabase
        .from('operacoes')
        .select('pnl')
        .eq('id', operacaoId)
        .single()
      if (opErr) throw opErr

      const delta = isDoubleGreen ? aposta.gross_return : -aposta.gross_return
      const newPnl = Math.round(((opData.pnl ?? 0) + delta) * 100) / 100

      const { error: updateErr } = await supabase
        .from('operacoes')
        .update({ pnl: newPnl })
        .eq('id', operacaoId)
      if (updateErr) throw updateErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operacoes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return {
    operacoes,
    isLoading,
    isError,
    createOperacao,
    deleteOperacao,
    marcarFreebetSePerder,
    marcarResultadoAposta,
    updateOperacao,
    toggleDoubleGreen,
  }
}
