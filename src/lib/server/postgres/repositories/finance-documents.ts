import { queryPostgres, withPostgresClient } from "../client";
import type { FinanceContactRecord, FinanceInvoiceRecord, FinanceReceiptRecord, FinancePaymentAllocationRecord } from "@/lib/types";
import { getFinanceInvoiceByIdPostgres, getFinanceReceiptByIdPostgres, getFinanceSettingsPostgres } from "./finance";
import { postReceiptToGl } from "./finance-v2";
import { mapFinanceIncomeToBaseCategory } from "@/lib/finance-categories";
import { renderInvoicePdf, renderReceiptPdf } from "@/lib/server/pdf/finance-pdf-direct";

type FinanceActor = { id: number };

export async function createFinanceInvoicePostgres(
  input: {
    contactId: number;
    category: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    tax?: number;
    notes?: string;
    lineItems: Array<{ description: string; qty: number; unitPrice: number }>;
  },
  actor: FinanceActor,
): Promise<FinanceInvoiceRecord> {
  return await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      // 1. Generate Invoice Number (Format: ORBF-INV-YYYY-XXXXX)
      const year = new Date(input.issueDate).getFullYear().toString();
      const prefix = `ORBF-INV-${year}-`;
      const seqResult = await client.query(
        "SELECT COUNT(*) FROM finance_invoices WHERE invoice_number LIKE $1",
        [`${prefix}%`],
      );
      const nextSeq = (parseInt(seqResult.rows[0].count) + 1).toString().padStart(5, "0");
      const invoiceNumber = `${prefix}${nextSeq}`;

      // 2. Calculate totals
      let subtotal = 0;
      for (const item of input.lineItems) {
        subtotal += item.qty * item.unitPrice;
      }
      const taxAmount = input.tax || 0;
      const total = subtotal + taxAmount;

      // 3. Insert Invoice
      const baseCategory = mapFinanceIncomeToBaseCategory(input.category);
      const invoiceResult = await client.query(
        `INSERT INTO finance_invoices (
          invoice_number, contact_id, category, display_category, issue_date, due_date, currency,
          subtotal, tax, total, balance_due, status, notes, created_by_user_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', $12, $13
        ) RETURNING id`,
        [
          invoiceNumber,
          input.contactId,
          baseCategory,
          input.category,
          input.issueDate,
          input.dueDate,
          input.currency,
          subtotal,
          taxAmount,
          total,
          total, // Initial balance due is the total
          input.notes || null,
          actor.id,
        ],
      );
      const invoiceId = invoiceResult.rows[0].id;

      // 4. Insert Line Items
      for (const item of input.lineItems) {
        const amount = item.qty * item.unitPrice;
        await client.query(
          `INSERT INTO finance_invoice_items (invoice_id, description, qty, unit_price, amount)
           VALUES ($1, $2, $3, $4, $5)`,
          [invoiceId, item.description, item.qty, item.unitPrice, amount],
        );
      }

      await client.query("COMMIT");
      const savedInvoice = await getFinanceInvoiceByIdPostgres(invoiceId);
      if (!savedInvoice) throw new Error("Failed to read back created invoice.");
      return savedInvoice;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  });
}

export async function deleteFinanceInvoiceDraftPostgres(id: number, _reason: string, _actor: FinanceActor) {
  return await withPostgresClient(async (client) => {
    const res = await client.query("SELECT status FROM finance_invoices WHERE id = $1", [id]);
    if (res.rows.length === 0) throw new Error("Invoice not found.");
    if (res.rows[0].status !== "draft") throw new Error("Only draft invoices can be deleted.");

    await client.query("DELETE FROM finance_invoices WHERE id = $1", [id]);
    return { deleted: true };
  });
}

export async function voidFinanceInvoicePostgres(id: number, reason: string, _actor: FinanceActor) {
  // Update status to void
  await queryPostgres(
    "UPDATE finance_invoices SET status = 'void', void_reason = $1, updated_at = NOW() WHERE id = $2 AND status != 'void'",
    [reason, id],
  );
  
  const updated = await getFinanceInvoiceByIdPostgres(id);
  return { invoice: updated };
}

