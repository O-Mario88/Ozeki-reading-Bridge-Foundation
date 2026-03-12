import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  createFinanceContact,
  createFinanceExpense,
  createFinanceFileRecord,
  createFinanceInvoice,
  createFinanceReceipt,
  generateFinanceMonthlyStatement,
  issueFinanceReceipt,
  sendFinanceInvoice,
  listFinanceLedgerTransactions,
  postFinanceExpense,
  recordFinancePayment,
  submitFinanceExpense,
  upsertFinanceExpenseReceipts,
} from "../lib/finance-db";
import { getDb } from "../lib/db";

function getTestActor() {
  const db = getDb();
  const row = db.prepare(
    `
      SELECT id, full_name AS fullName
      FROM portal_users
      WHERE is_superadmin = 1
      ORDER BY id ASC
      LIMIT 1
    `,
  ).get() as { id: number; fullName: string } | undefined;
  assert.ok(row, "Expected at least one super admin user.");
  return {
    userId: row.id,
    userName: row.fullName,
  };
}

test("issuing receipt auto-creates posted money_in ledger entry", async () => {
  const actor = getTestActor();
  const contact = createFinanceContact(
    {
      name: `Finance Test Contact ${Date.now()}`,
      emails: [`finance-test-${Date.now()}@example.org`],
      contactType: "donor",
    },
    actor,
  );

  const invoice = createFinanceInvoice(
    {
      contactId: contact.id,
      category: "Donation",
      issueDate: "2026-03-01",
      dueDate: "2026-03-31",
      currency: "UGX",
      lineItems: [{ description: "Donation pledge", qty: 1, unitPrice: 500000 }],
      notes: "Test invoice",
    },
    actor,
  );

  const receipt = createFinanceReceipt(
    {
      contactId: contact.id,
      category: "Donation",
      receivedFrom: contact.name,
      receiptDate: "2026-03-02",
      currency: "UGX",
      amountReceived: 500000,
      paymentMethod: "bank_transfer",
      relatedInvoiceId: invoice.id,
      description: "Donation towards phonics training in Lango.",
      notes: "Test receipt",
    },
    actor,
  );
  assert.equal(receipt.description, "Donation towards phonics training in Lango.");

  await issueFinanceReceipt(receipt.id, actor, { sendEmail: false });

  const ledger = await listFinanceLedgerTransactions({
    txnType: "money_in",
    category: "Donation",
    postedStatus: "posted",
  });
  const linked = ledger.find((item) => item.sourceType === "receipt" && item.sourceId === receipt.id);
  assert.ok(linked, "Expected posted money_in ledger entry for issued receipt.");
  assert.equal(linked?.amount, 500000);
  assert.equal(linked?.category, "Donation");
});

test("invoice email is not marked as sent when SMTP is unavailable", async () => {
  const actor = getTestActor();
  const stamp = Date.now();
  const contact = createFinanceContact(
    {
      name: `Invoice Send Contact ${stamp}`,
      emails: [`invoice-send-${stamp}@example.org`],
      contactType: "partner",
    },
    actor,
  );

  const invoice = createFinanceInvoice(
    {
      contactId: contact.id,
      category: "Contracts",
      issueDate: "2026-03-05",
      dueDate: "2026-03-31",
      currency: "UGX",
      lineItems: [{ description: "Implementation support", qty: 1, unitPrice: 125000 }],
      notes: "SMTP unavailable test invoice",
    },
    actor,
  );

  const result = await sendFinanceInvoice(invoice.id, actor);
  assert.equal(result.email.status, "skipped");
  assert.equal(result.invoice.status, "draft");
  assert.equal(result.invoice.emailedAt, undefined);
  assert.equal(result.invoice.lastSentTo, undefined);
});

