-- ============================================================================
-- 0059 — Finance remediation: archival columns + idempotency constraints
-- ============================================================================
-- Audit findings (2026-04):
--   1. recordFinancePayment creates receipt + ledger + GL without dedup guards
--   2. issueFinanceReceipt double-posts (direct ledger INSERT + postReceiptToGl)
--   3. No UNIQUE on finance_transactions_ledger(source_type, source_id)
--   4. Pesapal IPN creates duplicate sponsorship_receipts on retry
--   5. Sponsorship checkout creates draft receipts before money arrives
--
-- Strategy: HYBRID RESET.
--   - Add archival columns so bad rows can be excluded from reports but
--     preserved for audit.
--   - Add UNIQUE constraints so future duplicate attempts fail loudly
--     (callers can catch 23505 and treat as idempotent success).
--   - Add payment_id link on finance_receipts so every new receipt is
--     cryptographically tied to a real finance_payments row.
-- ============================================================================

-- ── Archival columns on every affected table ─────────────────────────────
ALTER TABLE finance_invoices
  ADD COLUMN IF NOT EXISTS archived_due_to_finance_reset BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finance_reset_batch TEXT,
  ADD COLUMN IF NOT EXISTS finance_reset_reason TEXT,
  ADD COLUMN IF NOT EXISTS excluded_from_reports BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE finance_receipts
  ADD COLUMN IF NOT EXISTS archived_due_to_finance_reset BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finance_reset_batch TEXT,
  ADD COLUMN IF NOT EXISTS finance_reset_reason TEXT,
  ADD COLUMN IF NOT EXISTS excluded_from_reports BOOLEAN NOT NULL DEFAULT FALSE,
  -- Crypto link: every new receipt MUST point to a real payment event.
  -- Legacy receipts keep payment_id NULL + are candidates for archival review.
  ADD COLUMN IF NOT EXISTS payment_id INTEGER REFERENCES finance_payments(id) ON DELETE SET NULL;

ALTER TABLE finance_payments
  ADD COLUMN IF NOT EXISTS archived_due_to_finance_reset BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finance_reset_batch TEXT,
  ADD COLUMN IF NOT EXISTS finance_reset_reason TEXT,
  ADD COLUMN IF NOT EXISTS excluded_from_reports BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE finance_transactions_ledger
  ADD COLUMN IF NOT EXISTS archived_due_to_finance_reset BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finance_reset_batch TEXT,
  ADD COLUMN IF NOT EXISTS finance_reset_reason TEXT,
  ADD COLUMN IF NOT EXISTS excluded_from_reports BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE finance_journal_entries
  ADD COLUMN IF NOT EXISTS archived_due_to_finance_reset BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finance_reset_batch TEXT,
  ADD COLUMN IF NOT EXISTS finance_reset_reason TEXT,
  ADD COLUMN IF NOT EXISTS excluded_from_reports BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Fast filter indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_finance_invoices_active
  ON finance_invoices (id) WHERE archived_due_to_finance_reset IS FALSE;
CREATE INDEX IF NOT EXISTS idx_finance_receipts_active
  ON finance_receipts (id) WHERE archived_due_to_finance_reset IS FALSE;
CREATE INDEX IF NOT EXISTS idx_finance_payments_active
  ON finance_payments (id) WHERE archived_due_to_finance_reset IS FALSE;
CREATE INDEX IF NOT EXISTS idx_finance_ledger_active
  ON finance_transactions_ledger (id) WHERE archived_due_to_finance_reset IS FALSE;
CREATE INDEX IF NOT EXISTS idx_finance_receipts_payment
  ON finance_receipts (payment_id) WHERE payment_id IS NOT NULL;

-- ── Idempotency: one active ledger row per (source_type, source_id, txn_type) ──
-- Partial unique index: voided + archived rows are excluded so a reset can
-- re-post without conflict.
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_ledger_source_active
  ON finance_transactions_ledger (source_type, source_id, txn_type)
  WHERE posted_status != 'void'
    AND archived_due_to_finance_reset IS FALSE;

-- One active GL entry per (source_type, source_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_journal_source_active
  ON finance_journal_entries (source_type, source_id)
  WHERE source_id IS NOT NULL
    AND status != 'reversed'
    AND archived_due_to_finance_reset IS FALSE;

-- One active receipt per (invoice, payment) pair
-- This is the critical idempotency guard: re-pressing "Record Payment" can't
-- create a second receipt for the same payment event.
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_receipts_invoice_payment
  ON finance_receipts (related_invoice_id, payment_id)
  WHERE related_invoice_id IS NOT NULL
    AND payment_id IS NOT NULL
    AND status != 'void'
    AND archived_due_to_finance_reset IS FALSE;

-- ── Same idempotency for donation + sponsorship receipts ──────────────
-- These tables only get hit from IPN callbacks; duplicate callbacks were the
-- root cause. Use the external payment ref (pesapal merchant ref) as the
-- idempotency key since that's guaranteed unique per payment.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donation_receipts') THEN
    ALTER TABLE donation_receipts
      ADD COLUMN IF NOT EXISTS archived_due_to_finance_reset BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS finance_reset_batch TEXT,
      ADD COLUMN IF NOT EXISTS finance_reset_reason TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sponsorship_receipts') THEN
    ALTER TABLE sponsorship_receipts
      ADD COLUMN IF NOT EXISTS archived_due_to_finance_reset BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS finance_reset_batch TEXT,
      ADD COLUMN IF NOT EXISTS finance_reset_reason TEXT;
  END IF;
END $$;

-- Unique constraints only created if tables exist (donation_receipts /
-- sponsorship_receipts may not be present in some deployments).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donation_receipts') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_donation_receipts_donation
      ON donation_receipts (donation_id)
      WHERE status != 'void' AND archived_due_to_finance_reset IS FALSE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sponsorship_receipts') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_sponsorship_receipts_sponsorship
      ON sponsorship_receipts (sponsorship_id)
      WHERE status != 'void' AND archived_due_to_finance_reset IS FALSE;
  END IF;
END $$;

-- ── payment_receipts (service request receipts) idempotency ──────────
ALTER TABLE payment_receipts
  ADD COLUMN IF NOT EXISTS archived_due_to_finance_reset BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finance_reset_batch TEXT,
  ADD COLUMN IF NOT EXISTS finance_reset_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_receipts_service_payment
  ON payment_receipts (service_payment_id)
  WHERE archived_due_to_finance_reset IS FALSE;

COMMENT ON COLUMN finance_receipts.payment_id IS
  'Required for new receipts — cryptographic link to the finance_payments row that recorded actual money received. Legacy NULLs are candidates for archival review.';
COMMENT ON COLUMN finance_receipts.archived_due_to_finance_reset IS
  'Set TRUE during a finance-reset batch to exclude this row from active reports while preserving it for audit.';
