-- =============================================================================
-- Rollback 001: DROP casas table + shared trigger function
-- Run LAST (after 003 and 002 rollbacks)
--
-- Full rollback order:
--   psql -f rollback/003_rollback.sql
--   psql -f rollback/002_rollback.sql
--   psql -f rollback/001_rollback.sql
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS casas CASCADE;
DROP FUNCTION IF EXISTS set_updated_at CASCADE;

COMMIT;
