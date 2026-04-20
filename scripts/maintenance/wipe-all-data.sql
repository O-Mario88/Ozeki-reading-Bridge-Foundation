-- ============================================================================
-- NUCLEAR WIPE — erase all transactional/content data for clean slate
-- ============================================================================
--
-- ⚠️⚠️⚠️  EXTREMELY DESTRUCTIVE. Clears every non-config table in production.
--         Double-check the keep-list below before running.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/maintenance/wipe-all-data.sql
--
-- What this WIPES (everything else in public schema):
--   - All programme delivery: schools, contacts, learners, teachers, visits
--   - All assessments + item responses + lesson evaluations + observations
--   - All training: sessions, participants, attendance, artifacts, programmes
--   - All finance: invoices, receipts, expenses, journal entries, contacts
--   - All donations + sponsorships + receipts
--   - All service bookings + payments
--   - All content: blog, testimonials, newsletter, story library, gallery
--   - All logs: audit_logs, api usage, automation, platform events
--   - All API keys + idempotency keys + support requests
--
-- What this KEEPS (listed in `keep_tables` below — edit if needed):
--   - portal_users        (so you can still log in — delete specific rows
--                          manually after if needed)
--   - system_settings, currency_rates, sponsorship_tiers, service_catalog
--   - finance_chart_of_accounts, finance_funds, finance_grants, finance_settings
--   - geo_regions, geo_districts, geo_subregions, geo_subcounties, geo_parishes
--                         (real Uganda admin hierarchy, not test data)
--   - benchmark_profiles, benchmark_rules, assessment_benchmark_settings
--   - organization_profile, teaching_improvement_settings
--   - finance_audited_statements  (uploaded PDFs — real documents)
--
-- Runs in a single transaction. If any step fails, everything rolls back.
-- ============================================================================

BEGIN;

\echo '─── WIPING ALL DATA (config tables are preserved) ───'

DO $$
DECLARE
  tbl text;
  keep_tables text[] := ARRAY[
    -- user accounts — KEEP so login still works
    'portal_users',
    'portal_sessions',

    -- app-wide config
    'system_settings',
    'currency_rates',
    'sponsorship_tiers',
    'service_catalog',

    -- finance setup (chart/funds/grants are config, not transactions)
    'finance_chart_of_accounts',
    'finance_funds',
    'finance_grants',
    'finance_settings',
    'finance_audited_statements',

    -- Uganda admin hierarchy (real reference data)
    'geo_regions',
    'geo_districts',
    'geo_subregions',
    'geo_subcounties',
    'geo_parishes',

    -- assessment benchmark config
    'benchmark_profiles',
    'benchmark_rules',
    'assessment_benchmark_settings',

    -- organisation + methodology config
    'organization_profile',
    'teaching_improvement_settings',

    -- misc config-like
    'portal_dashboard_pins',
    'portal_dashboard_settings'
  ];
  affected_tables text;
BEGIN
  -- Build the comma-separated list of tables that WILL be truncated
  SELECT string_agg(quote_ident(tablename), ', ' ORDER BY tablename)
  INTO affected_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename <> ALL (keep_tables);

  IF affected_tables IS NULL OR affected_tables = '' THEN
    RAISE NOTICE 'Nothing to truncate.';
    RETURN;
  END IF;

  RAISE NOTICE 'Tables to truncate: %', affected_tables;

  -- One statement, CASCADE so any FK child rows come along, RESTART IDENTITY
  -- so auto-increment sequences reset to 1.
  EXECUTE 'TRUNCATE TABLE ' || affected_tables || ' RESTART IDENTITY CASCADE';

  RAISE NOTICE 'Done.';
END $$;

-- Sanity check — list of preserved tables with their row counts
\echo '─── Preserved tables (should still have data) ───'
SELECT tablename,
       (xpath('/row/c/text()',
              query_to_xml(format('SELECT COUNT(*) AS c FROM %I', tablename),
                           false, true, '')))[1]::text::int AS row_count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = ANY (ARRAY[
    'portal_users','system_settings','currency_rates','sponsorship_tiers',
    'service_catalog','geo_regions','geo_districts',
    'benchmark_profiles','organization_profile','finance_audited_statements'
  ])
ORDER BY tablename;

\echo '─── Spot-check a few wiped tables (should all be 0) ───'
SELECT 'schools_directory'    AS tbl, COUNT(*) AS rows FROM schools_directory
UNION ALL SELECT 'school_learners',         COUNT(*) FROM school_learners
UNION ALL SELECT 'teacher_roster',          COUNT(*) FROM teacher_roster
UNION ALL SELECT 'assessment_records',      COUNT(*) FROM assessment_records
UNION ALL SELECT 'portal_records',          COUNT(*) FROM portal_records
UNION ALL SELECT 'finance_invoices',        COUNT(*) FROM finance_invoices
UNION ALL SELECT 'finance_receipts',        COUNT(*) FROM finance_receipts
UNION ALL SELECT 'finance_expenses',        COUNT(*) FROM finance_expenses
UNION ALL SELECT 'finance_contacts',        COUNT(*) FROM finance_contacts
UNION ALL SELECT 'donations',               COUNT(*) FROM donations
UNION ALL SELECT 'sponsorships',            COUNT(*) FROM sponsorships
UNION ALL SELECT 'audit_logs',              COUNT(*) FROM audit_logs;

COMMIT;

\echo '─── Wipe complete. All preserved tables still populated; all others truncated. ───'
