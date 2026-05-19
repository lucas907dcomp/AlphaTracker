-- =============================================================================
-- Migration 001: casas table
-- Domain:  AlphaTracker — Sports Arbitrage & Matched Betting Tracker
-- Author:  @data-engineer (Dara)
-- Date:    2026-05-18
-- Spec:    docs/stories/mvp-alpha-tracker/spec/spec.md v2, Section 3.4 (DM-2)
-- Rollback: supabase/migrations/rollback/001_rollback.sql
-- =============================================================================
--
-- Enhancements over spec draft:
--   + updated_at column + shared trigger function (Dara principle: all tables get updated_at)
--   + UNIQUE (user_id, nome) — business rule: casa name unique per user
--   + CHECK (LENGTH(TRIM(nome)) > 0) — reject whitespace-only names
--   + idx_casas_user_id — FK index (Postgres does not auto-index FK references)
--   + idx_casas_user_active — partial index for LegRow dropdown hot path
--   + TO authenticated on RLS policy — explicit role binding
--   + COMMENT ON table and columns — embedded documentation
-- =============================================================================

BEGIN;

-- ── Shared trigger function ────────────────────────────────────────────────
-- Created once here. Reused by operacoes (002) and apostas (003).
-- Idempotent: CREATE OR REPLACE is safe to re-run.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_updated_at IS
  'Shared trigger function: sets updated_at to NOW() on every UPDATE. Used by casas, operacoes, apostas.';

-- ── Table: casas ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS casas (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT         NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Casa name must be unique per user (prevents duplicates in the same account)
  CONSTRAINT casas_user_nome_unique  UNIQUE (user_id, nome),
  -- Reject empty or whitespace-only names
  CONSTRAINT casas_nome_not_empty    CHECK  (LENGTH(TRIM(nome)) > 0)
);

-- ── Documentation ─────────────────────────────────────────────────────────
COMMENT ON TABLE casas IS
  'Betting houses (bookmakers) belonging to a user. Soft-deleted via is_active=false — never hard-deleted while apostas reference them.';
COMMENT ON COLUMN casas.user_id IS
  'Owner. RLS policy enforces auth.uid() = user_id. ON DELETE CASCADE removes all casas when a user account is deleted.';
COMMENT ON COLUMN casas.nome IS
  'Display name of the bookmaker (e.g. Betano, Bet365). Unique per user (constraint casas_user_nome_unique).';
COMMENT ON COLUMN casas.is_active IS
  'Soft-delete flag. FALSE = hidden from new-bet dropdowns. Historical apostas still reference the casa and display its name correctly.';
COMMENT ON COLUMN casas.updated_at IS
  'Auto-updated on every row modification via trigger set_casas_updated_at.';

-- ── Indexes ───────────────────────────────────────────────────────────────
-- General FK lookup (Postgres does NOT auto-create indexes on FK columns)
CREATE INDEX IF NOT EXISTS idx_casas_user_id
  ON casas (user_id);

-- Hot path: LegRow dropdown renders active casas per user on every form mount.
-- Partial index keeps it small and fast.
CREATE INDEX IF NOT EXISTS idx_casas_user_active
  ON casas (user_id)
  WHERE is_active = true;

-- ── Trigger: updated_at ───────────────────────────────────────────────────
CREATE TRIGGER set_casas_updated_at
  BEFORE UPDATE ON casas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────
ALTER TABLE casas ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own casas.
-- TO authenticated: unauthenticated (anon) users receive 0 rows (not an error).
CREATE POLICY "casas_users_own"
  ON casas
  FOR ALL
  TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;

-- =============================================================================
-- Verification queries (run after applying migration):
--
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'casas'
--   ORDER BY ordinal_position;
--
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'casas'; -- must be TRUE
--
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'casas';
-- =============================================================================
