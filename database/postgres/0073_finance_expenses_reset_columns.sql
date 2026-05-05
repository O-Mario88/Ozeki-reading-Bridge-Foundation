-- ============================================================================
-- 0073 — finance_expenses archival columns (forward-only fix to 0059)
-- ============================================================================
-- 0059 added the finance-reset archival columns to finance_invoices,
-- finance_receipts, finance_payments, finance_transactions_ledger and
-- finance_journal_entries — but missed finance_expenses. The read-side
-- queries (transparency/live, finance-intelligence, IATI export) filter
-- expenses with `archived_due_to_finance_reset IS FALSE`, so production
-- crashed with `column "archived_due_to_finance_reset" does not exist`.
--
-- This migration mirrors 0059's column set on finance_expenses. Idempotent
-- (IF NOT EXISTS), additive only — no DROP COLUMN per project convention.
-- ============================================================================

ALTER TABLE finance_expenses
  ADD COLUMN IF NOT EXISTS archived_due_to_finance_reset BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finance_reset_batch TEXT,
  ADD COLUMN IF NOT EXISTS finance_reset_reason TEXT,
  ADD COLUMN IF NOT EXISTS excluded_from_reports BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_finance_expenses_active
  ON finance_expenses (id) WHERE archived_due_to_finance_reset IS FALSE;

COMMENT ON COLUMN finance_expenses.archived_due_to_finance_reset IS
  'Set TRUE during a finance-reset batch to exclude this row from active reports while preserving it for audit.';
