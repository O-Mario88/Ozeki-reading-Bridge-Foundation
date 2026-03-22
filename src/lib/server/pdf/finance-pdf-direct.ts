/**
 * Direct pdf-lib renderer for finance documents (invoices & receipts).
 *
 * Instead of going through HTML → parser → generic renderer, this builds PDFs
 * pixel-by-pixel via pdf-lib drawing primitives. This gives precise control
 * over the professional layout matching common accounting-software invoices:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  Dark header bar (logo + name | doc label)   │
 *   │──────────────────────────────────────────────│
 *   │  Info strip (doc number | date | due date)   │
 *   │──────────────────────────────────────────────│
 *   │  FROM        │  TO          │  Total Due     │
 *   │──────────────────────────────────────────────│
 *   │  Line Items Table                            │
 *   │──────────────────────────────────────────────│
 *   │  Totals (subtotal, paid, balance)            │
 *   │──────────────────────────────────────────────│
 *   │  Notes                │  Signature           │
 *   └──────────────────────────────────────────────┘
 */
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { loadBrandLogo, getCurrentPdfBrandProfile, drawBrandWatermark } from "@/lib/pdf-branding";
import type {
  FinanceInvoiceRecord,
  FinanceInvoiceLineItemRecord,
  FinanceReceiptRecord,
  FinancePaymentAllocationRecord,
  FinanceCurrency,
} from "@/lib/types";
import { formatReportDate } from "./finance-pdf-templates";
import fs from "node:fs/promises";
import path from "node:path";

/* ═══════════════════════ Constants ═══════════════════════ */

const A4_W = 595.27;
const A4_H = 841.89;
const ML = 40; // margin left
const MR = 40; // margin right
const CW = A4_W - ML - MR; // content width

// Ozeki dark green #006b61
const BRAND_GREEN = rgb(0, 0.42, 0.38);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.53);
const LIGHT_GRAY = rgb(0.94, 0.95, 0.97);
const BORDER_GRAY = rgb(0.80, 0.83, 0.87);
const GREEN = rgb(0, 0.4, 0.1);

/* ═══════════════════════ Helpers ═══════════════════════ */

function sanitize(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u2024\u2027\u00B7]/g, "|")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .trim();
}

function fmtMoney(currency: FinanceCurrency, amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  try {
    page.drawText(sanitize(text), { x, y, size, font, color });
  } catch {
    /* skip unsupported glyph */
  }
}

function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  try {
    const safe = sanitize(text);
    const w = font.widthOfTextAtSize(safe, size);
    page.drawText(safe, { x: rightX - w, y, size, font, color });
  } catch {
    /* skip */
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const cand = cur ? `${cur} ${word}` : word;
    try {
      if (font.widthOfTextAtSize(cand, size) <= maxW) {
        cur = cand;
      } else {
        if (cur) lines.push(cur);
        cur = word;
      }
    } catch {
      if (cur) lines.push(cur);
      cur = word.replace(/[^\x20-\x7E]/g, "");
    }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 ? lines : [""];
}

async function loadSignatureImage(doc: PDFDocument): Promise<PDFImage | null> {
  try {
    const sigPath = path.join(process.cwd(), "assets", "photos", "Signature.png");
    const bytes = await fs.readFile(sigPath);
    try {
      return await doc.embedPng(bytes);
    } catch {
      return await doc.embedJpg(bytes);
    }
  } catch {
    return null;
  }
}

/* ═══════════════════════ Shared Drawing Blocks ═══════════════════════ */

/**
 * Dark header bar — logo + org name on left, doc label + contact info on right.
 * Returns the Y position below the header bar.
 */
