-- =============================================================================
-- Migration 002: operacoes table
-- Domain:  AlphaTracker — Sports Arbitrage & Matched Betting Tracker
-- Author:  @data-engineer (Dara)
-- Date:    2026-05-18
-- Spec:    docs/stories/mvp-alpha-tracker/spec/spec.md v2, Section 3.4 (DM-3)
-- Depends: 001_create_casas.sql (set_updated_at function must exist)
-- Rollback: supabase/migrations/rollback/002_rollback.sql
-- =============================================================================
--
-- Enhancements over spec draft:
--   + updated_at column + trigger
--   + idx_operacoes_user_id — base FK index
--   + idx_operacoes_user_status_data — critical index for dashboard queries
--   + idx_operacoes_user_status (partial) — pending list hot path
--   + idx_operacoes_user_tipo — dashboard filter by operation type
--   + operacoes_pnl_concluida — advisory CHECK: pnl must be set when Concluída
--   + TO authenticated on RLS policy
--   + COMMENT ON all columns
-- =============================================================================

BEGIN;

-- ── Table: operacoes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operacoes (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo             TEXT          NOT NULL,
  data             DATE          NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT          NOT NULL DEFAULT 'Pendente',
  valor_pago_fixo  NUMERIC(10,2),            -- NULL for asymmetric freebets
  pnl              NUMERIC(10,2),            -- NULL while status = 'Pendente'
  notas            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT operacoes_tipo_check CHECK (
    tipo IN ('Freebet','Extracao','SuperOdd','TentativaDuplo','Aposta')
  ),
  CONSTRAINT operacoes_status_check CHECK (
    status IN ('Pendente','Concluida')
  ),
  -- Advisory: pnl must be populated when marking operation as Concluída.
  -- Enforced at application level (marcarResultado mutation); DB constraint as safety net.
  CONSTRAINT operacoes_pnl_concluida CHECK (
    status != 'Concluida' OR pnl IS NOT NULL
  )
);

-- ── Documentation ─────────────────────────────────────────────────────────
COMMENT ON TABLE operacoes IS
  'A matched-betting operation: one logical event grouping multiple apostas (legs) across bookmakers.';
COMMENT ON COLUMN operacoes.user_id IS
  'Owner. RLS enforces auth.uid() = user_id.';
COMMENT ON COLUMN operacoes.tipo IS
  'Operation type. Enum: Freebet | Extracao | SuperOdd | TentativaDuplo | Aposta.';
COMMENT ON COLUMN operacoes.data IS
  'Logical date of the operation (user-entered or defaulted to today). '
  'Used for daily/weekly/monthly dashboard aggregation. '
  'NOTE: column is named "data" — in Supabase JS responses, access as row.data (not to be confused with the {data, error} destructuring pattern).';
COMMENT ON COLUMN operacoes.status IS
  'Pendente: waiting for result. Concluida: result confirmed, pnl is set.';
COMMENT ON COLUMN operacoes.valor_pago_fixo IS
  'Gross return applied to ALL legs equally (symmetric bet). '
  'NULL when operation is asymmetric: each aposta has its own gross_return. '
  'At most one of {valor_pago_fixo, per-leg gross_return} should be the source of truth — enforced in Zod schema.';
COMMENT ON COLUMN operacoes.pnl IS
  'Final PnL in BRL. Calculated client-side with decimal.js and stored when user marks result. '
  'NULL while status = Pendente. Negative values represent a loss.';
COMMENT ON COLUMN operacoes.notas IS
  'Optional free-text notes. Not used in PnL calculations.';
COMMENT ON COLUMN operacoes.updated_at IS
  'Auto-updated on every row modification via trigger set_operacoes_updated_at.';

-- ── Indexes ───────────────────────────────────────────────────────────────
-- General FK lookup
CREATE INDEX IF NOT EXISTS idx_operacoes_user_id
  ON operacoes (user_id);

-- Dashboard hot path: filter Concluídas + sort by date
-- Query pattern: WHERE user_id = $1 AND status = 'Concluida' AND data >= $2
CREATE INDEX IF NOT EXISTS idx_operacoes_user_status_data
  ON operacoes (user_id, status, data DESC);

-- Pending operations list hot path
-- Query pattern: WHERE user_id = $1 AND status = 'Pendente'
CREATE INDEX IF NOT EXISTS idx_operacoes_user_status_pendente
  ON operacoes (user_id)
  WHERE status = 'Pendente';

-- Dashboard filter by operation type
-- Query pattern: WHERE user_id = $1 AND tipo = $2 AND status = 'Concluida' AND data >= $3
CREATE INDEX IF NOT EXISTS idx_operacoes_user_tipo
  ON operacoes (user_id, tipo);

-- ── Trigger: updated_at ───────────────────────────────────────────────────
CREATE TRIGGER set_operacoes_updated_at
  BEFORE UPDATE ON operacoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────
ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operacoes_users_own"
  ON operacoes
  FOR ALL
  TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;

-- =============================================================================
-- Verification queries (run after applying migration):
--
-- SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE tablename = 'operacoes';
--
-- SELECT conname, contype, consrc
--   FROM pg_constraint
--   WHERE conrelid = 'operacoes'::regclass;
--
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'operacoes'; -- must be TRUE
-- =============================================================================
