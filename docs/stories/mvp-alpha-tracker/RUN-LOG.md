# RUN-LOG — mvp-alpha-tracker Pipeline

Pipeline: AlphaTracker MVP (epic-mvp-alpha-tracker)
Mode: YOLO (autonomous) — user authorization: "pode dar prosseguimento, chamas os agentes necessários"
Constraint: REL-001 (all dev on local PostgreSQL; Supabase Cloud migration deferred to project end)

---

## Wave 3: PnL Engine [HARD GATE] — 2026-05-18

**Status:** ✅ DONE (HARD GATE CLEARED)
**Agent:** @dev (Dex), @qa (Quinn)
**Stories:** MVP-3-1, MVP-3-2

### Delivered
- `src/lib/pnl.ts` — 4 PnL formulas with decimal.js (CON-3 compliant)
- `src/lib/dates.ts` — date utility
- `src/lib/__tests__/pnl.test.ts` — 6 P0 vitest tests
- QA gate files: `docs/qa/gates/mvp-3-1-pnl-engine.yml`, `mvp-3-2-pnl-tests.yml`

### Decisions
- CON-3: decimal.js mandatory for ALL arithmetic in pnl.ts — never native float operators
- `Aposta` type uses snake_case fields: `gross_return`, `is_freebet`, `is_double_green`, `casa_id`
- HARD GATE cleared: 6/6 P0 vitest tests pass before Wave 4 start

### Gate Verdicts
- MVP-3-1: PASS
- MVP-3-2: PASS (HARD GATE cleared)

### Carry-forward to Wave 4
- `calcularCenariosPnL(apostas: Aposta[]): CenarioPnL[]` available at `@/lib/pnl`
- Wave 4 unblocked

### Original handoffs
Archived: `.aiox/handoffs/_archive/mvp-alpha-tracker/` (wave3 x3 files)

---

## Wave 4: Operations Form — 2026-05-18

**Status:** ✅ DONE
**Agent:** @dev (Dex), @qa (Quinn)
**Stories:** MVP-4-1, MVP-4-2, MVP-4-3

### Delivered
- `src/hooks/useOperacoes.ts` — TanStack Query CRUD: createOperacao (2-step insert), deleteOperacao, marcarResultado
- `src/stores/operacaoDraftStore.ts` — Zustand persist (draft recovery, NFR-5)
- `src/components/operacoes/LegRow.tsx` — single aposta row, Tab/Enter keyboard navigation
- `src/components/operacoes/PnLPreview.tsx` — real-time PnL preview via calcularCenariosPnL
- `src/components/operacoes/OperacaoForm.tsx` — useFieldArray + valorPagoFixo propagation
- `src/pages/NovaOperacaoPage.tsx` — replaced stub, draft restore, navigate on success
- QA gate files: `docs/qa/gates/mvp-4-1-*.yml`, `mvp-4-2-*.yml`, `mvp-4-3-*.yml`

### Decisions
- `operacoes.data` naming collision: always `const { data: result, error } = await supabase.from('operacoes')...`
- camelCase→snake_case explicit mapping in all mutations (valorPagoFixo→valor_pago_fixo, etc.)
- Route `/operacoes/nova` pre-existed in router.tsx — used as-is (story spec had `/nova-operacao` typo)
- Two eslint-disable-next-line for exhaustive-deps in OperacaoForm (intentional — including fields/setValue in deps causes infinite render loops)

### Gate Verdicts
- MVP-4-1: CONCERNS (TEST-001: no hook unit tests; REL-001: browser deferred)
- MVP-4-2: CONCERNS (TEST-001: no component tests; MNT-001: Controller→Select coupling)
- MVP-4-3: CONCERNS (REL-001: AC-4 browser deferred; MNT-001: eslint suppression)

### Carry-forward to Wave 5
- `useOperacoes()` exports: `{ operacoes, isLoading, isError, createOperacao, deleteOperacao, marcarResultado }`
- `marcarResultado` signature: `{ operacaoId: string, winnerApostaId: string, apostas: Aposta[] }`
- Wave 5 unblocked

### Original handoffs
Archived: `.aiox/handoffs/_archive/mvp-alpha-tracker/` (wave4 x3 files)
