-- =============================================================================
-- Migration 004: add FreebetSePerder to operacoes_tipo_check constraint
-- Date: 2026-05-19
-- =============================================================================

BEGIN;

ALTER TABLE operacoes DROP CONSTRAINT IF EXISTS operacoes_tipo_check;

ALTER TABLE operacoes ADD CONSTRAINT operacoes_tipo_check CHECK (
  tipo IN ('Freebet','Extracao','SuperOdd','TentativaDuplo','Aposta','FreebetSePerder')
);

COMMIT;
