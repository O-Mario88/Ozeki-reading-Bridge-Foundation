import assert from "node:assert/strict";
import test from "node:test";
import {
  createFinanceContactAsync,
  createFinanceInvoiceAsync,
} from "../lib/finance-db";
import { recordInvoicePaymentPostgres } from "../lib/server/postgres/repositories/finance-lifecycle";
import { queryPostgres } from "../lib/server/postgres/client";

async function getTestActor() {
  const result = await queryPostgres<{ id: number; full_name: string }>(
    `SELECT id, full_name FROM portal_users WHERE is_superadmin = true ORDER BY id ASC LIMIT 1`,
  );
  const row = result.rows[0];
  assert.ok(row, "Expected at least one super-admin user for finance lifecycle test.");
  return { id: Number(row.id), userId: Number(row.id), userName: String(row.full_name) };
}

async function makeTestInvoice(actor: { id: number; userId: number; userName: string }, amount = 250000) {
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const contact = await createFinanceContactAsync(
    {
      name: `Lifecycle Contact ${stamp}`,
      emails: [`lifecycle-${stamp}@example.org`],
      contactType: "donor",
    },
    actor,
  );
  const invoice = await createFinanceInvoiceAsync(
    {
      contactId: contact.id,
      category: "Donation",
      issueDate: "2026-04-10",
      dueDate: "2026-04-30",
      currency: "UGX",
      lineItems: [{ description: "Lifecycle test pledge", qty: 1, unitPrice: amount }],
      notes: "Lifecycle test",
    },
    actor,
  );
  return { contact, invoice };
}

test("recordInvoicePayment creates exactly one payment + receipt + ledger row", async () => {
  const actor = await getTestActor();
  const { invoice } = await makeTestInvoice(actor, 180000);

  const result = await recordInvoicePaymentPostgres({
    invoiceId: invoice.id,
    amount: 180000,
    method: "bank_transfer",
    date: "2026-04-11",
    reference: `LC-REF-${Date.now()}`,
    actorUserId: actor.id,
  });

  assert.equal(result.idempotent, false, "First recordInvoicePayment call must not be idempotent.");
  assert.ok(result.paymentId > 0);
  assert.ok(result.receiptId > 0);
  assert.equal(result.invoice.status, "paid");
  assert.equal(Number(result.invoice.balanceDue), 0);

  const payments = await queryPostgres<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM finance_payments
     WHERE related_invoice_id = $1 AND archived_due_to_finance_reset IS FALSE`,
    [invoice.id],
  );
  assert.equal(Number(payments.rows[0]?.n), 1, "Expected exactly one active payment on the invoice.");

  const receipts = await queryPostgres<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM finance_receipts
     WHERE related_invoice_id = $1 AND archived_due_to_finance_reset IS FALSE`,
    [invoice.id],
  );
  assert.equal(Number(receipts.rows[0]?.n), 1, "Expected exactly one active receipt on the invoice.");

  const ledger = await queryPostgres<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM finance_transactions_ledger
     WHERE source_type = 'invoice_payment' AND source_id = $1
       AND posted_status != 'void' AND archived_due_to_finance_reset IS FALSE`,
    [result.paymentId],
  );
  assert.equal(Number(ledger.rows[0]?.n), 1, "Expected exactly one active ledger row for the payment.");
});

test("recordInvoicePayment is idempotent on duplicate (invoice, reference)", async () => {
  const actor = await getTestActor();
  const { invoice } = await makeTestInvoice(actor, 120000);
  const reference = `DUP-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

  const first = await recordInvoicePaymentPostgres({
    invoiceId: invoice.id,
    amount: 120000,
    method: "mobile_money",
    date: "2026-04-12",
    reference,
    actorUserId: actor.id,
  });
  assert.equal(first.idempotent, false);

  const second = await recordInvoicePaymentPostgres({
    invoiceId: invoice.id,
    amount: 120000,
    method: "mobile_money",
    date: "2026-04-12",
    reference,
    actorUserId: actor.id,
  });
  assert.equal(second.idempotent, true, "Second call with the same reference must be idempotent.");
  assert.equal(second.paymentId, first.paymentId, "Idempotent call must return the same payment id.");

  const payments = await queryPostgres<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM finance_payments
     WHERE related_invoice_id = $1 AND archived_due_to_finance_reset IS FALSE`,
    [invoice.id],
  );
  assert.equal(Number(payments.rows[0]?.n), 1, "Retry must not create a second payment row.");

  const receipts = await queryPostgres<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM finance_receipts
     WHERE related_invoice_id = $1 AND archived_due_to_finance_reset IS FALSE`,
    [invoice.id],
  );
  assert.equal(Number(receipts.rows[0]?.n), 1, "Retry must not create a second receipt row.");
});

test("receipt row carries payment_id back to its originating payment", async () => {
  const actor = await getTestActor();
  const { invoice } = await makeTestInvoice(actor, 75000);
  const result = await recordInvoicePaymentPostgres({
    invoiceId: invoice.id,
    amount: 75000,
    method: "cash",
    date: "2026-04-13",
    reference: `LINK-${Date.now()}`,
    actorUserId: actor.id,
  });

  const link = await queryPostgres<{ payment_id: number | null }>(
    `SELECT payment_id FROM finance_receipts WHERE id = $1`,
    [result.receiptId],
  );
  assert.equal(Number(link.rows[0]?.payment_id), result.paymentId, "Receipt.payment_id must point at its payment.");
});

test("archived_due_to_finance_reset receipts are excluded from active counts", async () => {
  const actor = await getTestActor();
  const { invoice } = await makeTestInvoice(actor, 50000);
  const result = await recordInvoicePaymentPostgres({
    invoiceId: invoice.id,
    amount: 50000,
    method: "cash",
    date: "2026-04-14",
    reference: `ARC-${Date.now()}`,
    actorUserId: actor.id,
  });

  await queryPostgres(
    `UPDATE finance_receipts
     SET archived_due_to_finance_reset = TRUE,
         finance_reset_reason = 'unit test archival',
         excluded_from_reports = TRUE
     WHERE id = $1`,
    [result.receiptId],
  );

  const active = await queryPostgres<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM finance_receipts
     WHERE related_invoice_id = $1 AND archived_due_to_finance_reset IS FALSE`,
    [invoice.id],
  );
  assert.equal(Number(active.rows[0]?.n), 0, "Archived receipt must not appear in active-filtered queries.");

  const withArchive = await queryPostgres<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM finance_receipts WHERE related_invoice_id = $1`,
    [invoice.id],
  );
  assert.equal(Number(withArchive.rows[0]?.n), 1, "Audit history must still retain the archived row.");
});
