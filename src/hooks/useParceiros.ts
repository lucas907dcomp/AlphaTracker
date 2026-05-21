import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Parceiro, ParceiroRepasse } from '@/types'

export function useParceiros() {
  const queryClient = useQueryClient()

  const { data: parceiros = [], isLoading, isError } = useQuery({
    queryKey: ['parceiros'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parceiros')
        .select('*')
        .order('nome')
      if (error) throw error
      return data as Parceiro[]
    },
  })

  const { mutateAsync: createParceiro } = useMutation({
    mutationFn: async ({ nome, percentual }: { nome: string; percentual: number }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await supabase.from('parceiros').insert({
        nome,
        percentual,
        user_id: session!.user.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parceiros'] })
    },
  })

  const { mutateAsync: deleteParceiro } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('parceiros').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parceiros'] })
      queryClient.invalidateQueries({ queryKey: ['casas'] })
    },
  })

  const { mutateAsync: createRepasse } = useMutation({
    mutationFn: async ({
      parceiroId,
      valor,
      data,
      notas,
    }: {
      parceiroId: string
      valor: number
      data: string
      notas?: string
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await supabase.from('parceiro_repasses').insert({
        parceiro_id: parceiroId,
        valor,
        data,
        notas: notas ?? null,
        user_id: session!.user.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parceiro-repasses-all'] })
    },
  })

  const { mutateAsync: deleteRepasse } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('parceiro_repasses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parceiro-repasses-all'] })
    },
  })

  return {
    parceiros,
    isLoading,
    isError,
    createParceiro,
    deleteParceiro,
    createRepasse,
    deleteRepasse,
  }
}

export function useParceiroRepasses(parceiroId: string) {
  return useQuery({
    queryKey: ['parceiro-repasses', parceiroId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parceiro_repasses')
        .select('*')
        .eq('parceiro_id', parceiroId)
        .order('data', { ascending: false })
      if (error) throw error
      return data as ParceiroRepasse[]
    },
    enabled: !!parceiroId,
  })
}

export function useAllRepasses() {
  return useQuery({
    queryKey: ['parceiro-repasses-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parceiro_repasses')
        .select('*')
        .order('data', { ascending: false })
      if (error) throw error
      return data as ParceiroRepasse[]
    },
  })
}