function drawHeaderBar(
  page: PDFPage,
  logo: PDFImage | null,
  font: PDFFont,
  fontBold: PDFFont,
  docLabel: string,
  docSubLabel?: string,
): number {
  const profile = getCurrentPdfBrandProfile();
  const barH = 110;
  const barY = A4_H - barH;

  // Dark background
  page.drawRectangle({ x: 0, y: barY, width: A4_W, height: barH, color: BRAND_GREEN });

  // Logo on the left
  const logoX = ML;
  if (logo) {
    const logoH = 56;
    const logoW = (logo.width / logo.height) * logoH;
    page.drawImage(logo, { x: logoX, y: barY + 30, width: logoW, height: logoH });
    // Org name + address lines to the right of logo
    const nameX = logoX + logoW + 12;
    drawText(page, profile.name, nameX, barY + 72, fontBold, 16, WHITE);
    drawText(page, "Acholi Lane, Gulu City, Uganda", nameX, barY + 56, font, 8, WHITE);
    drawText(page, "P.O. Box 204743, Kampala, Uganda", nameX, barY + 44, font, 8, WHITE);
    drawText(page, "TIN 1057023312 | REG 80034783181112", nameX, barY + 32, font, 8, WHITE);
  } else {
    // No logo — just org name large
    drawText(page, profile.name, logoX, barY + 72, fontBold, 20, WHITE);
    drawText(page, "Acholi Lane, Gulu City, Uganda", logoX, barY + 56, font, 8, WHITE);
    drawText(page, "P.O. Box 204743, Kampala, Uganda", logoX, barY + 44, font, 8, WHITE);
    drawText(page, "TIN 1057023312 | REG 80034783181112", logoX, barY + 32, font, 8, WHITE);
  }

  // Right side — doc label + contact (aligned with left side)
  const rX = A4_W - MR;
  drawRightText(page, docLabel, rX, barY + 76, fontBold, 18, WHITE);
  if (docSubLabel) {
    drawRightText(page, docSubLabel, rX, barY + 60, font, 9, WHITE);
  }
  drawRightText(page, profile.telephone, rX, barY + 44, font, 8, WHITE);
  drawRightText(page, profile.email, rX, barY + 32, font, 8, WHITE);

  return barY; // top of next section
}

/**
 * Info strip — dark-tinted row with key-value pairs spread across.
 */
function drawInfoStrip(
  page: PDFPage,
  y: number,
  font: PDFFont,
  fontBold: PDFFont,
  items: { label: string; value: string }[],
): number {
  const stripH = 32;
  const stripY = y - stripH;

  page.drawRectangle({ x: 0, y: stripY, width: A4_W, height: stripH, color: rgb(0.894, 0.435, 0.243) });

  const segW = CW / items.length;
  for (let i = 0; i < items.length; i++) {
    const x = ML + i * segW;
    drawText(page, items[i].label.toUpperCase(), x + 6, stripY + 18, fontBold, 7, rgb(1, 1, 1));
    drawText(page, items[i].value, x + 6, stripY + 6, font, 9, WHITE);
  }

  return stripY; // bottom of strip
}

/**
 * Three-column section: FROM / TO / Total Due (or equivalent for receipts).
 */
