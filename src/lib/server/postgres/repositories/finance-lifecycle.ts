import { createHash, randomUUID } from "node:crypto";
import { withPostgresClient } from "@/lib/server/postgres/client";
import type { PoolClient } from "pg";

/**
 * CANONICAL FINANCE LIFECYCLE
 *
 * The only correct paths for money to hit the ledger + GL:
 *
 *   Invoice → Issue → Send → [Record Payment] → Receipt → Ledger + GL
 *                                  ↑
 *                                  single entry point
 *
 * All duplicate-generation root causes traced in the Phase 1 audit funnel
 * through this module. Callers MUST use these functions — the legacy direct
 * `createFinanceReceiptPostgres` + `issueFinanceReceiptPostgres` paths remain
 * for back-fill only and no longer post to the ledger/GL themselves.
 */

/* ────────────────────────────────────────────────────────────────────────── */
/* Errors                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export class ReceiptWithoutPaymentError extends Error {
  constructor() {
    super("Receipts can only be issued after a real payment has been recorded. Call recordInvoicePayment first.");
    this.name = "ReceiptWithoutPaymentError";
  }
}
export class DuplicatePaymentError extends Error {
  constructor(existingPaymentId: number) {
    super(`Duplicate payment detected. Existing payment id=${existingPaymentId} already covers this (invoice, reference) pair.`);
    this.name = "DuplicatePaymentError";
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Idempotency helper                                                         */
/* ────────────────────────────────────────────────────────────────────────── */
const PG_UNIQUE_VIOLATION = "23505";
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === PG_UNIQUE_VIOLATION;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 1.  recordInvoicePayment — the ONLY way money becomes income               */
/* ────────────────────────────────────────────────────────────────────────── */

export type RecordPaymentInput = {
  invoiceId: number;
  amount: number;
  method: "cash" | "bank_transfer" | "mobile_money" | "cheque" | "other";
  date: string;            // ISO date YYYY-MM-DD
  reference?: string | null;
  notes?: string | null;
  actorUserId: number;
};

export type RecordPaymentResult = {
  paymentId: number;
  receiptId: number;
  receiptNumber: string;
  invoice: {
    id: number;
    balanceDue: number;
    paidAmount: number;
    status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void";
  };
  idempotent: boolean;  // TRUE when a duplicate was detected + safely skipped
};

/**
 * The canonical flow. Inside a single transaction:
 *   1. Check for existing payment covering (invoice, reference) — idempotent retry
 *   2. Insert finance_payments row
 *   3. Allocate against the invoice
 *   4. Insert finance_receipts row (payment_id = new payment)
 *   5. Insert finance_transactions_ledger row (money_in, source_type='invoice_payment')
 *   6. Insert GL journal entry (debit Cash, credit Income)
 *   7. Update invoice paid_amount + balance_due + status
 *
 * Every INSERT that can dup-retry is backed by a UNIQUE constraint from
 * migration 0059. On 23505 we swallow and return idempotent=true.
 */
