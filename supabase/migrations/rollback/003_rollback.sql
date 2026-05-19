-- =============================================================================
-- Rollback 003: DROP apostas table
-- Run BEFORE rollback/002_rollback.sql (order matters: apostas → operacoes → casas)
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS apostas CASCADE;

COMMIT;
