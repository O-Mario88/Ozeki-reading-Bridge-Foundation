import type { FinanceCurrency, FinanceInvoiceRecord, FinanceInvoiceLineItemRecord, FinanceReceiptRecord, FinancePaymentAllocationRecord } from "@/lib/types";
import fs from "node:fs/promises";
import path from "node:path";

async function getSignatureDataUri(): Promise<string> {
  try {
    const sigPath = path.join(process.cwd(), "assets", "photos", "Signature.png");
    const bytes = await fs.readFile(sigPath);
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch (_e) {
    return "";
  }
}

// Standard formatting helper for the PDF
function formatMoney(currency: FinanceCurrency, amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Standard date format for all PDF reports: "Wed 18 March, 2026"
export function formatReportDate(isoString: string | null | undefined): string {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(d);
    const day = d.getUTCDate();
    const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(d);
    const year = d.getUTCFullYear();
    return `${weekday} ${day} ${month}, ${year}`;
  } catch {
    return isoString;
  }
}

const financePdfStyles = `
  .fp-container { width: 100%; font-family: var(--pdf-font-family), sans-serif; font-size: 10.5pt; color: #1e293b; }
  .fp-header-grid { display: flex; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
  .fp-header-col h3 { margin: 0 0 6px 0; font-size: 11pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .fp-header-col p { margin: 0 0 4px 0; }
  .fp-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .fp-table th { text-align: left; padding: 10px 12px; background: #f8fafc; border-bottom: 2px solid #cbd5e1; font-weight: 600; font-size: 9.5pt; color: #334155; }
  .fp-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .fp-table .num { text-align: right; }
  .fp-totals { margin-left: auto; width: 350px; border-collapse: collapse; }
  .fp-totals td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; }
  .fp-totals .label { font-weight: 600; color: #475569; text-align: left; }
  .fp-totals .grand-total { font-weight: 700; font-size: 12pt; color: #0f172a; border-top: 2px solid #94a3b8; border-bottom: 3px double #94a3b8; }
  .fp-notes { margin-top: 32px; padding: 16px; background: #f8fafc; border-left: 4px solid #cbd5e1; font-size: 9.5pt; color: #475569; page-break-inside: avoid; }
  .fp-title-box { background: var(--orbf-accent, #1f2a44); color: white; padding: 6px 16px; display: inline-block; font-weight: bold; font-size: 14pt; border-radius: 4px; margin-bottom: 20px; }
  .fp-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 8pt; font-weight: 600; text-transform: uppercase; }
  .fp-badge.paid { background: #dcfce7; color: #166534; }
  .fp-badge.sent { background: #e0f2fe; color: #075985; }
  .fp-badge.draft { background: #f1f5f9; color: #475569; }
  .fp-badge.overdue { background: #fee2e2; color: #991b1b; }
`;

export async function buildInvoiceHtml(
  invoice: FinanceInvoiceRecord,
  lines: FinanceInvoiceLineItemRecord[],
  settings?: { paymentInstructions?: string },
  contact?: { name: string; emails?: string[]; phone?: string; address?: string },
): Promise<{ html: string; css: string }> {
  const signatureDataUri = await getSignatureDataUri();
  const lineHtml = lines.map(line => `
    <tr>
      <td>
        <div style="font-weight: 500; color: #0f172a; margin-bottom: 4px;">${line.description}</div>
      </td>
      <td class="num">${line.qty}</td>
      <td class="num" style="white-space: nowrap;">${formatMoney(invoice.currency, line.unitPrice)}</td>
      <td class="num" style="font-weight: 500; white-space: nowrap;">${formatMoney(invoice.currency, line.qty * line.unitPrice)}</td>
    </tr>
  `).join("");

  const amountPaid = invoice.paidAmount;

  // Build Billed To details from contact record
  const billedToName = contact?.name || invoice.contactName || "No Name";
  const billedToLines: string[] = [];
  if (contact?.address) billedToLines.push(contact.address);
  if (contact?.emails?.length) billedToLines.push(contact.emails.join(", "));
  if (contact?.phone) billedToLines.push(contact.phone);
  const billedToExtra = billedToLines.map(l => `<p style="margin: 2px 0; color: #475569;">${l}</p>`).join("");

  const html = `
    <div class="fp-container">
      <div class="fp-header-grid">
        <div class="fp-header-col">
          <h3>Billed To</h3>
          <p style="font-size: 11pt; font-weight: 600; color: #0f172a; margin-bottom: 4px;">${billedToName}</p>
          ${billedToExtra}
        </div>
        <div class="fp-header-col" style="text-align: right;">
          <h3>Payment Details</h3>
          <p style="margin: 2px 0;"><strong>Bank Name:</strong> Equity Bank Limited</p>
          <p style="margin: 2px 0;"><strong>Bank Account:</strong> 1007203565985</p>
          <p style="margin: 2px 0;"><strong>Account Name:</strong> Ozeki Reading Bridge Foundation Limited</p>
          <p style="margin: 2px 0;"><strong>Email:</strong> amos@ozekiread.org</p>
          <p style="margin: 2px 0;"><strong>Phone Number:</strong> +256 773 397375</p>
        </div>
      </div>

      <table class="fp-table">
        <thead>
          <tr>
            <th style="width: 70%;">Description</th>
            <th class="num" style="width: 6%; white-space: nowrap;">Qty</th>
            <th class="num" style="width: 12%; white-space: nowrap;">Unit Price</th>
            <th class="num" style="width: 12%; white-space: nowrap;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineHtml}
        </tbody>
      </table>

      <table class="fp-totals">
        <tr>
          <td class="label">Subtotal</td>
          <td>${formatMoney(invoice.currency, invoice.subtotal)}</td>
        </tr>
        <tr>
          <td class="label">Amount Paid</td>
          <td>${formatMoney(invoice.currency, amountPaid)}</td>
        </tr>
        <tr>
          <td class="label grand-total">Balance Due</td>
          <td class="grand-total">${formatMoney(invoice.currency, invoice.balanceDue)}</td>
        </tr>
      </table>

      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        <div class="fp-notes" style="margin-top: 0; margin-bottom: 0; width: 320px; text-align: left;">
          ${invoice.notes ? `<strong>Notes:</strong><br/>${invoice.notes.replace(/\n/g, "<br/>")}` : ""}
        </div>

        <div style="width: 250px; border-top: 1px dashed #cbd5e1; padding-top: 8px; text-align: center; position: relative;">
          ${signatureDataUri ? `<img src="${signatureDataUri}" style="max-height: 80px; width: 100%; object-fit: contain; position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%);" alt="Signature" />` : ""}
          <span style="font-size: 9pt; color: #64748b; font-weight: 600; text-transform: uppercase;">Authorized Digital Signature</span>
        </div>
      </div>
    </div>
  `;

  return { html, css: financePdfStyles };
}

export async function buildReceiptHtml(receipt: FinanceReceiptRecord, allocations: FinancePaymentAllocationRecord[]): Promise<{ html: string; css: string }> {
  const signatureDataUri = await getSignatureDataUri();
  const allocationHtml = allocations.length > 0 ? `
    <h4 style="margin: 16px 0 8px; color: #334155; font-size: 11pt; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px;">Payment Allocations</h4>
    <table class="fp-table">
      <thead>
        <tr>
          <th>Invoice / Reference</th>
          <th class="num">Amount Applied</th>
        </tr>
      </thead>
      <tbody>
        ${allocations.map(a => `
          <tr>
            <td>${a.invoiceNumber}</td>
            <td class="num">${formatMoney(receipt.currency, a.allocatedAmount)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : "";

  const html = `
    <div class="fp-container">
      <div class="fp-header-grid">
        <div class="fp-header-col">
          <h3>Received From</h3>
          <p style="font-size: 11pt; font-weight: 600; color: #0f172a;">${receipt.receivedFrom || "No Name"}</p>
        </div>
        <div class="fp-header-col" style="text-align: right;">
          <p><strong>Receipt Number:</strong> ${receipt.receiptNumber}</p>
          <p><strong>Payment Date:</strong> ${formatReportDate(receipt.receiptDate)}</p>
          <p><strong>Payment Method:</strong> ${(receipt.paymentMethod || "Other").toUpperCase()}</p>
        </div>
      </div>

      <div style="margin-bottom: 16px; font-size: 11pt; color: #334155;">
        <strong>Being payment for:</strong> ${receipt.description || receipt.notes || "........................................................"}
      </div>

      <div style="background: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 16px;">
        <span style="display: block; font-size: 10pt; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Amount Received</span>
        <span style="display: block; font-size: 24pt; font-weight: 700; color: #0f172a; line-height: 1;">${formatMoney(receipt.currency, receipt.amountReceived)}</span>
      </div>

      ${allocationHtml}

      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        <div class="fp-notes" style="margin-top: 0; margin-bottom: 0; width: 320px; text-align: left;">
          <strong>Note:</strong><br/>
          Thank You for supporting Literacy in Uganda
        </div>

        <div style="width: 250px; border-top: 1px dashed #cbd5e1; padding-top: 8px; text-align: center; position: relative;">
          ${signatureDataUri ? `<img src="${signatureDataUri}" style="max-height: 80px; width: 100%; object-fit: contain; position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%);" alt="Signature" />` : ""}
          <span style="font-size: 9pt; color: #64748b; font-weight: 600; text-transform: uppercase;">Authorized Digital Signature</span>
        </div>
      </div>
    </div>
  `;

  return { html, css: financePdfStyles };
}

export function buildFinancialReportHtml(
  data: Array<Record<string, unknown>>,
  columns: Array<{ key: string; label: string; format: "money" | "text" | "number" }>,
  currency: FinanceCurrency = "UGX"
): { html: string; css: string } {
  
  if (!data || data.length === 0) {
    return {
      html: `<div class="fp-container"><p style="text-align: center; padding: 40px; color: #64748b;">No data available for this report.</p></div>`,
      css: financePdfStyles
    };
  }

  const thHtml = columns.map(col => `
    <th class="${col.format !== "text" ? "num" : ""}">${col.label}</th>
  `).join("");

  const tbodyHtml = data.map(row => {
    // Check if row is a group header or total row (e.g. bold or specialized styling)
    const isTotal = row._isTotal === true;
    const isHeader = row._isHeader === true;
    const style = isTotal ? "font-weight: 700; background: #f8fafc;" : isHeader ? "font-weight: 700; background: #f1f5f9; color: #0f172a;" : "";

    const tdHtml = columns.map((col, index) => {
      const rawVal = row[col.key];
      let formattedVal = rawVal === null || rawVal === undefined ? "—" : String(rawVal);
      
      if (typeof rawVal === "number") {
        if (col.format === "money") {
          formattedVal = formatMoney(currency, rawVal);
        } else if (col.format === "number") {
          formattedVal = new Intl.NumberFormat("en-US").format(rawVal);
        }
      }

      // If it's a header row, we might just span the first column
      if (isHeader && index === 0) {
        return `<td style="${style}" colspan="${columns.length}">${formattedVal}</td>`;
      } else if (isHeader) {
        return ""; // Span handles it
      }

      return `<td class="${col.format !== "text" ? "num" : ""}" style="${style}">${formattedVal}</td>`;
    }).join("");

    return `<tr>${tdHtml}</tr>`;
  }).join("");

  const html = `
    <div class="fp-container">
      <table class="fp-table">
        <thead>
          <tr>${thHtml}</tr>
        </thead>
        <tbody>
          ${tbodyHtml}
        </tbody>
      </table>
      <div style="font-size: 8pt; color: #94a3b8; text-align: center; margin-top: 16px;">
        System generated report on ${formatReportDate(new Date().toISOString())}. Data accurately reflects General Ledger state at time of export.
      </div>
    </div>
  `;

  return { html, css: financePdfStyles };
}
