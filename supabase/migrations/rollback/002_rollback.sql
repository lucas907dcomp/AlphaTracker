-- =============================================================================
-- Rollback 002: DROP operacoes table
-- Run AFTER rollback/003_rollback.sql, BEFORE rollback/001_rollback.sql
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS operacoes CASCADE;

COMMIT;