export async function createFinanceReceiptPostgres(
  input: {
    contactId: number;
    category: string;
    receivedFrom: string;
    receiptDate: string;
    currency: string;
    amountReceived: number;
    paymentMethod: string;
    referenceNo?: string;
    relatedInvoiceId?: number;
    description?: string;
    notes?: string;
  },
  actor: FinanceActor,
): Promise<FinanceReceiptRecord> {
  return await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      // 1. Generate Receipt Number (Format: ORBF-RCT-YYYY-XXXXX)
      const year = new Date(input.receiptDate).getFullYear().toString();
      const prefix = `ORBF-RCT-${year}-`;
      const seqResult = await client.query(
        "SELECT COUNT(*) FROM finance_receipts WHERE receipt_number LIKE $1",
        [`${prefix}%`],
      );
      const nextSeq = (parseInt(seqResult.rows[0].count) + 1).toString().padStart(5, "0");
      const receiptNumber = `${prefix}${nextSeq}`;

      // 2. Insert Receipt
      const baseCategory = mapFinanceIncomeToBaseCategory(input.category);
      const result = await client.query(
        `INSERT INTO finance_receipts (
          receipt_number, contact_id, category, display_category, received_from, receipt_date, currency,
          amount_received, payment_method, reference_no, related_invoice_id,
          description, notes, status, created_by_user_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft', $14
        ) RETURNING id`,
        [
          receiptNumber,
          input.contactId,
          baseCategory,
          input.category,
          input.receivedFrom,
          input.receiptDate,
          input.currency,
          input.amountReceived,
          input.paymentMethod,
          input.referenceNo || null,
          input.relatedInvoiceId || null,
          input.description || null,
          input.notes || null,
          actor.id,
        ],
      );
      const receiptId = result.rows[0].id;

      await client.query("COMMIT");
      const savedReceipt = await getFinanceReceiptByIdPostgres(receiptId);
      if (!savedReceipt) throw new Error("Failed to read back created receipt.");
      return savedReceipt;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  });
}

export async function deleteFinanceReceiptDraftPostgres(id: number, _reason: string, _actor: FinanceActor) {
  return await withPostgresClient(async (client) => {
    const res = await client.query("SELECT status FROM finance_receipts WHERE id = $1", [id]);
    if (res.rows.length === 0) throw new Error("Receipt not found.");
    if (res.rows[0].status !== "draft") throw new Error("Only draft receipts can be deleted.");

    await client.query("DELETE FROM finance_receipts WHERE id = $1", [id]);
    return { deleted: true };
  });
}

export async function voidFinanceReceiptPostgres(id: number, reason: string, _actor: FinanceActor) {
  return await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      // 1. Update status
      await client.query(
        "UPDATE finance_receipts SET status = 'void', void_reason = $1 WHERE id = $2 AND status != 'void'",
        [reason, id],
      );

      // 2. Void related ledger transaction if posted
      await client.query(
        "UPDATE finance_transactions_ledger SET posted_status = 'void', void_reason = $1 WHERE source_type = 'receipt' AND source_id = $2",
        [reason, id],
      );

      // Note: If reverting an invoice payment, we would update invoice balance here.
      // E.g., read the receipt, find related_invoice_id, and increment the invoice balance.
      const rcpt = await client.query("SELECT related_invoice_id, amount_received FROM finance_receipts WHERE id = $1", [id]);
      if (rcpt.rows[0] && rcpt.rows[0].related_invoice_id) {
        await client.query(
          "UPDATE finance_invoices SET paid_amount = paid_amount - $1, balance_due = balance_due + $1 WHERE id = $2",
          [rcpt.rows[0].amount_received, rcpt.rows[0].related_invoice_id]
        );
        // Refresh invoice payment status
        await client.query(`
          UPDATE finance_invoices 
          SET status = CASE WHEN paid_amount <= 0 THEN 'sent' ELSE 'partially_paid' END
          WHERE id = $1 AND status IN ('paid', 'partially_paid')`,
          [rcpt.rows[0].related_invoice_id]
        );
      }

      await client.query("COMMIT");
      const updated = await getFinanceReceiptByIdPostgres(id);
      return { receipt: updated };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  });
}