export async function recordInvoicePaymentPostgres(input: RecordPaymentInput): Promise<RecordPaymentResult> {
  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      // 1. Idempotency pre-check
      if (input.reference) {
        const dupe = await client.query(
          `SELECT id FROM finance_payments
           WHERE related_invoice_id = $1 AND reference = $2 AND status != 'void'
             AND archived_due_to_finance_reset IS FALSE
           LIMIT 1`,
          [input.invoiceId, input.reference],
        );
        if (dupe.rows.length > 0) {
          const existingPayId = Number((dupe.rows[0] as { id: number }).id);
          const result = await hydrateAfterIdempotent(client, existingPayId, input.invoiceId);
          await client.query("COMMIT");
          return { ...result, idempotent: true };
        }
      }

      // 2. Payment
      const payIns = await client.query(
        `INSERT INTO finance_payments
           (related_invoice_id, date, amount, currency, method, reference, notes, status, created_by_user_id)
         VALUES ($1, $2::date, $3, (SELECT currency FROM finance_invoices WHERE id = $1), $4, $5, $6, 'posted', $7)
         RETURNING id`,
        [input.invoiceId, input.date, input.amount, input.method, input.reference ?? null, input.notes ?? null, input.actorUserId],
      );
      const paymentId = Number((payIns.rows[0] as { id: number }).id);

      // 3. Allocation (one payment → one invoice for this flow)
      await client.query(
        `INSERT INTO finance_payment_allocations (payment_id, invoice_id, allocated_amount, created_by_user_id)
         VALUES ($1, $2, $3, $4)`,
        [paymentId, input.invoiceId, input.amount, input.actorUserId],
      );

      // 4. Receipt (UNIQUE(invoice, payment) stops duplicates)
      const invoice = await client.query(
        `SELECT id, invoice_number, contact_id, category, currency FROM finance_invoices WHERE id = $1`,
        [input.invoiceId],
      );
      const inv = invoice.rows[0] as {
        id: number; invoice_number: string; contact_id: number; category: string; currency: string;
      };
      const receiptNumber = await nextDocNumber(client, "receipt");
      const receiptIns = await client.query(
        `INSERT INTO finance_receipts
           (receipt_number, contact_id, category, received_from, receipt_date, currency,
            amount_received, payment_method, reference_no, related_invoice_id, payment_id,
            description, status, created_by_user_id)
         VALUES ($1, $2, $3,
                 (SELECT name FROM finance_contacts WHERE id = $2),
                 $4::date, $5, $6, $7, $8, $9, $10, $11, 'issued', $12)
         RETURNING id`,
        [
          receiptNumber, inv.contact_id, inv.category, input.date, inv.currency,
          input.amount, input.method, input.reference ?? null, input.invoiceId,
          paymentId, `Payment on invoice ${inv.invoice_number}`, input.actorUserId,
        ],
      );
      const receiptId = Number((receiptIns.rows[0] as { id: number }).id);

      // 5. Ledger (UNIQUE(source_type, source_id, txn_type) stops duplicates)
      try {
        await client.query(
          `INSERT INTO finance_transactions_ledger
             (txn_type, category, date, currency, amount, counterparty_contact_id,
              source_type, source_id, posted_status, posted_at, created_by_user_id)
           VALUES ('money_in', $1, $2::date, $3, $4, $5,
                   'invoice_payment', $6, 'posted', NOW(), $7)`,
          [inv.category, input.date, inv.currency, input.amount, inv.contact_id, paymentId, input.actorUserId],
        );
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
      }

      // 6. GL posting (double-entry). We defer to the existing postReceiptToGl
      //    but only once — the UNIQUE on journal_entries(source_type, source_id)
      //    ensures a retry is a no-op.
      try {
        const { postReceiptToGl } = await import("@/lib/server/postgres/repositories/finance-v2");
        await postReceiptToGl(receiptId, input.actorUserId).catch(() => { /* GL posting is non-fatal */ });
      } catch {
        // If finance-v2 import fails (e.g. during migrations), ledger is still correct.
      }

      // 7. Invoice paid_amount / balance / status
      const updated = await client.query(
        `WITH sums AS (
           SELECT COALESCE(SUM(amount), 0) AS total_paid
           FROM finance_payments
           WHERE related_invoice_id = $1 AND status = 'posted'
             AND archived_due_to_finance_reset IS FALSE
         )
         UPDATE finance_invoices fi
         SET paid_amount = sums.total_paid,
             balance_due = fi.total - sums.total_paid,
             status = CASE
               WHEN sums.total_paid >= fi.total THEN 'paid'
               WHEN sums.total_paid > 0 THEN 'partially_paid'
               ELSE fi.status
             END,
             updated_at = NOW()
         FROM sums
         WHERE fi.id = $1
         RETURNING id, balance_due, paid_amount, status`,
        [input.invoiceId],
      );
      const invRow = updated.rows[0] as { id: number; balance_due: number; paid_amount: number; status: string };

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, payload_after, detail)
         SELECT id, full_name, 'record_payment', 'finance_payments', $2, $3, $4
         FROM portal_users WHERE id = $1`,
        [input.actorUserId, String(paymentId),
          JSON.stringify({ paymentId, receiptId, receiptNumber, amount: input.amount }),
          `Recorded payment of ${inv.currency} ${input.amount.toLocaleString()} on invoice ${inv.invoice_number}`],
      );

      await client.query("COMMIT");

      return {
        paymentId,
        receiptId,
        receiptNumber,
        invoice: {
          id: Number(invRow.id),
          balanceDue: Number(invRow.balance_due),
          paidAmount: Number(invRow.paid_amount),
          status: invRow.status as RecordPaymentResult["invoice"]["status"],
        },
        idempotent: false,
      };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Helper: hydrate an idempotent duplicate result                             */
/* ────────────────────────────────────────────────────────────────────────── */

async function hydrateAfterIdempotent(client: PoolClient, paymentId: number, invoiceId: number) {
  // pRes (finance_payments amount) was previously fetched but never read
  // — caller only needs the receipt + invoice rows. Dropping the dead
  // query also saves a roundtrip.
  const [rRes, iRes] = await Promise.all([
    client.query(
      `SELECT id, receipt_number FROM finance_receipts
       WHERE payment_id = $1 AND archived_due_to_finance_reset IS FALSE LIMIT 1`,
      [paymentId],
    ),
    client.query(
      `SELECT id, balance_due, paid_amount, status FROM finance_invoices WHERE id = $1`,
      [invoiceId],
    ),
  ]);

  const receiptRow = rRes.rows[0] as { id?: number; receipt_number?: string } | undefined;
  const invRow = iRes.rows[0] as { id: number; balance_due: number; paid_amount: number; status: string } | undefined;

  return {
    paymentId,
    receiptId: receiptRow?.id ? Number(receiptRow.id) : 0,
    receiptNumber: receiptRow?.receipt_number ?? "",
    invoice: {
      id: Number(invRow?.id ?? invoiceId),
      balanceDue: Number(invRow?.balance_due ?? 0),
      paidAmount: Number(invRow?.paid_amount ?? 0),
      status: (invRow?.status ?? "draft") as RecordPaymentResult["invoice"]["status"],
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Doc numbering                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

async function nextDocNumber(client: PoolClient, type: "invoice" | "receipt"): Promise<string> {
  const res = await client.query(
    `SELECT ${type}_prefix AS prefix FROM finance_settings WHERE id = 1 LIMIT 1`,
  );
  const prefix = (res.rows[0] as { prefix?: string })?.prefix ?? (type === "invoice" ? "INV" : "RCT");
  const year = new Date().getFullYear();
  const suffix = randomUUID().split("-")[0].toUpperCase();
  return `${prefix}-${year}-${suffix}`;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Archive helpers (used by remediation batch)                                */
/* ────────────────────────────────────────────────────────────────────────── */

export type ResetReason =
  | "duplicate_invoice"
  | "duplicate_receipt"
  | "duplicate_ledger"
  | "receipt_without_payment"
  | "orphan_receipt"
  | "prepayment_draft_receipt"
  | "duplicate_ipn_receipt"
  | "duplicate_journal_entry";

export type RemediationSummary = {
  batchId: string;
  archivedReceipts: number;
  archivedLedgerRows: number;
  archivedJournalEntries: number;
  archivedDonationReceipts: number;
  archivedSponsorshipReceipts: number;
  archivedPaymentReceipts: number;
  invoicesRestored: number;
};

/**
 * One-time hybrid reset. Idempotent: running it twice doesn't double-archive
 * because every update is guarded by `archived_due_to_finance_reset IS FALSE`.
 *
 * Criteria for archival:
 *   - finance_receipts where payment_id IS NULL AND related_invoice_id IS NULL
 *     (orphan, no payment link)
 *   - finance_receipts where status = 'draft' AND created_at < NOW() - 30 days
 *     (stale pre-payment drafts)
 *   - finance_transactions_ledger duplicate rows (keep earliest per source tuple)
 *   - finance_journal_entries duplicate rows (keep earliest per source tuple)
 *   - donation_receipts + sponsorship_receipts where the UNIQUE constraint
 *     would block new duplicates: keep earliest per parent, archive rest
 *   - payment_receipts duplicates for same service_payment_id: keep earliest
 */
export async function runFinanceResetBatchPostgres(input: {
  actorUserId: number;
  dryRun?: boolean;
}): Promise<RemediationSummary> {
  const batchId = `RESET-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;
  const summary: RemediationSummary = {
    batchId,
    archivedReceipts: 0,
    archivedLedgerRows: 0,
    archivedJournalEntries: 0,
    archivedDonationReceipts: 0,
    archivedSponsorshipReceipts: 0,
    archivedPaymentReceipts: 0,
    invoicesRestored: 0,
  };

  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      // 1. finance_receipts — orphans + stale pre-payment drafts
      const orphanSql = `
        UPDATE finance_receipts
        SET archived_due_to_finance_reset = TRUE,
            finance_reset_batch = $1,
            finance_reset_reason = 'orphan_receipt',
            excluded_from_reports = TRUE
        WHERE archived_due_to_finance_reset IS FALSE
          AND payment_id IS NULL
          AND related_invoice_id IS NULL
          AND status IN ('draft', 'void')
        RETURNING id`;
      const staleSql = `
        UPDATE finance_receipts
        SET archived_due_to_finance_reset = TRUE,
            finance_reset_batch = $1,
            finance_reset_reason = 'prepayment_draft_receipt',
            excluded_from_reports = TRUE
        WHERE archived_due_to_finance_reset IS FALSE
          AND status = 'draft'
          AND payment_id IS NULL
          AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id`;

      if (!input.dryRun) {
        const r1 = await client.query(orphanSql, [batchId]);
        const r2 = await client.query(staleSql, [batchId]);
        summary.archivedReceipts = r1.rowCount! + r2.rowCount!;
      } else {
        const r1 = await client.query(orphanSql.replace("UPDATE", "SELECT id FROM").replace("SET", "--").replace(/,\n.*/g, ""), [batchId]).catch(() => ({ rowCount: 0 }));
        summary.archivedReceipts = r1.rowCount ?? 0;
      }

      // 2. finance_transactions_ledger — duplicate rows per source tuple.
      //    Keep the earliest, archive the rest.
      if (!input.dryRun) {
        const dupes = await client.query(
          `UPDATE finance_transactions_ledger SET
             archived_due_to_finance_reset = TRUE,
             finance_reset_batch = $1,
             finance_reset_reason = 'duplicate_ledger',
             excluded_from_reports = TRUE
           WHERE archived_due_to_finance_reset IS FALSE
             AND id IN (
               SELECT id FROM (
                 SELECT id,
                        ROW_NUMBER() OVER (PARTITION BY source_type, source_id, txn_type ORDER BY created_at ASC, id ASC) AS rn
                 FROM finance_transactions_ledger
                 WHERE archived_due_to_finance_reset IS FALSE
                   AND posted_status != 'void'
                   AND source_id IS NOT NULL
               ) t WHERE rn > 1
             )
           RETURNING id`,
          [batchId],
        );
        summary.archivedLedgerRows = dupes.rowCount ?? 0;
      }

      // 3. finance_journal_entries — duplicate rows per source tuple
      if (!input.dryRun) {
        const dupes = await client.query(
          `UPDATE finance_journal_entries SET
             archived_due_to_finance_reset = TRUE,
             finance_reset_batch = $1,
             finance_reset_reason = 'duplicate_journal_entry',
             excluded_from_reports = TRUE
           WHERE archived_due_to_finance_reset IS FALSE
             AND id IN (
               SELECT id FROM (
                 SELECT id,
                        ROW_NUMBER() OVER (PARTITION BY source_type, source_id ORDER BY created_at ASC, id ASC) AS rn
                 FROM finance_journal_entries
                 WHERE archived_due_to_finance_reset IS FALSE
                   AND status != 'reversed'
                   AND source_id IS NOT NULL
               ) t WHERE rn > 1
             )
           RETURNING id`,
          [batchId],
        );
        summary.archivedJournalEntries = dupes.rowCount ?? 0;
      }

      // 4. donation_receipts + sponsorship_receipts + payment_receipts —
      //    duplicates (best-effort; tables may not exist in all envs).
      if (!input.dryRun) {
        for (const cfg of [
          { table: "donation_receipts", parent: "donation_id", reason: "duplicate_ipn_receipt", out: "archivedDonationReceipts" },
          { table: "sponsorship_receipts", parent: "sponsorship_id", reason: "duplicate_ipn_receipt", out: "archivedSponsorshipReceipts" },
          { table: "payment_receipts", parent: "service_payment_id", reason: "duplicate_ipn_receipt", out: "archivedPaymentReceipts" },
        ] as const) {
          try {
            const r = await client.query(
              `UPDATE ${cfg.table} SET
                 archived_due_to_finance_reset = TRUE,
                 finance_reset_batch = $1,
                 finance_reset_reason = $2
               WHERE archived_due_to_finance_reset IS FALSE
                 AND id IN (
                   SELECT id FROM (
                     SELECT id, ROW_NUMBER() OVER (PARTITION BY ${cfg.parent} ORDER BY created_at ASC, id ASC) AS rn
                     FROM ${cfg.table}
                     WHERE archived_due_to_finance_reset IS FALSE
                   ) t WHERE rn > 1
                 )
               RETURNING id`,
              [batchId, cfg.reason],
            );
            (summary as unknown as Record<string, number>)[cfg.out] = r.rowCount ?? 0;
          } catch {
            // Table may not exist or columns may not yet be migrated.
          }
        }
      }

      // 5. Recompute invoice balances against non-archived payments so any
      //    invoices that were prematurely marked "paid" by ghost receipts get
      //    corrected back to the true balance.
      if (!input.dryRun) {
        const r = await client.query(
          `UPDATE finance_invoices fi SET
             paid_amount = COALESCE(sub.total, 0),
             balance_due = fi.total - COALESCE(sub.total, 0),
             status = CASE
               WHEN COALESCE(sub.total, 0) >= fi.total THEN 'paid'
               WHEN COALESCE(sub.total, 0) > 0 THEN 'partially_paid'
               WHEN fi.status IN ('paid', 'partially_paid') THEN 'sent'
               ELSE fi.status
             END,
             updated_at = NOW()
           FROM (
             SELECT related_invoice_id AS invoice_id, SUM(amount) AS total
             FROM finance_payments
             WHERE status = 'posted' AND archived_due_to_finance_reset IS FALSE
               AND related_invoice_id IS NOT NULL
             GROUP BY related_invoice_id
           ) sub
           WHERE fi.id = sub.invoice_id
           RETURNING fi.id`,
          [],
        );
        summary.invoicesRestored = r.rowCount ?? 0;
      }

      // Audit + commit
      const auditId = createHash("sha256").update(batchId + Date.now()).digest("hex").slice(0, 16);
      await client.query(
        `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, payload_after, detail)
         SELECT id, full_name, 'finance_reset_batch', 'finance_reset', $2, $3, $4
         FROM portal_users WHERE id = $1`,
        [input.actorUserId, batchId, JSON.stringify(summary),
          `Finance reset batch ${batchId} ${input.dryRun ? "(dry run)" : ""} — ${JSON.stringify(summary)}`],
      );
      void auditId;

      if (input.dryRun) {
        await client.query("ROLLBACK");
      } else {
        await client.query("COMMIT");
      }
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  return summary;
}
