-- ============================================================================
-- Wipe finance transactional data — CLEAN SLATE for first live run
-- ============================================================================
--
-- ⚠️  DESTRUCTIVE — erases test invoices/receipts/expenses/contacts/donations/
--     sponsorships/service-payments from production. Keeps config tables
--     (chart of accounts, funds, grants, catalog, settings, audited PDFs).
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/maintenance/wipe-finance-data.sql
--
--   Or from RDS bastion:
--   psql -h <rds-endpoint> -U <user> -d postgres \
--        -f scripts/maintenance/wipe-finance-data.sql
--
-- The whole thing runs in a single transaction — if any statement fails
-- everything rolls back. Review the output carefully before committing.
-- ============================================================================

BEGIN;

-- Tell the user exactly what we're about to do
\echo '─── Wiping finance transactional data (config tables are preserved) ───'

-- ── Tier 1: core finance ledger ───────────────────────────────────────────
-- Order matters: child tables first, then parents, OR use CASCADE.
-- We use CASCADE + RESTART IDENTITY so auto-increment sequences reset to 1.

TRUNCATE TABLE
  finance_invoice_items,
  finance_receipt_items,
  finance_expense_receipts,
  finance_audit_exceptions,
  finance_monthly_statements,
  finance_journal_lines,
  finance_journal_entries,
  finance_invoices,
  finance_receipts,
  finance_expenses,
  finance_contacts,
  finance_public_snapshots
RESTART IDENTITY CASCADE;

-- ── Tier 2: donations + sponsorships + related receipts ────────────────────
TRUNCATE TABLE
  donation_receipts,
  donations,
  sponsorship_receipts,
  sponsorships
RESTART IDENTITY CASCADE;

-- ── Tier 3: service bookings + payments (test runs) ───────────────────────
TRUNCATE TABLE
  payment_receipts,
  quotation_items,
  service_delivery_schedules,
  service_quotations,
  service_payments,
  service_requests
RESTART IDENTITY CASCADE;

-- ── What we explicitly KEEP ────────────────────────────────────────────────
-- system_settings              (ops config)
-- currency_rates               (FX rates)
-- sponsorship_tiers            (public pricing tiers)
-- service_catalog              (service product catalogue)
-- finance_chart_of_accounts    (GL setup — if table exists)
-- finance_funds / finance_grants (restricted fund structure)
-- finance_audited_statements   (uploaded PDF documents — real files)
-- schools_directory, portal_users, teacher_roster, school_learners
-- assessment_*, portal_records (programme delivery data — not finance)

-- Show row counts after wipe so you can sanity-check:
\echo '─── Post-wipe row counts ───'
SELECT 'finance_invoices'         AS tbl, COUNT(*) AS rows FROM finance_invoices
UNION ALL SELECT 'finance_receipts',              COUNT(*) FROM finance_receipts
UNION ALL SELECT 'finance_expenses',              COUNT(*) FROM finance_expenses
UNION ALL SELECT 'finance_contacts',              COUNT(*) FROM finance_contacts
UNION ALL SELECT 'finance_journal_entries',       COUNT(*) FROM finance_journal_entries
UNION ALL SELECT 'donations',                     COUNT(*) FROM donations
UNION ALL SELECT 'donation_receipts',             COUNT(*) FROM donation_receipts
UNION ALL SELECT 'sponsorships',                  COUNT(*) FROM sponsorships
UNION ALL SELECT 'sponsorship_receipts',          COUNT(*) FROM sponsorship_receipts
UNION ALL SELECT 'service_payments',              COUNT(*) FROM service_payments
UNION ALL SELECT 'payment_receipts',              COUNT(*) FROM payment_receipts
UNION ALL SELECT 'service_quotations',            COUNT(*) FROM service_quotations
UNION ALL SELECT 'service_requests',              COUNT(*) FROM service_requests;

COMMIT;

\echo '─── Finance wipe complete. Review the row counts above — all should be 0. ───'
