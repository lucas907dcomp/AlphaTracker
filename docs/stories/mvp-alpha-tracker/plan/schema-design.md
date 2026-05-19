# Schema Design — AlphaTracker MVP

> **Author:** @data-engineer (Dara)
> **Date:** 2026-05-18
> **Spec ref:** spec.md v2, Section 3.4 (DM-1..DM-4)
> **Status:** APPROVED — ready for implementation (plan subtasks 1.5, 1.6)

---

## Domain Overview

AlphaTracker is a **single-tenant-per-account** financial tracking tool for matched betting and sports arbitrage. Every piece of data belongs to exactly one `auth.users` row. Multi-tenancy is enforced entirely at the database layer via Row Level Security — the application never filters by `user_id` in SQL; Postgres RLS does it automatically for every query.

**Entities:**

```
auth.users (Supabase managed)
    │
    ├─── casas (1:N)       — Betting houses per user
    │
    └─── operacoes (1:N)   — Betting operations per user
              │
              └─── apostas (1:N)  — Individual bet legs per operation
```

---

## Entity Catalog

### `auth.users` — Supabase Managed

Not created by migrations. Supabase Auth provides this table. Referenced as a FK parent by `casas.user_id` and `operacoes.user_id`.

---

### `casas` — Betting Houses

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID PK | NOT NULL | `gen_random_uuid()` | |
| `user_id` | UUID FK | NOT NULL | — | → `auth.users(id)` ON DELETE CASCADE |
| `nome` | TEXT | NOT NULL | — | Unique per user; non-empty |
| `is_active` | BOOLEAN | NOT NULL | `true` | Soft delete flag |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Auto-managed by trigger |

**Constraints:**
- `casas_user_nome_unique UNIQUE (user_id, nome)` — duplicate names rejected per account
- `casas_nome_not_empty CHECK (LENGTH(TRIM(nome)) > 0)` — whitespace-only names rejected

**Indexes:**
- `idx_casas_user_id ON casas(user_id)` — general FK lookup
- `idx_casas_user_active ON casas(user_id) WHERE is_active = true` — LegRow dropdown hot path

**RLS:** `casas_users_own FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`

**Soft delete pattern:** Set `is_active = false` to retire a bookmaker. The casa remains referenced in historical `apostas` rows and displays correctly. Hard deletion is blocked by the RESTRICT FK on `apostas.casa_id`.

---

### `operacoes` — Betting Operations

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID PK | NOT NULL | `gen_random_uuid()` | |
| `user_id` | UUID FK | NOT NULL | — | → `auth.users(id)` ON DELETE CASCADE |
| `tipo` | TEXT | NOT NULL | — | Enum (5 values) |
| `data` | DATE | NOT NULL | `CURRENT_DATE` | Logical op date; used in dashboard aggregations |
| `status` | TEXT | NOT NULL | `'Pendente'` | `Pendente` or `Concluida` |
| `valor_pago_fixo` | NUMERIC(10,2) | NULL | `null` | Fixed gross return (symmetric); NULL if asymmetric |
| `pnl` | NUMERIC(10,2) | NULL | `null` | Final PnL; NULL while Pendente |
| `notas` | TEXT | NULL | `null` | Free-text notes |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Auto-managed by trigger |

**Constraints:**
- `operacoes_tipo_check CHECK (tipo IN ('Freebet','Extracao','SuperOdd','TentativaDuplo','Aposta'))`
- `operacoes_status_check CHECK (status IN ('Pendente','Concluida'))`
- `operacoes_pnl_concluida CHECK (status != 'Concluida' OR pnl IS NOT NULL)` — advisory safety net; main enforcement at app level

**Indexes:**
- `idx_operacoes_user_id ON operacoes(user_id)` — base lookup
- `idx_operacoes_user_status_data ON operacoes(user_id, status, data DESC)` — **dashboard critical**: `WHERE user_id = $1 AND status = 'Concluida' AND data >= $2`
- `idx_operacoes_user_status_pendente ON operacoes(user_id) WHERE status = 'Pendente'` — pending list
- `idx_operacoes_user_tipo ON operacoes(user_id, tipo)` — dashboard tipo filter

**RLS:** `operacoes_users_own FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`

> **Note on `data` column name:** In Supabase JS, the `{ data, error }` destructuring pattern uses `data` as the response wrapper. The table column `operacoes.data` is accessed as `row.data` in the query result array — this is unambiguous but worth noting for developers. Consider aliasing in queries: `SELECT data AS data_operacao ...` if confusion arises.

---