function drawThreeColumns(
  page: PDFPage,
  y: number,
  font: PDFFont,
  fontBold: PDFFont,
  col1: { heading: string; lines: string[] },
  col2: { heading: string; lines: string[] },
  col3: { heading: string; bigValue: string; color?: ReturnType<typeof rgb> },
): number {
  const sectionY = y - 14;
  // When col2 is empty, shift col3 left by using a narrower middle column
  const col2IsEmpty = col2.lines.length === 0 && !col2.heading;
  const col1W = CW * (col2IsEmpty ? 0.36 : 0.32);
  const col2W = CW * (col2IsEmpty ? 0.30 : 0.40);
  const lineH = 13;
  const headSize = 8;
  const textSize = 9;

  // Draw top separator line
  page.drawLine({
    start: { x: ML, y: sectionY + 6 },
    end: { x: A4_W - MR, y: sectionY + 6 },
    thickness: 0.5,
    color: BORDER_GRAY,
  });

  const curY = sectionY - 6;
  const maxLines = Math.max(col1.lines.length, col2.lines.length, 2);
  const sepTopY = curY + 10;
  const sepBotY = curY - (lineH * maxLines) - 10;

  // Column 1 — FROM
  const c1x = ML;
  drawText(page, col1.heading.toUpperCase(), c1x, curY, fontBold, headSize, MUTED);
  let lineY = curY - lineH - 2;
  for (const line of col1.lines) {
    drawText(page, line, c1x, lineY, font, textSize, BLACK);
    lineY -= lineH;
  }

  // Vertical separator between col 1 and col 2 (skip when col2 is empty — receipt layout)
  if (!col2IsEmpty) {
    const sep1X = ML + col1W - 6;
    page.drawLine({
      start: { x: sep1X, y: sepTopY },
      end: { x: sep1X, y: sepBotY },
      thickness: 0.5,
      color: BORDER_GRAY,
    });
  }

  // Column 2 — TO
  const c2x = ML + col1W + 4;
  drawText(page, col2.heading.toUpperCase(), c2x, curY, fontBold, headSize, MUTED);
  lineY = curY - lineH - 2;
  for (const line of col2.lines) {
    drawText(page, line, c2x, lineY, font, textSize, BLACK);
    lineY -= lineH;
  }

  // Vertical separator between col 2 and col 3
  const sep2X = ML + col1W + col2W - 2;
  page.drawLine({
    start: { x: sep2X, y: sepTopY },
    end: { x: sep2X, y: sepBotY },
    thickness: 0.5,
    color: BORDER_GRAY,
  });

  // Column 3 — Total Due (big number)
  const c3x = ML + col1W + col2W + 10;
  drawText(page, col3.heading.toUpperCase(), c3x, curY, fontBold, headSize, MUTED);
  // More vertical space between heading and amount
  drawText(page, col3.bigValue, c3x, curY - lineH - 14, fontBold, 22, col3.color || GREEN);

  // Calculate bottom
  const bottomY = curY - (lineH * maxLines) - 20;

  // Bottom separator
  page.drawLine({
    start: { x: ML, y: bottomY + 4 },
    end: { x: A4_W - MR, y: bottomY + 4 },
    thickness: 0.5,
    color: BORDER_GRAY,
  });

  return bottomY;
}

/**
 * Line items table with header row and data rows.
 */
function drawTable(
  page: PDFPage,
  y: number,
  font: PDFFont,
  fontBold: PDFFont,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  numericCols: Set<number>,
): number {
  const headSize = 8;
  const rowSize = 9;
  const rowH = 22;
  const headerH = 24;

  let curY = y;

  // Header row background
  page.drawRectangle({ x: ML, y: curY - headerH, width: CW, height: headerH, color: LIGHT_GRAY });
  page.drawLine({
    start: { x: ML, y: curY - headerH },
    end: { x: ML + CW, y: curY - headerH },
    thickness: 1.5,
    color: BORDER_GRAY,
  });

  // Header text
  let colX = ML;
  for (let i = 0; i < headers.length; i++) {
    const w = colWidths[i] * CW;
    if (numericCols.has(i)) {
      drawRightText(page, headers[i].toUpperCase(), colX + w - 4, curY - 15, fontBold, headSize, MUTED);
    } else {
      drawText(page, headers[i].toUpperCase(), colX + 6, curY - 15, fontBold, headSize, MUTED);
    }
    colX += w;
  }

  curY -= headerH;

  // Data rows
  for (const row of rows) {
    if (curY - rowH < 80) break; // safety margin

    page.drawLine({
      start: { x: ML, y: curY - rowH },
      end: { x: ML + CW, y: curY - rowH },
      thickness: 0.5,
      color: BORDER_GRAY,
    });

    colX = ML;
    for (let i = 0; i < Math.min(row.length, headers.length); i++) {
      const w = colWidths[i] * CW;
      if (numericCols.has(i)) {
        drawRightText(page, row[i], colX + w - 4, curY - 14, font, rowSize, BLACK);
      } else {
        // Wrap description if too long
        const maxTextW = w - 12;
        const lines = wrapText(row[i], font, rowSize, maxTextW);
        let ly = curY - 14;
        for (const line of lines) {
          drawText(page, line, colX + 6, ly, font, rowSize, BLACK);
          ly -= 12;
        }
      }
      colX += w;
    }

    curY -= rowH;
  }

  return curY;
}

