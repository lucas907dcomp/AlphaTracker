import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OperacaoFormData } from '@/schemas/operacaoSchema'

interface OperacaoDraftStore {
  draft: OperacaoFormData | null
  setDraft: (draft: OperacaoFormData) => void
  clearDraft: () => void
}

export const useOperacaoDraftStore = create<OperacaoDraftStore>()(
  persist(
    (set) => ({
      draft: null,
      setDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: null }),
    }),
    { name: 'operacao-draft' }
  )
)
