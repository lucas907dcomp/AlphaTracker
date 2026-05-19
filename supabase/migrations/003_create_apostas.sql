-- =============================================================================
-- Migration 003: apostas table
-- Domain:  AlphaTracker — Sports Arbitrage & Matched Betting Tracker
-- Author:  @data-engineer (Dara)
-- Date:    2026-05-18
-- Spec:    docs/stories/mvp-alpha-tracker/spec/spec.md v2, Section 3.4 (DM-4)
-- Depends: 001_create_casas.sql, 002_create_operacoes.sql
-- Rollback: supabase/migrations/rollback/003_rollback.sql
-- =============================================================================
--
-- Enhancements over spec draft:
--   + updated_at column + trigger
--   + CHECK (stake > 0) — financial integrity: stake must be positive
--   + CHECK (gross_return > 0) — financial integrity: return must be positive
--   + ON DELETE RESTRICT on casa_id FK — explicit: casas cannot be hard-deleted
--     while apostas reference them (use is_active=false for soft delete instead)
--   + idx_apostas_operacao_id — critical FK index for JOIN on every card render
--   + idx_apostas_casa_id — FK index for RESTRICT enforcement
--   + WITH CHECK on RLS policy — security gap in spec draft (USING only)
--   + TO authenticated on RLS policy
--   + COMMENT ON all columns
-- =============================================================================

BEGIN;

-- ── Table: apostas ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apostas (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id     UUID          NOT NULL REFERENCES operacoes(id) ON DELETE CASCADE,
  casa_id         UUID          NOT NULL REFERENCES casas(id)     ON DELETE RESTRICT,
  stake           NUMERIC(10,2) NOT NULL,
  gross_return    NUMERIC(10,2) NOT NULL,
  is_freebet      BOOLEAN       NOT NULL DEFAULT false,
  is_double_green BOOLEAN       NOT NULL DEFAULT false,
  resultado       TEXT          NOT NULL DEFAULT 'Pendente',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT apostas_resultado_check CHECK (
    resultado IN ('Ganhou','Perdeu','Pendente')
  ),
  -- Financial integrity: stake must be positive.
  -- For freebets (is_freebet=true), stake is stored for reference
  -- but excluded from PnL cost (cost = 0). Still must be a valid positive amount.
  CONSTRAINT apostas_stake_positive CHECK (stake > 0),
  -- Financial integrity: gross return must be a positive value entered by user.
  CONSTRAINT apostas_gross_return_positive CHECK (gross_return > 0)
);

-- ── Documentation ─────────────────────────────────────────────────────────
COMMENT ON TABLE apostas IS
  'A single bet leg within an Operacao. One row per bookmaker per operation (3-5 rows per operacao in standard use).';
COMMENT ON COLUMN apostas.operacao_id IS
  'Parent operation. ON DELETE CASCADE: removing an operacao automatically removes all its apostas.';
COMMENT ON COLUMN apostas.casa_id IS
  'Bookmaker for this leg. ON DELETE RESTRICT: casas cannot be hard-deleted while apostas reference them. '
  'Use casas.is_active=false (soft delete) to retire a bookmaker.';
COMMENT ON COLUMN apostas.stake IS
  'Amount wagered in BRL. Always positive (constraint apostas_stake_positive). '
  'For is_freebet=true legs, stored for reference but contributes 0 to PnL cost.';
COMMENT ON COLUMN apostas.gross_return IS
  'Gross return in BRL if this leg wins. Entered directly by user (no odds calculator in MVP). '
  'If is_double_green=true, the PnL engine multiplies this by 2 at calculation time (not stored doubled).';
COMMENT ON COLUMN apostas.is_freebet IS
  'Freebet SNR (Stake Not Returned): if TRUE, this leg contributes 0 to total_cost in the PnL formula. '
  'Implemented in src/lib/pnl.ts: custoReal = is_freebet ? 0 : stake.';
COMMENT ON COLUMN apostas.is_double_green IS
  'Duplo Verde flag: bookmaker has already paid early (typically at 2-0 scoreline) and will pay again. '
  'PnL engine: effective_return = is_double_green ? gross_return * 2 : gross_return. '
  'Value is NOT pre-doubled in the database — the multiplication happens at query/display time.';
COMMENT ON COLUMN apostas.resultado IS
  'Ganhou | Perdeu | Pendente. Set by the user via ResultadoModal. '
  'When this is updated, the parent operacao.pnl is recalculated and operacao.status → Concluida.';
COMMENT ON COLUMN apostas.updated_at IS
  'Auto-updated on every row modification via trigger set_apostas_updated_at.';

-- ── Indexes ───────────────────────────────────────────────────────────────
-- Critical: every OperacaoCard render loads all legs for an operation via JOIN.
CREATE INDEX IF NOT EXISTS idx_apostas_operacao_id
  ON apostas (operacao_id);

-- FK lookup for RESTRICT enforcement and JOIN on casa name display.
CREATE INDEX IF NOT EXISTS idx_apostas_casa_id
  ON apostas (casa_id);

-- ── Trigger: updated_at ───────────────────────────────────────────────────
CREATE TRIGGER set_apostas_updated_at
  BEFORE UPDATE ON apostas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────
-- apostas has no direct user_id column.
-- Tenant isolation is derived via operacoes.user_id (the parent row).
--
-- IMPORTANT: Both USING and WITH CHECK must contain the subquery.
-- Spec draft omitted WITH CHECK — this is a security gap:
--   Without WITH CHECK, a malicious client could INSERT an aposta pointing
--   to another user's operacao_id (USING only checks reads, not writes).
ALTER TABLE apostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apostas_users_own"
  ON apostas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM operacoes
      WHERE id = apostas.operacao_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM operacoes
      WHERE id = apostas.operacao_id
        AND user_id = auth.uid()
    )
  );

COMMIT;

-- =============================================================================
-- Verification queries (run after applying migration):
--
-- -- Check all 3 tables, RLS, indexes
-- SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE tablename IN ('casas','operacoes','apostas');
--
-- -- Verify CHECK constraints on apostas
-- SELECT conname, consrc
--   FROM pg_constraint
--   WHERE conrelid = 'apostas'::regclass AND contype = 'c';
--
-- -- Verify WITH CHECK is set on apostas policy
-- SELECT policyname, with_check
--   FROM pg_policies
--   WHERE tablename = 'apostas';
-- =============================================================================
