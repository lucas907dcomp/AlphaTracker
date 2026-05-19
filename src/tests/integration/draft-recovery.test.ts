import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { OperacaoFormData } from '@/schemas/operacaoSchema'

// NFR-5: Draft recovery — persists across reload simulation

interface DraftStore {
  draft: OperacaoFormData | null
  setDraft: (draft: OperacaoFormData) => void
  clearDraft: () => void
}

// In-memory storage — simulates localStorage in node environment
function createMockStorage() {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => { store[key] = value },
    removeItem: (key: string): void => { delete store[key] },
  }
}

const mockDraft: OperacaoFormData = {
  tipo: 'Extracao',
  data: '2026-05-18',
  valorPagoFixo: 85,
  notas: undefined,
  legs: [
    { casaId: 'casa-1', stake: 20, isFreebet: false, isDoubleGreen: false },
    { casaId: 'casa-2', stake: 39, isFreebet: false, isDoubleGreen: false },
  ],
}

describe('OperacaoDraftStore — persist + recovery', () => {
  let storage: ReturnType<typeof createMockStorage>

  beforeEach(() => {
    storage = createMockStorage()
  })

  it('setDraft persists to storage under key operacao-draft', () => {
    const useStore = create<DraftStore>()(
      persist(
        (set) => ({
          draft: null,
          setDraft: (draft) => set({ draft }),
          clearDraft: () => set({ draft: null }),
        }),
        { name: 'operacao-draft', storage: createJSONStorage(() => storage) }
      )
    )

    useStore.getState().setDraft(mockDraft)

    const raw = storage.getItem('operacao-draft')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.state.draft.tipo).toBe('Extracao')
    expect(parsed.state.draft.data).toBe('2026-05-18')
  })

  it('new store instance recovers draft from storage (simulates reload)', () => {
    // Instance A: set the draft
    const storeA = create<DraftStore>()(
      persist(
        (set) => ({
          draft: null,
          setDraft: (draft) => set({ draft }),
          clearDraft: () => set({ draft: null }),
        }),
        { name: 'operacao-draft', storage: createJSONStorage(() => storage) }
      )
    )
    storeA.getState().setDraft(mockDraft)

    // Instance B: same storage — simulates app reload
    const storeB = create<DraftStore>()(
      persist(
        (set) => ({
          draft: null,
          setDraft: (draft) => set({ draft }),
          clearDraft: () => set({ draft: null }),
        }),
        { name: 'operacao-draft', storage: createJSONStorage(() => storage) }
      )
    )

    // Trigger hydration manually (Zustand persist rehydrates async)
    storeB.persist.rehydrate()

    const recovered = storeB.getState().draft
    expect(recovered).not.toBeNull()
    expect(recovered!.tipo).toBe('Extracao')
    expect(recovered!.legs).toHaveLength(2)
  })
})