/**
 * Totals section — right-aligned key/value pairs.
 */
function drawTotals(
  page: PDFPage,
  y: number,
  font: PDFFont,
  fontBold: PDFFont,
  items: { label: string; value: string; bold?: boolean; topBorder?: boolean }[],
): number {
  const totalsW = 260;
  const totalsX = A4_W - MR - totalsW;
  const rowH = 20;
  let curY = y;

  for (const item of items) {
    if (item.topBorder) {
      page.drawLine({
        start: { x: totalsX, y: curY + 2 },
        end: { x: A4_W - MR, y: curY + 2 },
        thickness: 1.5,
        color: BORDER_GRAY,
      });
    }

    const f = item.bold ? fontBold : font;
    const sz = item.bold ? 12 : 9.5;
    drawText(page, item.label, totalsX + 6, curY - 13, f, sz, item.bold ? BLACK : MUTED);
    drawRightText(page, item.value, A4_W - MR - 4, curY - 13, f, sz, BLACK);

    curY -= rowH;
  }

  return curY;
}

/**
 * Footer — notes on left, signature on right.
 */
async function drawFooter(
  page: PDFPage,
  y: number,
  font: PDFFont,
  fontBold: PDFFont,
  doc: PDFDocument,
  notes?: string,
): Promise<number> {
  const curY = y - 10;

  // Top border
  page.drawLine({
    start: { x: ML, y: curY + 6 },
    end: { x: A4_W - MR, y: curY + 6 },
    thickness: 0.5,
    color: BORDER_GRAY,
  });

  // Payment details on the left
  drawText(page, "PAYMENT DETAILS", ML, curY - 8, fontBold, 8, BLACK);
  const paymentLines = [
    "Bank: Equity Bank Limited",
    "Account: 1007203565985",
    "Ozeki Reading Bridge Foundation",
    "Email: support@ozekiread.org",
  ];
  if (notes && notes.trim()) {
    paymentLines.push(""); // blank line
    paymentLines.push(notes);
  }
  let nY = curY - 22;
  for (const line of paymentLines) {
    if (line === "") { nY -= 4; continue; }
    const wrappedLines = wrapText(line, font, 8.5, CW / 2 - 20);
    for (const wl of wrappedLines) {
      drawText(page, wl, ML, nY, font, 8.5, MUTED);
      nY -= 12;
    }
  }

  // Signature on the right
  const sigImg = await loadSignatureImage(doc);
  const sigAreaX = A4_W - MR - 180;
  if (sigImg) {
    const sigH = 60;
    const sigW = (sigImg.width / sigImg.height) * sigH;
    const sigX = sigAreaX + (180 - sigW) / 2;
    page.drawImage(sigImg, { x: sigX, y: curY - 68, width: sigW, height: sigH });
  }
  drawText(page, "Issued by, signature:", sigAreaX + 40, curY - 8, font, 8, MUTED);

  // Dashed line under signature
  const dashY = curY - 74;
  page.drawLine({
    start: { x: sigAreaX, y: dashY },
    end: { x: A4_W - MR, y: dashY },
    thickness: 0.5,
    color: BORDER_GRAY,
  });
  drawText(page, "Authorized Signatory", sigAreaX + 40, dashY - 12, font, 7.5, MUTED);

  return dashY - 20;
}

/**
 * Full branded footer at the bottom — matches the existing Ozeki footer style.
 * Includes a separator line, two metadata lines (address/phone/email then
 * PO Box/TIN/REG), a footer note, and a thin navy accent strip at the very bottom.
 */