### `apostas` — Bet Legs

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID PK | NOT NULL | `gen_random_uuid()` | |
| `operacao_id` | UUID FK | NOT NULL | — | → `operacoes(id)` ON DELETE CASCADE |
| `casa_id` | UUID FK | NOT NULL | — | → `casas(id)` ON DELETE RESTRICT |
| `stake` | NUMERIC(10,2) | NOT NULL | — | Always > 0 |
| `gross_return` | NUMERIC(10,2) | NOT NULL | — | Always > 0; raw value (not pre-doubled for Duplo Verde) |
| `is_freebet` | BOOLEAN | NOT NULL | `false` | SNR: cost = 0 in PnL formula |
| `is_double_green` | BOOLEAN | NOT NULL | `false` | PnL engine multiplies gross_return × 2 at calculation time |
| `resultado` | TEXT | NOT NULL | `'Pendente'` | `Ganhou`, `Perdeu`, or `Pendente` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Auto-managed by trigger |

**Constraints:**
- `apostas_resultado_check CHECK (resultado IN ('Ganhou','Perdeu','Pendente'))`
- `apostas_stake_positive CHECK (stake > 0)` — financial integrity
- `apostas_gross_return_positive CHECK (gross_return > 0)` — financial integrity

**Indexes:**
- `idx_apostas_operacao_id ON apostas(operacao_id)` — **critical**: every OperacaoCard loads legs via JOIN
- `idx_apostas_casa_id ON apostas(casa_id)` — FK RESTRICT enforcement + casa name JOIN

**RLS:** `apostas_users_own FOR ALL TO authenticated`
```sql
USING (EXISTS (SELECT 1 FROM operacoes WHERE id = apostas.operacao_id AND user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM operacoes WHERE id = apostas.operacao_id AND user_id = auth.uid()))
```
> Both `USING` and `WITH CHECK` must contain the subquery. The spec draft omitted `WITH CHECK`, leaving a write bypass: a malicious client could INSERT an aposta pointing to another user's `operacao_id`. Fixed in the production migrations.

---

## Access Patterns & Index Coverage

| Query Pattern | Index Used |
|--------------|------------|
| List active casas for dropdown | `idx_casas_user_active` |
| List pending operations | `idx_operacoes_user_status_pendente` |
| Dashboard: PnL sum by period | `idx_operacoes_user_status_data` |
| Dashboard: filter by tipo | `idx_operacoes_user_tipo` |
| Load all legs for one operation | `idx_apostas_operacao_id` |
| Check casa existence before RESTRICT | `idx_apostas_casa_id` |

---

## RLS Security Model

All tables use Postgres Row Level Security with `TO authenticated`. Unauthenticated (`anon`) connections receive 0 rows — not a permission error, just an empty result set.

```
Service Role Key (admin only, never in client)
   → bypasses RLS entirely — use only for migrations and admin scripts

anon Key (public, in frontend .env)
   → cannot read any rows (no policy for anon role)

authenticated (logged-in user session)
   → casas: sees only own rows
   → operacoes: sees only own rows
   → apostas: sees only rows whose parent operacao belongs to them
```

**RLS isolation test** (from spec Section 6.3):
> User B must receive 0 rows when querying `operacoes` while User A has data.
> Integration test in `src/lib/__tests__/integration.test.ts` (plan subtask 6.5) validates this.

---

## Naming Conventions

| Layer | Convention | Example |
|-------|-----------|---------|
| SQL columns | `snake_case` | `gross_return`, `is_freebet`, `valor_pago_fixo` |
| TypeScript | `camelCase` | `grossReturn`, `isFreebet`, `valorPagoFixo` |
| Supabase JS | Returns `snake_case` from DB | Map manually or use `camelcase-keys` package |

---

## Migration Execution Order

```bash
# Apply
supabase db push
# or manually:
psql -f supabase/migrations/001_create_casas.sql
psql -f supabase/migrations/002_create_operacoes.sql
psql -f supabase/migrations/003_create_apostas.sql

# Validate
psql -f supabase/tests/smoke_test.sql

# Rollback (if needed — reverse order)
psql -f supabase/migrations/rollback/003_rollback.sql
psql -f supabase/migrations/rollback/002_rollback.sql
psql -f supabase/migrations/rollback/001_rollback.sql
```

---

## Files Produced

| File | Purpose |
|------|---------|
| `supabase/migrations/001_create_casas.sql` | Production migration — casas + set_updated_at function |
| `supabase/migrations/002_create_operacoes.sql` | Production migration — operacoes |
| `supabase/migrations/003_create_apostas.sql` | Production migration — apostas |
| `supabase/migrations/rollback/001_rollback.sql` | Rollback — DROP casas + function |
| `supabase/migrations/rollback/002_rollback.sql` | Rollback — DROP operacoes |
| `supabase/migrations/rollback/003_rollback.sql` | Rollback — DROP apostas |
| `supabase/tests/smoke_test.sql` | 10-assertion schema validation |
| `docs/stories/mvp-alpha-tracker/plan/schema-design.md` | This document |

---

## Implementation Plan Link

These migrations correspond to plan subtasks:
- **1.5** — `001_create_casas.sql` + `002_create_operacoes.sql`
- **1.6** — `003_create_apostas.sql`

**Prerequisite cleared.** Implementation can proceed with plan phase-1.