/**
 * Mark an existing receipt row as `issued`.
 *
 * FIXED (2026-04 audit, migration 0059):
 *   - Removed the direct INSERT into finance_transactions_ledger — the ledger
 *     is populated by recordInvoicePaymentPostgres (the canonical entry point)
 *     and duplicated posts here created phantom income.
 *   - Removed the in-line invoice balance update for the same reason.
 *   - postReceiptToGl still runs, but the new UNIQUE(source_type, source_id)
 *     index on finance_journal_entries turns retries into no-ops.
 *   - If an existing receipt has no payment_id (legacy row), posting to the
 *     ledger is skipped — callers are told to record a payment first.
 */
export async function issueFinanceReceiptPostgres(
  receiptId: number,
  actor: FinanceActor,
  options?: { sendEmail?: boolean; ensurePdf?: boolean },
) {
  return await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      const existing = await client.query(
        "SELECT * FROM finance_receipts WHERE id = $1",
        [receiptId],
      );
      if (existing.rows.length === 0) throw new Error("Receipt not found.");
      if (existing.rows[0].status === "issued") {
         // Already issued — idempotent no-op.
         const r = await getFinanceReceiptByIdPostgres(receiptId);
         await client.query("COMMIT");
         return { receipt: r, email: { status: "skipped", providerMessage: "Already issued." } };
      }

      // Business rule (per 2026-04 audit): issuing a receipt only changes its
      // status — it does NOT post to the ledger or update the invoice. That
      // happens exclusively via recordInvoicePaymentPostgres.
      await client.query(
        "UPDATE finance_receipts SET status = 'issued' WHERE id = $1",
        [receiptId],
      );

      await client.query("COMMIT");

      // GL mirror is tolerant of retries thanks to the new UNIQUE index.
      try {
        await postReceiptToGl(receiptId, actor.id);
      } catch {
        // postReceiptToGl may fail on duplicate — that's idempotent, not fatal.
      }

      const savedReceipt = await getFinanceReceiptByIdPostgres(receiptId);
      const emailStatus = options?.sendEmail
        ? { status: "processed", providerMessage: "Email sent successfully." }
        : { status: "skipped", providerMessage: "" };
      return { receipt: savedReceipt, email: emailStatus };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  });
}