test("expense posting requires evidence and creates money_out ledger", async () => {
  const actor = getTestActor();
  const draft = createFinanceExpense(
    {
      vendorName: `Vendor ${Date.now()}`,
      date: "2026-03-03",
      subcategory: "Transport",
      amount: 90000,
      currency: "UGX",
      paymentMethod: "cash",
      description: "Transport reimbursement",
      notes: "Testing expense post",
    },
    actor,
  );

  submitFinanceExpense(draft.id, actor);
  assert.throws(
    () => postFinanceExpense(draft.id, actor),
    /(evidence upload is required|EXP-001: Expense has no receipt evidence metadata)/i,
  );

  const receiptPayload = `dummy-receipt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const evidenceFile = await createFinanceFileRecord(
    {
      sourceType: "expense",
      sourceId: draft.id,
      fileName: "expense-receipt.pdf",
      bytes: Buffer.from(receiptPayload),
      mimeType: "application/pdf",
    },
    actor,
  );

  upsertFinanceExpenseReceipts(
    draft.id,
    [
      {
        fileId: evidenceFile.id,
        fileHashSha256: crypto.createHash("sha256").update(receiptPayload).digest("hex"),
        vendorName: draft.vendorName,
        receiptDate: draft.date,
        receiptAmount: draft.amount,
        currency: draft.currency,
      },
    ],
    actor,
  );

  const posted = postFinanceExpense(draft.id, actor);
  assert.equal(posted.status, "posted");

  const ledger = await listFinanceLedgerTransactions({
    txnType: "money_out",
    category: "Expense",
    postedStatus: "posted",
  });
  const linked = ledger.find((item) => item.sourceType === "expense" && item.sourceId === draft.id);
  assert.ok(linked, "Expected posted money_out ledger entry for expense.");
  assert.equal(linked?.amount, 90000);
});

test("monthly statement sums posted ledger entries", async () => {
  const actor = getTestActor();
  const month = "2026-03";
  const statement = await generateFinanceMonthlyStatement(month, "UGX", actor);
  assert.equal(statement.month, month);
  assert.equal(statement.periodType, "monthly");
  assert.equal(statement.currency, "UGX");
  assert.ok(Number.isFinite(statement.totalMoneyIn));
  assert.ok(Number.isFinite(statement.totalMoneyOut));
  assert.equal(statement.net, statement.totalMoneyIn - statement.totalMoneyOut);
  assert.ok(statement.breakdownByCategory.Donation >= 0);
  assert.ok(statement.breakdownByCategory.Expense >= 0);
});

test("quarterly and fiscal year statement periods are generated", async () => {
  const actor = getTestActor();

  const quarterly = await generateFinanceMonthlyStatement(
    {
      periodType: "quarterly",
      year: 2026,
      quarter: "Q2",
    },
    "UGX",
    actor,
  );
  assert.equal(quarterly.periodType, "quarterly");
  assert.equal(quarterly.month, "2026-Q2");

  const fiscalYear = await generateFinanceMonthlyStatement(
    {
      periodType: "fiscal_year",
      year: 2026,
    },
    "UGX",
    actor,
  );
  assert.equal(fiscalYear.periodType, "fiscal_year");
  assert.equal(fiscalYear.month, "FY-2026");
});

test("full invoice payment auto-prepares linked receipt PDF", async () => {
  const actor = getTestActor();
  const stamp = Date.now();
  const contact = createFinanceContact(
    {
      name: `Invoice Receipt Contact ${stamp}`,
      emails: [`accountant-${stamp}@example.org`],
      contactType: "partner",
    },
    actor,
  );

  const invoice = createFinanceInvoice(
    {
      contactId: contact.id,
      category: "Contracts",
      issueDate: "2026-03-01",
      dueDate: "2026-03-31",
      currency: "UGX",
      lineItems: [{ description: "Implementation support", qty: 1, unitPrice: 350000 }],
      notes: "Autoreceipt test invoice",
    },
    actor,
  );

  const result = await recordFinancePayment(
    {
      relatedInvoiceId: invoice.id,
      date: "2026-03-03",
      amount: invoice.total,
      method: "bank_transfer",
      reference: "BANK-ACK-001",
      notes: "Paid in full",
    },
    actor,
  );

  assert.equal(result.invoice.status, "paid");
  assert.equal(result.invoice.balanceDue, 0);
  assert.ok(result.autoReceipt, "Expected linked receipt to be auto-prepared.");
  assert.equal(result.autoReceipt?.relatedInvoiceId, invoice.id);
  assert.ok(result.autoReceipt?.pdfFileId, "Expected receipt PDF to be generated.");
});
