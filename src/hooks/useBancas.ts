import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Casa, CasaBanca } from '@/types'

interface ApostaFluxo {
  casa_id: string
  stake: number
  gross_return: number
  resultado: string
  created_at: string
}

export interface BancaEstado {
  casa: Casa
  ultimaBanca: CasaBanca | null
  diasSemAtualizar: number | null
  // Stakes saídos e retornos recebidos desde o último snapshot
  stakesAposSnapshot: number
  retornosAposSnapshot: number
  // Pendências ativas (apostas ainda pendentes de resultado)
  stakesPendentes: number
  // Estimativa de saldo atual
  estimativaAtual: number | null
  // Atividade: contagem de apostas nos últimos 30 dias
  opsRecentes: number
  // Score de urgência (maior = mais urgente atualizar)
  urgenciaScore: number
  corStatus: 'green' | 'yellow' | 'red'
}

export function useBancas() {
  const queryClient = useQueryClient()

  const { data: casas = [], isLoading: casasLoading } = useQuery({
    queryKey: ['casas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('casas')
        .select('*, parceiro:parceiros(*)')
        .eq('is_active', true)
        .order('nome')
      if (error) throw error
      return data as Casa[]
    },
  })

  const { data: bancasData = [], isLoading: bancasLoading } = useQuery({
    queryKey: ['casa_bancas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('casa_bancas')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as CasaBanca[]
    },
  })

  const { data: apostas = [], isLoading: apostasLoading } = useQuery({
    queryKey: ['bancas_apostas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apostas')
        .select('casa_id, stake, gross_return, resultado, created_at')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as ApostaFluxo[]
    },
  })

  const { mutateAsync: saveBanca } = useMutation({
    mutationFn: async ({ casaId, saldo }: { casaId: string; saldo: number }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await supabase.from('casa_bancas').insert({
        user_id: session!.user.id,
        casa_id: casaId,
        saldo,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casa_bancas'] })
      queryClient.invalidateQueries({ queryKey: ['bancas_apostas'] })
    },
  })

  const estadosPorCasa = useMemo((): BancaEstado[] => {
    const now = new Date()
    const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Última banca por casa (primeiro item = mais recente, pois ordenamos desc)
    const ultimaBancaPorCasa = new Map<string, CasaBanca>()
    for (const b of bancasData) {
      if (!ultimaBancaPorCasa.has(b.casa_id)) {
        ultimaBancaPorCasa.set(b.casa_id, b)
      }
    }

    // Apostas agrupadas por casa
    const apostasPorCasa = new Map<string, ApostaFluxo[]>()
    for (const a of apostas) {
      if (!apostasPorCasa.has(a.casa_id)) apostasPorCasa.set(a.casa_id, [])
      apostasPorCasa.get(a.casa_id)!.push(a)
    }

    return casas.map(casa => {
      const ultimaBanca = ultimaBancaPorCasa.get(casa.id) ?? null
      const apostasDaCasa = apostasPorCasa.get(casa.id) ?? []

      // Dias sem atualizar
      const diasSemAtualizar = ultimaBanca
        ? differenceInDays(now, parseISO(ultimaBanca.created_at))
        : null

      // Fluxo desde o último snapshot
      const snapshotDate = ultimaBanca?.created_at ?? null
      const apostasApos = snapshotDate
        ? apostasDaCasa.filter(a => a.created_at > snapshotDate)
        : apostasDaCasa

      const stakesAposSnapshot = apostasApos.reduce((s, a) => s + a.stake, 0)
      const retornosAposSnapshot = apostasApos
        .filter(a => a.resultado === 'Ganhou')
        .reduce((s, a) => s + a.gross_return, 0)

      // Pendências: apostas sem resultado ainda (dinheiro que saiu mas retorno incerto)
      const stakesPendentes = apostasDaCasa
        .filter(a => a.resultado === 'Pendente')
        .reduce((s, a) => s + a.stake, 0)

      // Estimativa: saldo base + retornos recebidos - stakes saídos
      const estimativaAtual = ultimaBanca != null
        ? Math.round((ultimaBanca.saldo + retornosAposSnapshot - stakesAposSnapshot) * 100) / 100
        : null

      // Atividade nos últimos 30 dias
      const opsRecentes = apostasDaCasa.filter(a => a.created_at >= thirtyDaysAgoStr).length

      // Score de urgência
      const diasFator = diasSemAtualizar ?? 999
      const urgenciaScore = opsRecentes * diasFator

      // Cor
      const corStatus: BancaEstado['corStatus'] =
        diasSemAtualizar === null || diasSemAtualizar > 14 ? 'red'
        : diasSemAtualizar > 7 ? 'yellow'
        : 'green'

      return {
        casa,
        ultimaBanca,
        diasSemAtualizar,
        stakesAposSnapshot,
        retornosAposSnapshot,
        stakesPendentes,
        estimativaAtual,
        opsRecentes,
        urgenciaScore,
        corStatus,
      }
    }).sort((a, b) => b.urgenciaScore - a.urgenciaScore)
  }, [casas, bancasData, apostas])

  const isLoading = casasLoading || bancasLoading || apostasLoading

  return { estadosPorCasa, isLoading, saveBanca }
}
