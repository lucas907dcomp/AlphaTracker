import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Casa } from '@/types'

export function useCasas() {
  const queryClient = useQueryClient()

  const { data: casas = [], isLoading, isError } = useQuery({
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

  const { mutateAsync: createCasa } = useMutation({
    mutationFn: async (nome: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await supabase.from('casas').insert({ nome, user_id: session!.user.id })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['casas'] }),
  })

  const { mutateAsync: deactivateCasa } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('casas')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['casas'] }),
  })

  const { mutateAsync: updateCasaParceiro } = useMutation({
    mutationFn: async ({ casaId, parceiroId }: { casaId: string; parceiroId: string | null }) => {
      const { error } = await supabase
        .from('casas')
        .update({ parceiro_id: parceiroId })
        .eq('id', casaId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['casas'] }),
  })

  return { casas, isLoading, isError, createCasa, deactivateCasa, updateCasaParceiro }
}