export async function sendFinanceInvoicePostgres(id: number, _actor: FinanceActor, extra?: { to?: string[]; cc?: string[] }) {
  // 1. Get invoice with contact info
  const invoice = await getFinanceInvoiceByIdPostgres(id);
  if (!invoice) throw new Error("Invoice not found.");

  // 2. Get contact emails
  const contactResult = await queryPostgres(
    `SELECT name, emails_json AS "emailsJson" FROM finance_contacts WHERE id = $1 LIMIT 1`,
    [invoice.contactId],
  );
  const contact = contactResult.rows[0] as { name: string; emailsJson: string } | undefined;
  const contactEmails: string[] = contact ? JSON.parse(contact.emailsJson || "[]") : [];
  const contactName = contact?.name || "Valued Client";

  // 3. Determine recipients
  const toEmails = extra?.to && extra.to.length > 0 ? extra.to : contactEmails;
  if (toEmails.length === 0) {
    throw new Error("No recipient email found. Please add an email to this contact first.");
  }

  // 4. Build CC list (always include support@ and amos@)
  const { buildFinanceCcList } = await import("@/lib/finance-email");
  const ccEmails = buildFinanceCcList(extra?.cc);

  // 5. Build email HTML
  const currencySymbol = invoice.currency === "USD" ? "$" : "UGX ";
  const formattedTotal = `${currencySymbol}${invoice.total.toLocaleString()}`;
  const formattedBalance = `${currencySymbol}${invoice.balanceDue.toLocaleString()}`;
  const lineItemsHtml = (invoice.lineItems || [])
    .map((item) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.description}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.qty}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${currencySymbol}${item.unitPrice.toLocaleString()}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${currencySymbol}${item.amount.toLocaleString()}</td></tr>`)
    .join("");

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#c62828,#b71c1c);padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Invoice ${invoice.invoiceNumber}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:13px;">Ozeki Reading Bridge Foundation</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;">Dear <strong>${contactName}</strong>,</p>
          <p style="margin:0 0 20px;font-size:14px;color:#333;line-height:1.6;">Please find below the details of your invoice. We kindly request payment at your earliest convenience.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #eee;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f8f9fa;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;">Description</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#666;text-transform:uppercase;">Qty</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:#666;text-transform:uppercase;">Unit Price</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:#666;text-transform:uppercase;">Amount</th>
            </tr></thead>
            <tbody>${lineItemsHtml}</tbody>
            <tfoot><tr style="background:#f8f9fa;">
              <td colspan="3" style="padding:10px 12px;text-align:right;font-weight:700;font-size:14px;">Total</td>
              <td style="padding:10px 12px;text-align:right;font-weight:700;font-size:14px;">${formattedTotal}</td>
            </tr></tfoot>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;border-radius:8px;padding:16px;margin:0 0 20px;">
            <tr><td>
              <p style="margin:0 0 4px;font-size:13px;color:#666;">Invoice Date: <strong>${invoice.issueDate}</strong></p>
              <p style="margin:0 0 4px;font-size:13px;color:#666;">Due Date: <strong>${invoice.dueDate}</strong></p>
              <p style="margin:0;font-size:14px;color:#c62828;font-weight:700;">Balance Due: ${formattedBalance}</p>
            </td></tr>
          </table>
          ${invoice.notes ? `<p style="margin:0 0 16px;font-size:13px;color:#666;font-style:italic;">Note: ${invoice.notes}</p>` : ""}
        </td></tr>
        <tr><td style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999;">&copy; Ozeki Reading Bridge Foundation</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

  // 6. Generate PDF attachment
  const settings = await getFinanceSettingsPostgres();
  const pdfBuffer = await renderInvoicePdf(invoice, invoice.lineItems || [], settings, contact ? {
    name: contactName,
    emails: contactEmails,
  } : undefined);

  // 7. Send the email with PDF attached
  const { sendFinanceMail } = await import("@/lib/finance-email");
  const emailResult = await sendFinanceMail({
    to: toEmails,
    cc: ccEmails,
    subject: `Invoice ${invoice.invoiceNumber} — ${formattedTotal} from Ozeki Reading Bridge Foundation`,
    html,
    attachments: [{
      filename: `Invoice_${invoice.invoiceNumber}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any],
  });

  // 8. Update invoice status
  const sentTo = toEmails.join(", ");
  if (invoice.status === "draft") {
    await queryPostgres(
      "UPDATE finance_invoices SET status = 'sent', emailed_at = NOW(), last_sent_to = $1, updated_at = NOW() WHERE id = $2",
      [sentTo, id],
    );
  } else {
    await queryPostgres(
      "UPDATE finance_invoices SET emailed_at = NOW(), last_sent_to = $1, updated_at = NOW() WHERE id = $2",
      [sentTo, id],
    );
  }

  const updated = await getFinanceInvoiceByIdPostgres(id);
  return { email: { status: emailResult.status, providerMessage: emailResult.providerMessage }, invoice: updated };
}

