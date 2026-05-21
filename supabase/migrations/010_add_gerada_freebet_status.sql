-- =============================================================================
-- Migration 010: add GeradaFreebet to operacoes_status_check constraint
-- Required for FreebetSePerder operations that generated a freebet bonus
-- =============================================================================

BEGIN;

ALTER TABLE operacoes DROP CONSTRAINT IF EXISTS operacoes_status_check;

ALTER TABLE operacoes ADD CONSTRAINT operacoes_status_check CHECK (
  status IN ('Pendente', 'Concluida', 'GeradaFreebet')
);

-- Relax advisory pnl constraint: GeradaFreebet also has pnl set
ALTER TABLE operacoes DROP CONSTRAINT IF EXISTS operacoes_pnl_concluida;

ALTER TABLE operacoes ADD CONSTRAINT operacoes_pnl_concluida CHECK (
  status = 'Pendente' OR pnl IS NOT NULL
);

COMMIT;