function drawBottomBar(
  page: PDFPage,
  font: PDFFont,
  footerNote?: string,
) {
  const profile = getCurrentPdfBrandProfile();
  const lineY = 64;
  const lineLeft = 34;
  const lineRight = A4_W - 34;

  // Separator line
  page.drawLine({
    start: { x: lineLeft, y: lineY },
    end: { x: lineRight, y: lineY },
    thickness: 1.6,
    color: rgb(0.1, 0.13, 0.18),
  });

  // Line 1: address | telephone | email
  const metaLine1 = `${profile.address} | ${profile.telephone} | ${profile.email}`;
  drawCenteredText(page, font, metaLine1, lineY - 12, 8, MUTED);

  // Line 2: PO Box | TIN | REG
  const metaLine2 = `${profile.poBox} | TIN ${profile.tin} | REG ${profile.registrationNumber}`;
  drawCenteredText(page, font, metaLine2, lineY - 22, 7.3, MUTED);

  // Footer note
  if (footerNote && footerNote.trim().length > 0) {
    drawCenteredText(page, font, footerNote, lineY - 31.5, 6.8, MUTED);
  }

  // Thin navy accent strip at very bottom
  page.drawRectangle({ x: 0, y: 0, width: A4_W, height: 6, color: BRAND_GREEN });
}

/** Center text horizontally on the page. */
function drawCenteredText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  y: number,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  try {
    const safe = sanitize(text);
    const textW = font.widthOfTextAtSize(safe, size);
    const x = Math.max(24, (A4_W - textW) / 2);
    page.drawText(safe, { x, y, size, font, color });
  } catch { /* skip */ }
}

/* ═══════════════════════ Public: Invoice ═══════════════════════ */

