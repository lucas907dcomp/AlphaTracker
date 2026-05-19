-- =============================================================================
-- Migration 005: add valor_freebet annotation column to operacoes
-- Date: 2026-05-19
-- =============================================================================

BEGIN;

ALTER TABLE operacoes
  ADD COLUMN IF NOT EXISTS valor_freebet NUMERIC(10,2);

COMMENT ON COLUMN operacoes.valor_freebet IS
  'Annotation-only: freebet amount received from the bookmaker for this operation. '
  'Only relevant for Freebet and FreebetSePerder types. Not used in PnL calculations.';

COMMIT;