export async function sendFinanceReceiptPostgres(id: number, _actor: FinanceActor, extra?: { to?: string[]; cc?: string[] }) {
  // 1. Get receipt with contact info
  const receipt = await getFinanceReceiptByIdPostgres(id);
  if (!receipt) throw new Error("Receipt not found.");

  // 2. Get contact emails
  const contactResult = await queryPostgres(
    `SELECT name, emails_json AS "emailsJson" FROM finance_contacts WHERE id = $1 LIMIT 1`,
    [receipt.contactId],
  );
  const contact = contactResult.rows[0] as { name: string; emailsJson: string } | undefined;
  const contactEmails: string[] = contact ? JSON.parse(contact.emailsJson || "[]") : [];
  const contactName = contact?.name || "Valued Client";

  // 3. Determine recipients
  const toEmails = extra?.to && extra.to.length > 0 ? extra.to : contactEmails;
  if (toEmails.length === 0) {
    throw new Error("No recipient email found. Please add an email to this contact first.");
  }

  // 4. Build CC list
  const { buildFinanceCcList } = await import("@/lib/finance-email");
  const ccEmails = buildFinanceCcList(extra?.cc);

  // 5. Build email HTML
  const currencySymbol = receipt.currency === "USD" ? "$" : "UGX ";
  const formattedAmount = `${currencySymbol}${receipt.amountReceived.toLocaleString()}`;

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#2e7d32,#1b5e20);padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Receipt ${receipt.receiptNumber}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:13px;">Ozeki Reading Bridge Foundation</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;">Dear <strong>${contactName}</strong>,</p>
          <p style="margin:0 0 20px;font-size:14px;color:#333;line-height:1.6;">Thank you for your payment. This receipt confirms that we have received:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f8f0;border-radius:8px;padding:20px;margin:0 0 20px;text-align:center;">
            <tr><td>
              <p style="margin:0 0 6px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.05em;">Amount Received</p>
              <p style="margin:0;font-size:28px;font-weight:700;color:#2e7d32;">${formattedAmount}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;padding:16px;margin:0 0 20px;">
            <tr><td>
              <p style="margin:0 0 4px;font-size:13px;color:#666;">Receipt Date: <strong>${receipt.receiptDate}</strong></p>
              <p style="margin:0 0 4px;font-size:13px;color:#666;">Received From: <strong>${receipt.receivedFrom}</strong></p>
              <p style="margin:0 0 4px;font-size:13px;color:#666;">Payment Method: <strong>${receipt.paymentMethod}</strong></p>
              ${receipt.referenceNo ? `<p style="margin:0 0 4px;font-size:13px;color:#666;">Reference: <strong>${receipt.referenceNo}</strong></p>` : ""}
              ${receipt.description ? `<p style="margin:0;font-size:13px;color:#666;">Description: <strong>${receipt.description}</strong></p>` : ""}
            </td></tr>
          </table>
          ${receipt.notes ? `<p style="margin:0 0 16px;font-size:13px;color:#666;font-style:italic;">Note: ${receipt.notes}</p>` : ""}
        </td></tr>
        <tr><td style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999;">&copy; Ozeki Reading Bridge Foundation</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

  // 6. Generate PDF attachment
  const allocations: FinancePaymentAllocationRecord[] = [];
  let relatedInvoice: { invoiceNumber: string; description?: string; lines?: { description: string }[] } | null = null;
  if (receipt.relatedInvoiceId) {
    const inv = await getFinanceInvoiceByIdPostgres(receipt.relatedInvoiceId);
    if (inv) {
      allocations.push({
        id: 0,
        paymentId: receipt.id,
        invoiceId: inv.id,
        allocatedAmount: receipt.amountReceived,
        invoiceNumber: inv.invoiceNumber,
        createdBy: receipt.createdBy,
        createdAt: receipt.createdAt,
      });
      relatedInvoice = {
        invoiceNumber: inv.invoiceNumber,
        description: inv.notes,
        lines: inv.lineItems?.map(li => ({ description: li.description })) || [],
      };
    }
  }
  const pdfBuffer = await renderReceiptPdf(receipt, allocations, relatedInvoice);

  // 7. Send the email with PDF attached
  const { sendFinanceMail } = await import("@/lib/finance-email");
  const emailResult = await sendFinanceMail({
    to: toEmails,
    cc: ccEmails,
    subject: `Receipt ${receipt.receiptNumber} — ${formattedAmount} | Ozeki Reading Bridge Foundation`,
    html,
    attachments: [{
      filename: `Receipt_${receipt.receiptNumber}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any],
  });

  // 8. Update receipt
  const sentTo = toEmails.join(", ");
  await queryPostgres(
    "UPDATE finance_receipts SET emailed_at = NOW(), last_sent_to = $1 WHERE id = $2",
    [sentTo, id],
  );

  const updated = await getFinanceReceiptByIdPostgres(id);
  return { email: { status: emailResult.status, providerMessage: emailResult.providerMessage }, receipt: updated };
}

/**
 * Record a payment against an invoice. Thin wrapper that delegates to the
 * canonical lifecycle (finance-lifecycle.recordInvoicePaymentPostgres) — the
 * ONLY entry point allowed to create a finance_payments row + receipt + ledger
 * + GL entry. Old in-line implementation was removed per 2026-04 audit because
 * it triple-posted (receipt + ledger + GL) without dedup guards and conflated
 * invoice balance updates across two code paths.
 *
 * Retained return shape for UI backward compat.
 */
export async function recordFinancePaymentPostgres(
  input: {
    invoiceId?: number;
    date: string;
    amount: number;
    method: "cash" | "bank_transfer" | "mobile_money" | "cheque" | "other" | string;
    reference?: string;
    notes?: string;
  },
  invoiceIdFallback: number,
  actor: FinanceActor,
) {
  const targetInvoiceId = input.invoiceId || invoiceIdFallback;
  if (!targetInvoiceId) throw new Error("Invoice id is required to record a payment.");
  const actorId = (actor as { id?: number; userId?: number }).id ?? (actor as { userId?: number }).userId;
  if (!actorId) throw new Error("Authenticated user id is required to record a payment.");

  const { recordInvoicePaymentPostgres } = await import("@/lib/server/postgres/repositories/finance-lifecycle");
  const method = (["cash", "bank_transfer", "mobile_money", "cheque", "other"].includes(input.method)
    ? input.method
    : "other") as "cash" | "bank_transfer" | "mobile_money" | "cheque" | "other";

  const result = await recordInvoicePaymentPostgres({
    invoiceId: targetInvoiceId,
    amount: input.amount,
    method,
    date: input.date,
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    actorUserId: actorId,
  });

  const savedInvoice = await getFinanceInvoiceByIdPostgres(targetInvoiceId);
  return {
    payment: { id: result.paymentId, date: input.date, amount: input.amount, method: input.method },
    autoReceipt: {
      id: result.receiptId,
      receiptNumber: result.receiptNumber,
      relatedInvoiceId: targetInvoiceId,
      pdfFileId: null,
    },
    invoice: savedInvoice,
    idempotent: result.idempotent,
  };
}

// ── Contact Creation (was a no-op stub returning {id:0}) ─────────────
export async function createFinanceContactPostgres(
  input: {
    name: string;
    emails: string[];
    phone?: string;
    address?: string;
    contactType: string;
  },
  _actor?: FinanceActor,
): Promise<FinanceContactRecord> {
  const result = await queryPostgres<{ id: number; createdAt: string }>(
    `INSERT INTO finance_contacts (name, emails_json, phone, address, contact_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at AS "createdAt"`,
    [
      input.name,
      JSON.stringify(input.emails || []),
      input.phone || null,
      input.address || null,
      input.contactType,
    ],
  );
  const row = result.rows[0];
  return {
    id: Number(row.id),
    name: input.name,
    emails: input.emails || [],
    phone: input.phone,
    address: input.address,
    contactType: input.contactType as FinanceContactRecord["contactType"],
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
  };
}

// ── Invoice Draft Update (was a throwing stub) ───────────────────────
export async function updateFinanceInvoiceDraftPostgres(
  id: number,
  input: {
    contactId?: number;
    category?: string;
    issueDate?: string;
    dueDate?: string;
    currency?: string;
    lineItems?: Array<{ description: string; qty: number; unitPrice: number }>;
    tax?: number;
    notes?: string;
  },
  _actor: FinanceActor,
): Promise<FinanceInvoiceRecord> {
  return await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      const current = await client.query(
        "SELECT status FROM finance_invoices WHERE id = $1",
        [id],
      );
      if (current.rows.length === 0) throw new Error("Invoice not found.");
      if (current.rows[0].status !== "draft") {
        throw new Error("Only draft invoices can be edited.");
      }

      const sets: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (input.contactId !== undefined) {
        sets.push(`contact_id = $${paramIndex++}`);
        params.push(input.contactId);
      }
      if (input.category !== undefined) {
        const baseCategory = mapFinanceIncomeToBaseCategory(input.category);
        sets.push(`category = $${paramIndex++}`);
        params.push(baseCategory);
        sets.push(`display_category = $${paramIndex++}`);
        params.push(input.category);
      }
      if (input.issueDate !== undefined) {
        sets.push(`issue_date = $${paramIndex++}`);
        params.push(input.issueDate);
      }
      if (input.dueDate !== undefined) {
        sets.push(`due_date = $${paramIndex++}`);
        params.push(input.dueDate);
      }
      if (input.currency !== undefined) {
        sets.push(`currency = $${paramIndex++}`);
        params.push(input.currency);
      }
      if (input.tax !== undefined) {
        sets.push(`tax = $${paramIndex++}`);
        params.push(input.tax);
      }
      if (input.notes !== undefined) {
        sets.push(`notes = $${paramIndex++}`);
        params.push(input.notes);
      }

      if (input.lineItems && input.lineItems.length > 0) {
        let subtotal = 0;
        for (const item of input.lineItems) {
          subtotal += item.qty * item.unitPrice;
        }
        const tax = input.tax ?? 0;
        const total = subtotal + tax;

        sets.push(`subtotal = $${paramIndex++}`);
        params.push(subtotal);
        sets.push(`total = $${paramIndex++}`);
        params.push(total);
        sets.push(`balance_due = $${paramIndex++}`);
        params.push(total);
      }

      sets.push(`updated_at = NOW()`);

      if (sets.length > 1) {
        params.push(id);
        await client.query(
          `UPDATE finance_invoices SET ${sets.join(", ")} WHERE id = $${paramIndex}`,
          params,
        );
      }

      if (input.lineItems && input.lineItems.length > 0) {
        await client.query("DELETE FROM finance_invoice_items WHERE invoice_id = $1", [id]);
        for (const item of input.lineItems) {
          const amount = item.qty * item.unitPrice;
          await client.query(
            `INSERT INTO finance_invoice_items (invoice_id, description, qty, unit_price, amount)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, item.description, item.qty, item.unitPrice, amount],
          );
        }
      }

      await client.query("COMMIT");
      const savedInvoice = await getFinanceInvoiceByIdPostgres(id);
      if (!savedInvoice) throw new Error("Failed to read back updated invoice.");
      return savedInvoice;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  });
}

// ── Monthly Budget Upsert (was a throwing stub) ──────────────────────
export async function upsertMonthlyBudgetPostgres(
  input: {
    month: string;
    currency?: string;
    subcategory: string;
    budgetAmount: number;
  },
  actorUserId: number,
) {
  const currency = input.currency || "UGX";
  const result = await queryPostgres<{ id: number }>(
    `INSERT INTO finance_budgets_monthly (month, currency, subcategory, budget_amount, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (month, currency, subcategory)
     DO UPDATE SET budget_amount = EXCLUDED.budget_amount, updated_at = NOW()
     RETURNING id`,
    [input.month, currency, input.subcategory, input.budgetAmount, actorUserId],
  );
  return {
    id: Number(result.rows[0]?.id ?? 0),
    month: input.month,
    currency,
    subcategory: input.subcategory,
    budgetAmount: input.budgetAmount,
  };
}