export async function renderInvoicePdf(
  invoice: FinanceInvoiceRecord,
  lines: FinanceInvoiceLineItemRecord[],
  settings?: { paymentInstructions?: string },
  contact?: { name: string; emails?: string[]; phone?: string; address?: string },
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadBrandLogo(doc);

  const page = doc.addPage([A4_W, A4_H]);

  // Logo watermark behind all content
  drawBrandWatermark(page, logo);

  // 1. Dark header bar
  const afterHeader = drawHeaderBar(page, logo, font, fontBold, "Invoice", "Tax Invoice");

  // 2. Info strip
  const afterStrip = drawInfoStrip(page, afterHeader, font, fontBold, [
    { label: "Invoice No.", value: invoice.invoiceNumber },
    { label: "Reference", value: invoice.invoiceNumber },
    { label: "Issue Date", value: formatReportDate(invoice.issueDate) },
    { label: "Due Date", value: formatReportDate(invoice.dueDate) },
  ]);

  // 3. Three-column section: FROM / TO / Total Due
  const profile = getCurrentPdfBrandProfile();
  const billedToName = contact?.name || invoice.contactName || "No Name";
  const billedToLines = [billedToName];
  if (contact?.address) billedToLines.push(contact.address);
  if (contact?.emails?.length) billedToLines.push(contact.emails.join(", "));
  if (contact?.phone) billedToLines.push(contact.phone);

  const fromLines = [
    profile.name,
    profile.address,
    profile.poBox,
    profile.email,
  ];

  const afterCols = drawThreeColumns(
    page, afterStrip, font, fontBold,
    { heading: "From", lines: fromLines },
    { heading: "To", lines: billedToLines },
    { heading: "Total due", bigValue: fmtMoney(invoice.currency, invoice.balanceDue), color: BLACK },
  );

  // 4. Line items table
  const tableHeaders = ["Description", "Quantity", `Unit Price (${invoice.currency})`, `Amount (${invoice.currency})`];
  const tableRows = lines.map(line => [
    line.description,
    String(line.qty),
    fmtMoney(invoice.currency, line.unitPrice),
    fmtMoney(invoice.currency, line.qty * line.unitPrice),
  ]);
  const colWidths = [0.50, 0.14, 0.18, 0.18];
  const numericCols = new Set([1, 2, 3]);

  const afterTable = drawTable(page, afterCols - 6, font, fontBold, tableHeaders, tableRows, colWidths, numericCols);

  // 5. Totals
  const afterTotals = drawTotals(page, afterTable - 4, font, fontBold, [
    { label: "Subtotal:", value: fmtMoney(invoice.currency, invoice.subtotal) },
    { label: `Total (${invoice.currency}):`, value: fmtMoney(invoice.currency, invoice.total), bold: true, topBorder: true },
  ]);

  // 6. Footer (payment details + signature)
  await drawFooter(page, afterTotals - 10, font, fontBold, doc);

  // 7. Bottom bar
  drawBottomBar(page, font, "Ozeki Financial Systems - Verified Invoice Document");

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

/* ═══════════════════════ Public: Receipt ═══════════════════════ */

export async function renderReceiptPdf(
  receipt: FinanceReceiptRecord,
  allocations: FinancePaymentAllocationRecord[],
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadBrandLogo(doc);

  const page = doc.addPage([A4_W, A4_H]);

  // Logo watermark behind all content
  drawBrandWatermark(page, logo);

  // 1. Dark header bar
  const afterHeader = drawHeaderBar(page, logo, font, fontBold, "Receipt", "Payment Receipt");

  // 2. Info strip
  const afterStrip = drawInfoStrip(page, afterHeader, font, fontBold, [
    { label: "Receipt No.", value: receipt.receiptNumber },
    { label: "Payment Date", value: formatReportDate(receipt.receiptDate) },
    { label: "Payment Method", value: (receipt.paymentMethod || "Other").toUpperCase() },
  ]);

  // 3. Three-column section: FROM / (blank) / Amount
  const fromLines = [receipt.receivedFrom || "No Name"];

  const afterCols = drawThreeColumns(
    page, afterStrip, font, fontBold,
    { heading: "Received From", lines: fromLines },
    { heading: "", lines: [] },
    { heading: "Amount Received", bigValue: fmtMoney(receipt.currency, receipt.amountReceived), color: GREEN },
  );

  // 4. Description
  let curY = afterCols - 6;
  if (receipt.description || receipt.notes) {
    drawText(page, "BEING PAYMENT FOR", ML, curY, fontBold, 8, MUTED);
    curY -= 16;
    const desc = receipt.description || receipt.notes || "";
    const descLines = wrapText(desc, font, 9.5, CW);
    for (const line of descLines) {
      drawText(page, line, ML, curY, font, 9.5, BLACK);
      curY -= 13;
    }
    curY -= 6;
  }

  // 5. Allocations table (if any)
  if (allocations.length > 0) {
    page.drawLine({
      start: { x: ML, y: curY + 4 },
      end: { x: A4_W - MR, y: curY + 4 },
      thickness: 0.5,
      color: BORDER_GRAY,
    });
    drawText(page, "PAYMENT ALLOCATIONS", ML, curY - 10, fontBold, 8, MUTED);
    curY -= 24;

    const allocHeaders = ["Invoice / Reference", `Amount Applied (${receipt.currency})`];
    const allocRows = allocations.map(a => [
      a.invoiceNumber || `INV-${a.invoiceId}`,
      fmtMoney(receipt.currency, a.allocatedAmount),
    ]);
    curY = drawTable(page, curY, font, fontBold, allocHeaders, allocRows, [0.65, 0.35], new Set([1]));
  }

  // 6. Footer (notes + signature)
  const footerNote = "Thank you for supporting Literacy in Uganda.";
  await drawFooter(page, curY - 10, font, fontBold, doc, footerNote);

  // 7. Bottom bar
  drawBottomBar(page, font, "Ozeki Financial Systems - Official Receipt Document");

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
