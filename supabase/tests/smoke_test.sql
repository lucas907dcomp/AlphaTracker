-- =============================================================================
-- Smoke Test: AlphaTracker schema validation
-- Run after applying all 3 migrations: 001, 002, 003
-- Execute as: psql -f supabase/tests/smoke_test.sql
-- =============================================================================

DO $$
DECLARE
  v_col_count    INTEGER;
  v_idx_count    INTEGER;
  v_pol_count    INTEGER;
  v_rls_enabled  BOOLEAN;
BEGIN

  RAISE NOTICE '=== AlphaTracker Schema Smoke Test ===';

  -- ── 1. Tables exist ───────────────────────────────────────────────────
  ASSERT (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'casas')),
    'FAIL: Table casas does not exist';
  ASSERT (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operacoes')),
    'FAIL: Table operacoes does not exist';
  ASSERT (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apostas')),
    'FAIL: Table apostas does not exist';
  RAISE NOTICE '✓ All 3 tables exist';

  -- ── 2. updated_at columns present ────────────────────────────────────
  ASSERT (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casas'     AND column_name = 'updated_at')),
    'FAIL: casas.updated_at column missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operacoes' AND column_name = 'updated_at')),
    'FAIL: operacoes.updated_at column missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apostas'   AND column_name = 'updated_at')),
    'FAIL: apostas.updated_at column missing';
  RAISE NOTICE '✓ updated_at present on all 3 tables';

  -- ── 3. RLS enabled ────────────────────────────────────────────────────
  SELECT relrowsecurity INTO v_rls_enabled FROM pg_class WHERE relname = 'casas';
  ASSERT v_rls_enabled, 'FAIL: RLS not enabled on casas';
  SELECT relrowsecurity INTO v_rls_enabled FROM pg_class WHERE relname = 'operacoes';
  ASSERT v_rls_enabled, 'FAIL: RLS not enabled on operacoes';
  SELECT relrowsecurity INTO v_rls_enabled FROM pg_class WHERE relname = 'apostas';
  ASSERT v_rls_enabled, 'FAIL: RLS not enabled on apostas';
  RAISE NOTICE '✓ RLS enabled on all 3 tables';

  -- ── 4. RLS policies exist ─────────────────────────────────────────────
  SELECT COUNT(*) INTO v_pol_count FROM pg_policies WHERE tablename = 'casas';
  ASSERT v_pol_count >= 1, 'FAIL: No RLS policy on casas';
  SELECT COUNT(*) INTO v_pol_count FROM pg_policies WHERE tablename = 'operacoes';
  ASSERT v_pol_count >= 1, 'FAIL: No RLS policy on operacoes';
  SELECT COUNT(*) INTO v_pol_count FROM pg_policies WHERE tablename = 'apostas';
  ASSERT v_pol_count >= 1, 'FAIL: No RLS policy on apostas';
  RAISE NOTICE '✓ RLS policies present on all 3 tables';

  -- ── 5. apostas WITH CHECK present ─────────────────────────────────────
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'apostas' AND with_check IS NOT NULL
  )), 'FAIL: apostas RLS policy missing WITH CHECK clause (security gap)';
  RAISE NOTICE '✓ apostas RLS policy has WITH CHECK clause';

  -- ── 6. Critical indexes exist ─────────────────────────────────────────
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_casas_user_id')),
    'FAIL: idx_casas_user_id missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_operacoes_user_status_data')),
    'FAIL: idx_operacoes_user_status_data missing (dashboard queries will scan)';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_apostas_operacao_id')),
    'FAIL: idx_apostas_operacao_id missing (card renders will scan)';
  RAISE NOTICE '✓ Critical indexes present';

  -- ── 7. CHECK constraints on apostas ──────────────────────────────────
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'apostas'::regclass AND conname = 'apostas_stake_positive'
  )), 'FAIL: apostas_stake_positive CHECK missing';
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'apostas'::regclass AND conname = 'apostas_gross_return_positive'
  )), 'FAIL: apostas_gross_return_positive CHECK missing';
  RAISE NOTICE '✓ Financial integrity constraints on apostas present';

  -- ── 8. UNIQUE constraint on casas ─────────────────────────────────────
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'casas'::regclass AND conname = 'casas_user_nome_unique'
  )), 'FAIL: casas_user_nome_unique constraint missing';
  RAISE NOTICE '✓ casas (user_id, nome) unique constraint present';

  -- ── 9. set_updated_at function exists ────────────────────────────────
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'
  )), 'FAIL: set_updated_at trigger function missing';
  RAISE NOTICE '✓ set_updated_at trigger function present';

  -- ── 10. Triggers attached ─────────────────────────────────────────────
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_casas_updated_at')),
    'FAIL: set_casas_updated_at trigger missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_operacoes_updated_at')),
    'FAIL: set_operacoes_updated_at trigger missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_apostas_updated_at')),
    'FAIL: set_apostas_updated_at trigger missing';
  RAISE NOTICE '✓ updated_at triggers attached to all 3 tables';

  RAISE NOTICE '';
  RAISE NOTICE '=== ALL CHECKS PASSED — Schema is production-ready ===';

END;
$$;
