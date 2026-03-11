import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFImage, PDFPage, PDFFont, rgb } from "pdf-lib";
import { officialContact } from "@/lib/contact";
import {
  drawBrandFooter,
  drawBrandFrame,
  drawBrandHeader,
  drawBrandWatermark,
  loadBrandLogo,
} from "@/lib/pdf-branding";
import { embedPdfSansFonts, embedPdfSerifFonts } from "@/lib/pdf-fonts";
import type {
  FinanceCategory,
  FinanceCurrency,
  FinanceInvoiceLineItemRecord,
  FinanceMonthlyStatementRecord,
} from "@/lib/types";
import { getRuntimeDataDir } from "@/lib/runtime-paths";

const ORG_FOOTER =
  "Aggregated, privacy-protected operational finance record. Internal use only.";

type InvoicePdfInput = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: FinanceCurrency;
  category: Exclude<FinanceCategory, "Expense">;
  contactName: string;
  contactEmails: string[];
  lineItems: FinanceInvoiceLineItemRecord[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  paymentInstructions?: string;
};

type ReceiptPdfInput = {
  receiptNumber: string;
  receiptDate: string;
  currency: FinanceCurrency;
  category: Exclude<FinanceCategory, "Expense">;
  receivedFrom: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  relatedInvoiceNumber?: string;
  description?: string;
};

type StatementPdfInput = {
  documentType?: "full" | "balance_sheet" | "statement_of_financial_position" | "income_statement";
  statement: FinanceMonthlyStatementRecord;
  position: {
    asOfDate: string;
    currentAssets: Array<{ label: string; amount: number }>;
    nonCurrentAssets: Array<{ label: string; amount: number }>;
    currentLiabilities: Array<{ label: string; amount: number }>;
    nonCurrentLiabilities: Array<{ label: string; amount: number }>;
    equityLines: Array<{ label: string; amount: number }>;
  };
  income: {
    asOfDate: string;
    revenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    marketingExpenses: number;
    rent: number;
    utilities: number;
    insurance: number;
    generalAdmin: number;
    depreciation: number;
    totalOperatingExpenses: number;
    operatingIncome: number;
    interestExpense: number;
    incomeBeforeTax: number;
    incomeTaxExpense: number;
    netIncome: number;
  };
  topIncome?: Array<{ label: string; amount: number }>;
  topExpenses?: Array<{ label: string; amount: number }>;
};

export type SnapshotPdfInput = {
  fy: number;
  quarter?: string | null;
  currency: FinanceCurrency;
  generatedAt: string;
  totalIncome: number;
  totalExpenditure: number;
  net: number;
  programPct: number | null;
  adminPct: number | null;
  incomeBreakdown: Array<{ label: string; amount: number }>;
  expenditureBreakdown: Array<{ label: string; amount: number }>;
  restrictedSummary: Array<{
    program: string;
    totalIn: number;
    totalOut: number;
    remaining: number;
    currency: string;
  }>;
};

type PdfWriteResult = {
  fileName: string;
  storedPath: string;
};

function formatMoney(currency: FinanceCurrency, value: number) {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${currency} ${normalized.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function wrapTextByWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      return;
    }
    if (current) {
      lines.push(current);
      current = word;
      return;
    }
    // Very long single token, keep as-is to avoid infinite splitting.
    lines.push(word);
  });
  if (current) {
    lines.push(current);
  }
  return lines;
}

function sanitizeInvoicePaymentInstructions(
  rawInstructions: string | undefined,
  invoiceNumber: string,
) {
  const fallback =
    "Payments can be made via bank transfer or mobile money. Use the invoice number as payment reference. Contact support@ozekiread.org for account details.";
  const normalized = (rawInstructions || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  const sentences = normalized
    .split(/(?<=[.?!])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const duplicatePatterns = [
    /bank name/i,
    /account name/i,
    /account number/i,
    /equity bank/i,
    /1007203565985/i,
    /reference\s*[:#]?\s*orbf[-\w]*/i,
  ];

  const deduped = sentences.filter(
    (sentence) => !duplicatePatterns.some((pattern) => pattern.test(sentence)),
  );

  const withReference =
    deduped.some((sentence) => /reference/i.test(sentence) || sentence.includes(invoiceNumber))
      ? deduped
      : [...deduped, `Use ${invoiceNumber} as the payment reference.`];

  if (withReference.length === 0) {
    return fallback;
  }
  return withReference.join(" ");
}

function formatStatementAmount(value: number) {
  const normalized = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(normalized);
  const rendered = abs.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return normalized < 0 ? `(${rendered})` : rendered;
}

function formatStatementAsOfDate(dateIso: string) {
  const fallback = dateIso || "N/A";
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

async function writePdfBytesToPath(
  bytes: Uint8Array,
  segment: "invoices" | "receipts" | "statements" | "transparency",
  fileBase: string,
): Promise<PdfWriteResult> {
  const folder = path.join(getRuntimeDataDir(), "finance", "pdfs", segment);
  await fs.mkdir(folder, { recursive: true });
  const safeBase = fileBase.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const fileName = `${safeBase}.pdf`;
  const storedPath = path.join(folder, fileName);
  await fs.writeFile(storedPath, Buffer.from(bytes));
  return { fileName, storedPath };
}

async function writePdfToPath(
  doc: PDFDocument,
  segment: "invoices" | "receipts" | "statements" | "transparency",
  fileBase: string,
): Promise<PdfWriteResult> {
  const bytes = await doc.save();
  return writePdfBytesToPath(bytes, segment, fileBase);
}

function drawDocumentFrame(page: PDFPage) {
  drawBrandFrame(page);
}

function drawDocumentWatermark(page: PDFPage, logo: PDFImage | null) {
  drawBrandWatermark(page, logo);
}

function drawFinancialLetterhead(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  logo: PDFImage | null,
  title: string,
  numberText: string,
  subtitle: string,
) {
  const black = rgb(0, 0, 0);
  drawBrandHeader({
    page,
    font,
    fontBold,
    logo,
    title,
    documentNumber: numberText,
    subtitle,
    titleColor: black,
    mutedColor: black,
  });
}

export async function generateInvoicePdfFile(input: InvoicePdfInput): Promise<PdfWriteResult> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const sansFonts = await embedPdfSansFonts(doc);
  const font = sansFonts.regular;
  const fontBold = sansFonts.bold;
  const dark = rgb(0, 0, 0);
  const muted = rgb(0, 0, 0);
  const logo = await loadBrandLogo(doc);
  drawDocumentFrame(page);
  drawDocumentWatermark(page, logo);
  drawFinancialLetterhead(
    page,
    font,
    fontBold,
    logo,
    "INVOICE",
    `#${input.invoiceNumber}`,
    `${input.issueDate} • Due ${input.dueDate} • ${input.category}`,
  );

  let y = 565;
  page.drawText("BILLED TO:", { x: 70, y, size: 10.5, font: fontBold, color: dark });
  page.drawText(input.contactName, { x: 170, y, size: 10.5, font, color: dark });
  y -= 16;
  page.drawText("DATE:", { x: 70, y, size: 10.5, font: fontBold, color: dark });
  page.drawText(input.issueDate, { x: 170, y, size: 10.5, font, color: dark });
  y -= 20;
  page.drawText("EMAIL:", { x: 70, y, size: 10.5, font: fontBold, color: dark });
  page.drawText(input.contactEmails.join(", ") || "No email provided", { x: 170, y, size: 10, font, color: muted });

  y -= 22;
  page.drawLine({ start: { x: 70, y }, end: { x: 525, y }, thickness: 1, color: rgb(0.2, 0.24, 0.31) });
  y -= 24;
  page.drawText("DESCRIPTION", { x: 70, y, size: 11, font: fontBold, color: dark });
  page.drawText("RATE", { x: 322, y, size: 11, font: fontBold, color: dark });
  page.drawText("QTY", { x: 392, y, size: 11, font: fontBold, color: dark });
  page.drawText("AMOUNT", { x: 470, y, size: 11, font: fontBold, color: dark });
  y -= 12;
  page.drawLine({ start: { x: 70, y }, end: { x: 525, y }, thickness: 2, color: rgb(0.1, 0.13, 0.18) });
  y -= 16;

  const tableBodyStartY = y;
  const footerTop = 170;
  const footerBottom = 84;
  const minPreTotalsY = 270;
  const descriptionWidth = 238;

  type InvoiceTableProfile = {
    descSize: number;
    valueSize: number;
    lineHeight: number;
    rowGap: number;
    maxDescriptionLines: number;
  };
  type InvoiceRenderRow = {
    descriptionLines: string[];
    rateText: string;
    qtyText: string;
    amountText: string;
    amountNumeric: number;
  };

  const tableProfiles: InvoiceTableProfile[] = [
    { descSize: 10.2, valueSize: 10, lineHeight: 14, rowGap: 8, maxDescriptionLines: 2 },
    { descSize: 9.7, valueSize: 9.5, lineHeight: 12.5, rowGap: 6, maxDescriptionLines: 2 },
    { descSize: 9.2, valueSize: 9, lineHeight: 11, rowGap: 5, maxDescriptionLines: 1 },
  ];

  const buildInvoiceRows = (profile: InvoiceTableProfile): InvoiceRenderRow[] =>
    input.lineItems.map((item) => {
      const descriptionLines = wrapTextByWidth(
        item.description || "-",
        font,
        profile.descSize,
        descriptionWidth,
      ).slice(0, profile.maxDescriptionLines);
      return {
        descriptionLines: descriptionLines.length > 0 ? descriptionLines : ["-"],
        rateText: formatMoney(input.currency, item.unitPrice),
        qtyText: `${item.qty}`,
        amountText: formatMoney(input.currency, item.amount),
        amountNumeric: Number(item.amount || 0),
      };
    });

  const measureRowsBottom = (profile: InvoiceTableProfile, rows: InvoiceRenderRow[]) => {
    let probeY = tableBodyStartY;
    rows.forEach((row) => {
      probeY -= row.descriptionLines.length * profile.lineHeight;
      probeY -= profile.rowGap;
    });
    return probeY;
  };

  const rowHeight = (profile: InvoiceTableProfile, row: InvoiceRenderRow) =>
    row.descriptionLines.length * profile.lineHeight + profile.rowGap;

  let selectedProfile = tableProfiles[tableProfiles.length - 1];
  let renderedRows = buildInvoiceRows(selectedProfile);
  let rowsFit = false;

  for (const profile of tableProfiles) {
    const candidate = buildInvoiceRows(profile);
    if (measureRowsBottom(profile, candidate) >= minPreTotalsY) {
      selectedProfile = profile;
      renderedRows = candidate;
      rowsFit = true;
      break;
    }
  }

  if (!rowsFit) {
    const allRows = buildInvoiceRows(selectedProfile);
    const availableHeight = Math.max(0, tableBodyStartY - minPreTotalsY);
    const keptRows: InvoiceRenderRow[] = [];
    let usedHeight = 0;
    let cutoffIndex = allRows.length;

    for (let idx = 0; idx < allRows.length; idx += 1) {
      const current = allRows[idx];
      const currentHeight = rowHeight(selectedProfile, current);
      if (usedHeight + currentHeight > availableHeight) {
        cutoffIndex = idx;
        break;
      }
      keptRows.push(current);
      usedHeight += currentHeight;
      cutoffIndex = idx + 1;
    }

    if (cutoffIndex < allRows.length) {
      const omittedRows = allRows.slice(cutoffIndex);
      const omittedAmount = omittedRows.reduce((sum, row) => sum + row.amountNumeric, 0);
      const summaryRow: InvoiceRenderRow = {
        descriptionLines: [`Additional line items (${omittedRows.length})`],
        rateText: "-",
        qtyText: "-",
        amountText: formatMoney(input.currency, omittedAmount),
        amountNumeric: omittedAmount,
      };
      const summaryHeight = rowHeight(selectedProfile, summaryRow);
      while (keptRows.length > 0 && usedHeight + summaryHeight > availableHeight) {
        const removed = keptRows.pop();
        if (!removed) {
          break;
        }
        usedHeight -= rowHeight(selectedProfile, removed);
      }
      if (usedHeight + summaryHeight <= availableHeight) {
        keptRows.push(summaryRow);
      }
    }

    renderedRows = keptRows.length > 0 ? keptRows : allRows.slice(0, 1);
  }

  renderedRows.forEach((row) => {
    row.descriptionLines.forEach((line, idx) => {
      page.drawText(line, { x: 70, y, size: selectedProfile.descSize, font, color: dark });
      if (idx === 0) {
        page.drawText(row.rateText, { x: 322, y, size: selectedProfile.valueSize, font, color: muted });
        page.drawText(row.qtyText, { x: 402, y, size: selectedProfile.valueSize, font, color: dark });
        page.drawText(row.amountText, { x: 468, y, size: selectedProfile.valueSize, font, color: dark });
      }
      y -= selectedProfile.lineHeight;
    });
    page.drawLine({
      start: { x: 70, y: y + Math.max(2, selectedProfile.rowGap / 2) },
      end: { x: 525, y: y + Math.max(2, selectedProfile.rowGap / 2) },
      thickness: 0.7,
      color: rgb(0.78, 0.8, 0.84),
    });
    y -= selectedProfile.rowGap;
  });

  const totalsRight = 525;
  const totalsLabelX = 392;
  y -= 6;
  page.drawLine({ start: { x: 312, y }, end: { x: totalsRight, y }, thickness: 2, color: rgb(0.1, 0.13, 0.18) });
  y -= 22;
  const totalsFontSize = y < 320 ? 10 : 10.5;
  const totalValueFontSize = y < 320 ? 12.2 : 13;
  page.drawText("Sub-Total", { x: totalsLabelX, y, size: totalsFontSize, font, color: muted });
  page.drawText(formatMoney(input.currency, input.subtotal), { x: 468, y, size: totalsFontSize, font, color: dark });
  y -= 16;
  page.drawText("Tax", { x: totalsLabelX, y, size: totalsFontSize, font, color: muted });
  page.drawText(formatMoney(input.currency, input.tax), { x: 468, y, size: totalsFontSize, font, color: dark });
  y -= 14;
  page.drawLine({ start: { x: 312, y }, end: { x: totalsRight, y }, thickness: 1, color: rgb(0.32, 0.36, 0.42) });
  y -= 22;
  page.drawText("TOTAL", { x: totalsLabelX, y, size: totalValueFontSize, font: fontBold, color: dark });
  page.drawText(formatMoney(input.currency, input.total), { x: 455, y, size: totalValueFontSize, font: fontBold, color: dark });

  const leftColX = 70;
  const leftColW = 245;
  const rightColX = 332;
  const rightColW = 193;
  const labelWidth = 95;
  const valueWidth = leftColW - labelWidth - 8;
  const rowGap = 4;
  const lineHeight = 11;

  let leftY = footerTop;
  page.drawText("PAY TO:", { x: leftColX, y: leftY, size: 11, font: fontBold, color: dark });
  leftY -= 18;

  const leftRows = [
    { label: "Bank Name", value: "Equity Bank" },
    { label: "Account Name", value: "Ozeki Reading Bridge Foundation" },
    { label: "Account Number", value: "1007203565985" },
    { label: "Reference", value: input.invoiceNumber },
  ];
  leftRows.forEach((row) => {
    page.drawText(row.label, { x: leftColX, y: leftY, size: 9.8, font, color: muted });
    const wrappedValue = wrapTextByWidth(row.value, font, 9.8, valueWidth).slice(0, 2);
    wrappedValue.forEach((line, idx) => {
      page.drawText(line, { x: leftColX + labelWidth, y: leftY - idx * lineHeight, size: 9.8, font, color: dark });
    });
    leftY -= wrappedValue.length * lineHeight + rowGap;
  });

  if (input.notes) {
    leftY -= 4;
    page.drawText("Notes", { x: leftColX, y: leftY, size: 9.8, font: fontBold, color: dark });
    leftY -= 14;
    const maxNotesLines = 2;
    const noteLines = wrapTextByWidth(input.notes, font, 8.7, leftColW).slice(0, maxNotesLines);
    noteLines.forEach((line) => {
      page.drawText(line, { x: leftColX, y: leftY, size: 8.7, font, color: muted });
      leftY -= 10.5;
    });
  }

  let rightY = footerTop;
  page.drawText("Payment Instructions", { x: rightColX, y: rightY, size: 10.8, font: fontBold, color: dark });
  rightY -= 14;
  const instructionText = sanitizeInvoicePaymentInstructions(
    input.paymentInstructions,
    input.invoiceNumber,
  );
  const instructionLineHeight = 10.5;
  const maxInstructionLines = Math.max(
    3,
    Math.floor((footerTop - footerBottom - 14) / instructionLineHeight),
  );
  const wrappedInstructionLines = wrapTextByWidth(instructionText, font, 8.6, rightColW);
  const instructionLines = wrappedInstructionLines.slice(0, maxInstructionLines);
  if (wrappedInstructionLines.length > instructionLines.length && instructionLines.length > 0) {
    const lastIndex = instructionLines.length - 1;
    instructionLines[lastIndex] = `${instructionLines[lastIndex].replace(/[. ]+$/, "")}...`;
  }
  instructionLines.forEach((line) => {
    page.drawText(line, { x: rightColX, y: rightY, size: 8.6, font, color: muted });
    rightY -= instructionLineHeight;
  });

  const minimumEndY = Math.min(leftY, rightY);
  if (minimumEndY < footerBottom) {
    // Clamp long content from touching the contact footer.
    page.drawRectangle({
      x: 70,
      y: footerBottom,
      width: 455,
      height: 1,
      color: rgb(0.92, 0.94, 0.97),
    });
  }

  page.drawLine({
    start: { x: 70, y: 76 },
    end: { x: 525, y: 76 },
    thickness: 2.3,
    color: rgb(0.1, 0.13, 0.18),
  });
  page.drawText(`${officialContact.address} • ${officialContact.phoneDisplay} • ${officialContact.email}`, {
    x: 80,
    y: 60,
    size: 10,
    font,
    color: muted,
  });
  page.drawText(`${officialContact.postalAddress} • TIN ${officialContact.tin}`, {
    x: 160,
    y: 48,
    size: 8.2,
    font,
    color: muted,
  });
  page.drawText(ORG_FOOTER, { x: 120, y: 36, size: 7, font, color: muted });

  return writePdfToPath(doc, "invoices", input.invoiceNumber);
}

export async function generateReceiptPdfFile(input: ReceiptPdfInput): Promise<PdfWriteResult> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const sansFonts = await embedPdfSansFonts(doc);
  const font = sansFonts.regular;
  const fontBold = sansFonts.bold;
  const dark = rgb(0, 0, 0);
  const muted = rgb(0, 0, 0);
  const accent = rgb(0, 0, 0);
  const logo = await loadBrandLogo(doc);
  drawDocumentFrame(page);
  drawDocumentWatermark(page, logo);
  drawFinancialLetterhead(
    page,
    font,
    fontBold,
    logo,
    "OFFICIAL RECEIPT",
    `#${input.receiptNumber}`,
    `${input.receiptDate} • ${input.category}`,
  );

  let y = 568;
  page.drawText("RECEIVED FROM:", { x: 70, y, size: 10.5, font: fontBold, color: dark });
  page.drawText(input.receivedFrom, { x: 190, y, size: 10.5, font, color: dark });
  y -= 16;
  page.drawText("PAYMENT METHOD:", { x: 70, y, size: 10.5, font: fontBold, color: dark });
  page.drawText(input.paymentMethod, { x: 190, y, size: 10.5, font, color: dark });
  y -= 16;
  if (input.referenceNo) {
    page.drawText("REFERENCE:", { x: 70, y, size: 10.5, font: fontBold, color: dark });
    page.drawText(input.referenceNo, { x: 190, y, size: 10.2, font, color: muted });
    y -= 16;
  }
  if (input.relatedInvoiceNumber) {
    page.drawText("LINKED INVOICE:", { x: 70, y, size: 10.5, font: fontBold, color: dark });
    page.drawText(input.relatedInvoiceNumber, { x: 190, y, size: 10.2, font, color: muted });
    y -= 16;
  }

  y -= 8;
  page.drawLine({ start: { x: 70, y }, end: { x: 525, y }, thickness: 1, color: rgb(0.2, 0.24, 0.31) });
  y -= 24;
  const descriptionText = (input.description || "").trim();
  const hasDescription = descriptionText.length > 0;
  page.drawText("DESCRIPTION / PARTICULARS", { x: 70, y, size: 11, font: fontBold, color: dark });
  page.drawText("AMOUNT", { x: 468, y, size: 11, font: fontBold, color: dark });
  y -= 12;
  page.drawLine({ start: { x: 70, y }, end: { x: 525, y }, thickness: 2, color: rgb(0.1, 0.13, 0.18) });
  y -= 10;

  const descriptionBoxX = 70;
  const descriptionBoxWidth = 352;
  const descriptionBoxHeight = 66;
  const descriptionBoxY = y - descriptionBoxHeight;
  const amountBoxX = 430;
  const amountBoxY = y - 44;
  const amountBoxWidth = 95;
  const amountBoxHeight = 44;

  page.drawRectangle({
    x: descriptionBoxX,
    y: descriptionBoxY,
    width: descriptionBoxWidth,
    height: descriptionBoxHeight,
    color: rgb(0.99, 0.99, 1),
  });
  const receiptParticulars = hasDescription ? descriptionText : "No description provided.";
  wrapTextByWidth(receiptParticulars, font, 9.6, descriptionBoxWidth - 12).slice(0, 4).forEach((line, idx) => {
    page.drawText(line, { x: descriptionBoxX + 6, y: y - 14 - idx * 11, size: 9.6, font, color: dark });
  });

  page.drawRectangle({
    x: amountBoxX,
    y: amountBoxY,
    width: amountBoxWidth,
    height: amountBoxHeight,
    color: rgb(0.99, 0.99, 1),
  });
  page.drawText(formatMoney(input.currency, input.amount), {
    x: amountBoxX + 8,
    y: y - 23,
    size: 10.2,
    font: fontBold,
    color: dark,
  });

  y -= Math.max(descriptionBoxHeight, amountBoxHeight) + 6;
  page.drawLine({ start: { x: 70, y }, end: { x: 525, y }, thickness: 0.7, color: rgb(0.78, 0.8, 0.84) });

  y -= 12;
  page.drawLine({ start: { x: 312, y }, end: { x: 525, y }, thickness: 2.3, color: rgb(0.1, 0.13, 0.18) });
  y -= 22;
  page.drawText("TOTAL RECEIVED", { x: 332, y, size: 12.2, font: fontBold, color: dark });
  page.drawText(formatMoney(input.currency, input.amount), { x: 438, y, size: 12.2, font: fontBold, color: accent });

  const footerTop = 186;
  const footerBottom = 84;
  const leftColX = 70;
  const leftColW = 245;
  const rightColX = 332;
  const rightColW = 193;
  const labelWidth = 95;
  const lineHeight = 11;

  let leftY = footerTop;
  page.drawText("Receipt Details", { x: leftColX, y: leftY, size: 10.8, font: fontBold, color: dark });
  leftY -= 16;
  const detailRows = [
    { label: "Method", value: input.paymentMethod },
    { label: "Category", value: input.category },
    { label: "Reference", value: input.referenceNo || "N/A" },
    { label: "Invoice", value: input.relatedInvoiceNumber || "N/A" },
  ];
  detailRows.forEach((row) => {
    page.drawText(row.label, { x: leftColX, y: leftY, size: 9.2, font, color: muted });
    const lines = wrapTextByWidth(row.value, font, 9.2, leftColW - labelWidth - 8).slice(0, 2);
    lines.forEach((line, idx) => {
      page.drawText(line, { x: leftColX + labelWidth, y: leftY - idx * lineHeight, size: 9.2, font, color: dark });
    });
    leftY -= lines.length * lineHeight + 4;
  });

  let rightY = footerTop;
  page.drawText("Verification", { x: rightColX, y: rightY, size: 10.8, font: fontBold, color: dark });
  rightY -= 14;
  const notesBoxHeight = 42;
  page.drawRectangle({
    x: rightColX,
    y: rightY - notesBoxHeight,
    width: rightColW,
    height: notesBoxHeight,
    borderWidth: 1,
    borderColor: rgb(0.78, 0.8, 0.84),
    color: rgb(0.99, 0.99, 1),
  });
  page.drawText("Authorized by: Ozeki Reading Bridge Foundation", {
    x: rightColX + 5,
    y: rightY - 12,
    size: 8.4,
    font,
    color: muted,
  });
  page.drawText(`Date: ${input.receiptDate}`, {
    x: rightColX + 5,
    y: rightY - 24,
    size: 8.4,
    font,
    color: dark,
  });
  rightY -= notesBoxHeight + 8;

  const minimumEndY = Math.min(leftY, rightY);
  if (minimumEndY < footerBottom) {
    page.drawRectangle({
      x: 70,
      y: footerBottom,
      width: 455,
      height: 1,
      color: rgb(0.92, 0.94, 0.97),
    });
  }

  page.drawLine({
    start: { x: 70, y: 76 },
    end: { x: 525, y: 76 },
    thickness: 2.3,
    color: rgb(0.1, 0.13, 0.18),
  });
  page.drawText(`${officialContact.address} • ${officialContact.phoneDisplay} • ${officialContact.email}`, {
    x: 80,
    y: 60,
    size: 10,
    font,
    color: muted,
  });
  page.drawText(`${officialContact.postalAddress} • TIN ${officialContact.tin}`, {
    x: 160,
    y: 48,
    size: 8.2,
    font,
    color: muted,
  });
  page.drawText(ORG_FOOTER, { x: 120, y: 36, size: 7, font, color: muted });

  return writePdfToPath(doc, "receipts", input.receiptNumber);
}

export async function generateStatementPdfFile(input: StatementPdfInput): Promise<PdfWriteResult> {
  const doc = await PDFDocument.create();
  const pageSize: [number, number] = [595.28, 841.89];
  const page = doc.addPage(pageSize); // A4
  const serifFonts = await embedPdfSerifFonts(doc);
  const font = serifFonts.regular;
  const fontBold = serifFonts.bold;
  const fontBoldItalic = serifFonts.boldItalic;
  const dark = rgb(0.04, 0.07, 0.12);
  const muted = rgb(0.32, 0.38, 0.48);
  const accent = rgb(0.08, 0.24, 0.44);
  const incomeAccent = rgb(0.24, 0.08, 0.52);
  const incomeLine = rgb(0.02, 0.78, 0.72);

  const { statement, position, income } = input;
  const requestedDocumentType = input.documentType || "full";
  const balanceDocumentTitle =
    requestedDocumentType === "statement_of_financial_position"
      ? "STATEMENT OF FINANCIAL POSITION"
      : "BALANCE SHEET";
  const balanceFooterLabel =
    requestedDocumentType === "statement_of_financial_position"
      ? "Statement of Financial Position"
      : "Balance Sheet";
  const pageWidth = page.getWidth();
  const marginLeft = 24;
  const marginRight = 24;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const logo = await loadBrandLogo(doc);
  const drawPageShell = (
    targetPage: PDFPage,
    title: string,
    subtitle: string,
    titleColor: ReturnType<typeof rgb>,
    includeHeader: boolean,
  ) => {
    drawDocumentFrame(targetPage);
    drawDocumentWatermark(targetPage, logo);
    if (includeHeader) {
      drawBrandHeader({
        page: targetPage,
        font,
        fontBold,
        logo,
        title,
        documentNumber: statement.month,
        subtitle: `${subtitle} • Amounts in ${statement.currency}`,
        titleColor,
        mutedColor: muted,
        titleSize: 22,
        numberSize: 14,
        subtitleSize: 10.5,
      });
    }
  };

  const footerSummary = (pageLabel: string) =>
    [
      `Generated: ${statement.generatedAt.slice(0, 19).replace("T", " ")}`,
      `Period: ${statement.month}`,
      `Net: ${formatMoney(statement.currency, statement.net)}`,
      pageLabel,
    ].join(" • ");

  drawPageShell(
    page,
    balanceDocumentTitle,
    `For year ended ${formatStatementAsOfDate(position.asOfDate)}`,
    accent,
    true,
  );

  const labelX = marginLeft + 2;
  const itemAmountRight = pageWidth - 142;
  const subtotalRight = pageWidth - 34;
  const sumLineStart = itemAmountRight - 180;
  const totalLineStart = subtotalRight - 190;

  const drawRule = (y: number, thickness = 1) => {
    page.drawLine({
      start: { x: marginLeft, y },
      end: { x: marginLeft + contentWidth, y },
      thickness,
      color: dark,
    });
  };

  const drawAmount = (rightX: number, y: number, value: number, bold = false) => {
    const text = formatStatementAmount(value);
    const selectedFont = bold ? fontBold : font;
    const x = rightX - selectedFont.widthOfTextAtSize(text, 8.9);
    page.drawText(text, { x, y, size: 8.9, font: selectedFont, color: dark });
  };

  const sumLines = (lines: Array<{ amount: number }>) => lines.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const drawSectionHeader = (title: string, y: number) => {
    page.drawText(title, { x: labelX, y, size: 10.8, font: fontBoldItalic, color: dark });
  };

  const drawLineItems = (
    yStart: number,
    lines: Array<{ label: string; amount: number }>,
  ) => {
    let y = yStart;
    lines.forEach((line) => {
      page.drawText(line.label, { x: labelX + 14, y, size: 8.9, font, color: dark });
      drawAmount(itemAmountRight, y, line.amount);
      y -= 16;
    });
    return y;
  };

  const nonCurrentAssetsTotal = sumLines(position.nonCurrentAssets);
  const currentAssetsTotal = sumLines(position.currentAssets);
  const totalAssets = nonCurrentAssetsTotal + currentAssetsTotal;

  const equityTotal = sumLines(position.equityLines);
  const nonCurrentLiabilitiesTotal = sumLines(position.nonCurrentLiabilities);
  const currentLiabilitiesTotal = sumLines(position.currentLiabilities);
  const totalLiabilitiesAndEquity = equityTotal + nonCurrentLiabilitiesTotal + currentLiabilitiesTotal;

  let y = 600;
  drawRule(y, 1.3);
  y -= 20;
  page.drawText("Assets", { x: labelX, y, size: 13.5, font: fontBold, color: dark });
  page.drawText(statement.currency, { x: itemAmountRight - 10, y, size: 12, font: fontBold, color: dark });

  y -= 28;
  drawSectionHeader("Non-current assets", y);
  y -= 18;
  y = drawLineItems(y, position.nonCurrentAssets);
  page.drawLine({ start: { x: sumLineStart, y: y + 8 }, end: { x: itemAmountRight, y: y + 8 }, thickness: 1, color: dark });
  page.drawText("Total non-current assets", { x: labelX, y, size: 9.8, font: fontBold, color: dark });
  drawAmount(subtotalRight, y, nonCurrentAssetsTotal, true);

  y -= 26;
  drawSectionHeader("Current assets", y);
  y -= 18;
  y = drawLineItems(y, position.currentAssets);
  page.drawLine({ start: { x: sumLineStart, y: y + 8 }, end: { x: itemAmountRight, y: y + 8 }, thickness: 1, color: dark });
  page.drawText("Total current assets", { x: labelX, y, size: 9.8, font: fontBold, color: dark });
  drawAmount(subtotalRight, y, currentAssetsTotal, true);

  y -= 24;
  page.drawText("TOTAL ASSETS", { x: labelX, y, size: 12.5, font: fontBold, color: dark });
  page.drawLine({ start: { x: totalLineStart, y: y + 10 }, end: { x: subtotalRight, y: y + 10 }, thickness: 1.5, color: dark });
  drawAmount(subtotalRight, y, totalAssets, true);
  page.drawLine({ start: { x: totalLineStart, y: y - 3 }, end: { x: subtotalRight, y: y - 3 }, thickness: 1.2, color: dark });

  y -= 52;
  page.drawText("Equity and Liabilities", { x: labelX, y, size: 13.5, font: fontBold, color: dark });

  y -= 26;
  drawSectionHeader("Owner's equity", y);
  y -= 18;
  y = drawLineItems(y, position.equityLines);
  page.drawLine({ start: { x: sumLineStart, y: y + 8 }, end: { x: itemAmountRight, y: y + 8 }, thickness: 1, color: dark });
  page.drawText("Total owner's equity", { x: labelX, y, size: 9.8, font: fontBold, color: dark });
  drawAmount(subtotalRight, y, equityTotal, true);

  y -= 26;
  drawSectionHeader("Non-current liabilities", y);
  y -= 18;
  y = drawLineItems(y, position.nonCurrentLiabilities);
  page.drawLine({ start: { x: sumLineStart, y: y + 8 }, end: { x: itemAmountRight, y: y + 8 }, thickness: 1, color: dark });
  page.drawText("Total non-current liabilities", { x: labelX, y, size: 9.8, font: fontBold, color: dark });
  drawAmount(subtotalRight, y, nonCurrentLiabilitiesTotal, true);

  y -= 26;
  drawSectionHeader("Current liabilities", y);
  y -= 18;
  y = drawLineItems(y, position.currentLiabilities);
  page.drawLine({ start: { x: sumLineStart, y: y + 8 }, end: { x: itemAmountRight, y: y + 8 }, thickness: 1, color: dark });
  page.drawText("Total current liabilities", { x: labelX, y, size: 9.8, font: fontBold, color: dark });
  drawAmount(subtotalRight, y, currentLiabilitiesTotal, true);

  y -= 24;
  page.drawText("TOTAL EQUITY AND LIABILITIES", { x: labelX, y, size: 12.5, font: fontBold, color: dark });
  page.drawLine({ start: { x: totalLineStart, y: y + 10 }, end: { x: subtotalRight, y: y + 10 }, thickness: 1.5, color: dark });
  drawAmount(subtotalRight, y, totalLiabilitiesAndEquity, true);
  page.drawLine({ start: { x: totalLineStart, y: y - 3 }, end: { x: subtotalRight, y: y - 3 }, thickness: 1.2, color: dark });

  const incomePage = doc.addPage(pageSize);
  drawPageShell(
    incomePage,
    "INCOME STATEMENT",
    `For year ended ${formatStatementAsOfDate(income.asOfDate)}`,
    incomeAccent,
    false,
  );

  const incomeLabelX = marginLeft + 2;
  const incomeAmountRight = pageWidth - 34;
  const incomeAmountLineStart = incomeAmountRight - 150;
  const incomeRule = (lineY: number, thickness = 1) => {
    incomePage.drawLine({
      start: { x: marginLeft, y: lineY },
      end: { x: marginLeft + contentWidth, y: lineY },
      thickness,
      color: dark,
    });
  };
  const incomeSubLine = (lineY: number) => {
    incomePage.drawLine({
      start: { x: incomeAmountLineStart, y: lineY },
      end: { x: incomeAmountRight, y: lineY },
      thickness: 1.3,
      color: incomeLine,
    });
  };
  const incomeAmount = (yValue: number, value: number, bold = false) => {
    const text = formatStatementAmount(value);
    const selectedFont = bold ? fontBold : font;
    const x = incomeAmountRight - selectedFont.widthOfTextAtSize(text, 8.9);
    incomePage.drawText(text, { x, y: yValue, size: 8.9, font: selectedFont, color: dark });
  };
  const incomeRow = (label: string, yValue: number, value: number, options?: { bold?: boolean; indent?: boolean }) => {
    const isBold = options?.bold ?? false;
    const indent = options?.indent ? 24 : 0;
    const selectedFont = isBold ? fontBold : font;
    incomePage.drawText(label, { x: incomeLabelX + indent, y: yValue, size: 8.9, font: selectedFont, color: dark });
    incomeAmount(yValue, value, isBold);
  };

  let iy = 600;
  incomeRule(iy, 1.3);
  iy -= 22;
  incomeRow("Revenue", iy, income.revenue, { bold: true });
  iy -= 18;
  incomeRow("Cost of Goods Sold", iy, income.costOfGoodsSold);
  incomeSubLine(iy - 4);
  iy -= 18;
  incomeRow("Gross Profit", iy, income.grossProfit, { bold: true, indent: true });

  iy -= 30;
  incomePage.drawText("Operating Expenses", { x: incomeLabelX, y: iy, size: 11, font: fontBold, color: dark });
  iy -= 20;
  incomeRow("Marketing Expenses", iy, income.marketingExpenses, { indent: true });
  iy -= 16;
  incomeRow("Rent", iy, income.rent, { indent: true });
  iy -= 16;
  incomeRow("Utilities", iy, income.utilities, { indent: true });
  iy -= 16;
  incomeRow("Insurance", iy, income.insurance, { indent: true });
  iy -= 16;
  incomeRow("General and administrative", iy, income.generalAdmin, { indent: true });
  iy -= 16;
  incomeRow("Depreciation", iy, income.depreciation, { indent: true });
  incomeSubLine(iy - 4);
  iy -= 18;
  incomeRow("Total Operating Expenses", iy, income.totalOperatingExpenses, { bold: true, indent: true });

  iy -= 36;
  incomeRow("Operating Income", iy, income.operatingIncome, { bold: true });
  iy -= 24;
  incomeRow("Interest Expense", iy, income.interestExpense, { indent: true });
  iy -= 20;
  incomeRow("Income Before Income Taxes", iy, income.incomeBeforeTax, { bold: true });
  iy -= 20;
  incomeRow("Income Tax Expense", iy, income.incomeTaxExpense, { indent: true });
  incomeSubLine(iy - 4);
  iy -= 18;
  incomeRow("Net Income", iy, income.netIncome, { bold: true });
  incomeSubLine(iy - 4);
  incomeSubLine(iy - 8);

  const footerLabels = [balanceFooterLabel, "Income Statement"];
  const docPages = doc.getPages();
  const totalPages = docPages.length;
  docPages.forEach((docPage, index) => {
    drawBrandFooter({
      page: docPage,
      font,
      footerNote: footerSummary(footerLabels[index] || "Financial Statement"),
      pageNumber: index + 1,
      totalPages,
      mutedColor: muted,
    });
  });

  const baseName = `statement-${statement.month}-${statement.currency}`;
  const docType = requestedDocumentType;
  const fullBytes = await doc.save();
  if (docType === "full") {
    return writePdfBytesToPath(fullBytes, "statements", baseName);
  }

  const sourceDoc = await PDFDocument.load(fullBytes);
  const sourcePageCount = sourceDoc.getPageCount();
  const pageIndex = docType === "income_statement" ? 1 : 0;
  if (pageIndex >= sourcePageCount) {
    return writePdfBytesToPath(fullBytes, "statements", baseName);
  }
  const outputDoc = await PDFDocument.create();
  const [pickedPage] = await outputDoc.copyPages(sourceDoc, [pageIndex]);
  outputDoc.addPage(pickedPage);
  const outputBytes = await outputDoc.save();
  return writePdfBytesToPath(outputBytes, "statements", `${baseName}-${docType}`);
}

export async function generateSnapshotPdfFile(
  input: SnapshotPdfInput,
): Promise<PdfWriteResult> {
  const doc = await PDFDocument.create();
  const fonts = await embedPdfSerifFonts(doc);

  const titleFont = fonts.bold;
  const regularFont = fonts.regular;

  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  let cursorY = height - margin;

  // Add Brand Header
  const logo = await loadBrandLogo(doc);
  drawBrandHeader({
    page,
    font: regularFont,
    fontBold: titleFont,
    logo,
    title: "FINANCIAL SNAPSHOT",
    documentNumber: input.quarter ? `FY${input.fy} • ${input.quarter}` : `FY${input.fy}`,
    subtitle: "Transparency ledger summary",
    titleSize: 20,
    numberSize: 11,
    subtitleSize: 9,
  });
  cursorY -= 70;

  // Title
  page.drawText(`Financial Snapshot — FY${input.fy}`, {
    x: margin,
    y: cursorY,
    size: 20,
    font: titleFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursorY -= 20;
  const subtitle = input.quarter ? `Quarter: ${input.quarter}` : "Annual Ledger Summary";
  page.drawText(subtitle, {
    x: margin,
    y: cursorY,
    size: 14,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });
  cursorY -= 15;
  page.drawText(`As of ${formatStatementAsOfDate(input.generatedAt.slice(0, 10))} • ${input.currency} • Generated automatically`, {
    x: margin,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });
  cursorY -= 40;

  // Summary Cards Area
  const colWidth = (width - margin * 2) / 3;
  const cardHeight = 50;

  const drawCard = (cx: number, cy: number, cw: number, lbl: string, val: string) => {
    page.drawRectangle({
      x: cx,
      y: cy - cardHeight,
      width: cw - 10,
      height: cardHeight,
      color: rgb(0.97, 0.97, 0.97),
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1,
    });
    page.drawText(lbl, { x: cx + 10, y: cy - 20, size: 10, font: regularFont, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(val, { x: cx + 10, y: cy - 40, size: 14, font: titleFont, color: rgb(0.1, 0.1, 0.1) });
  };

  drawCard(margin, cursorY, colWidth, "Total Income", formatMoney(input.currency, input.totalIncome));
  drawCard(margin + colWidth, cursorY, colWidth, "Total Expenditure", formatMoney(input.currency, input.totalExpenditure));
  drawCard(margin + colWidth * 2, cursorY, colWidth, "Net Direction", formatMoney(input.currency, input.net));

  cursorY -= (cardHeight + 20);

  if (input.programPct !== null && input.adminPct !== null) {
    page.drawText(`Program Delivery: ${input.programPct}%  |  Core/Admin: ${input.adminPct}%`, {
      x: margin,
      y: cursorY,
      size: 11,
      font: titleFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    cursorY -= 30;
  }

  // Draw Breakdown Tables
  const drawRow = (p: PDFPage, cy: number, lbl: string, val: string, isBold: boolean = false) => {
    p.drawText(lbl, { x: margin, y: cy, size: 11, font: isBold ? titleFont : regularFont, color: rgb(0.1, 0.1, 0.1) });
    const valWidth = (isBold ? titleFont : regularFont).widthOfTextAtSize(val, 11);
    p.drawText(val, { x: width - margin - valWidth, y: cy, size: 11, font: isBold ? titleFont : regularFont, color: rgb(0.1, 0.1, 0.1) });
    p.drawLine({
      start: { x: margin, y: cy - 5 },
      end: { x: width - margin, y: cy - 5 },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });
    return cy - 20;
  };

  const ensureSpace = (p: PDFPage, currentY: number, needed: number): { page: PDFPage; y: number } => {
    if (currentY - needed < margin + 50) {
      const newPage = doc.addPage([595.28, 841.89]);
      return { page: newPage, y: height - margin };
    }
    return { page: p, y: currentY };
  };

  let activePage = page;

  // Income Breakdown
  if (input.incomeBreakdown.length > 0) {
    let state = ensureSpace(activePage, cursorY, 50);
    activePage = state.page; cursorY = state.y;

    activePage.drawText("Income Classification", { x: margin, y: cursorY, size: 14, font: titleFont, color: rgb(0.1, 0.1, 0.1) });
    cursorY -= 25;
    input.incomeBreakdown.forEach((item) => {
      state = ensureSpace(activePage, cursorY, 25);
      activePage = state.page; cursorY = state.y;
      cursorY = drawRow(activePage, cursorY, item.label, formatMoney(input.currency, item.amount));
    });
    cursorY -= 15;
  }

  // Expenditure Breakdown
  if (input.expenditureBreakdown.length > 0) {
    let state = ensureSpace(activePage, cursorY, 50);
    activePage = state.page; cursorY = state.y;

    activePage.drawText("Expenditure Classification", { x: margin, y: cursorY, size: 14, font: titleFont, color: rgb(0.1, 0.1, 0.1) });
    cursorY -= 25;
    input.expenditureBreakdown.forEach((item) => {
      state = ensureSpace(activePage, cursorY, 25);
      activePage = state.page; cursorY = state.y;
      cursorY = drawRow(activePage, cursorY, item.label, formatMoney(input.currency, item.amount));
    });
    cursorY -= 15;
  }

  // Restricted Summary
  if (input.restrictedSummary.length > 0) {
    let state = ensureSpace(activePage, cursorY, 80);
    activePage = state.page; cursorY = state.y;

    activePage.drawText("Restricted & Earmarked Funds Overview", { x: margin, y: cursorY, size: 14, font: titleFont, color: rgb(0.1, 0.1, 0.1) });
    cursorY -= 25;
    input.restrictedSummary.forEach((item) => {
      state = ensureSpace(activePage, cursorY, 25);
      activePage = state.page; cursorY = state.y;
      const label = `${item.program} (Remaining: ${formatStatementAmount(item.remaining)})`;
      cursorY = drawRow(activePage, cursorY, label, `In: ${formatStatementAmount(item.totalIn)} / Out: ${formatStatementAmount(Math.abs(item.totalOut))}`);
    });
    cursorY -= 15;
  }

  const docPages = doc.getPages();
  const totalPages = docPages.length;
  for (const [index, docPage] of docPages.entries()) {
    drawDocumentFrame(docPage);
    drawDocumentWatermark(docPage, logo);
    drawBrandFooter({
      page: docPage,
      font: regularFont,
      footerNote:
        ORG_FOOTER + " | Generated from live operational data. May precede official external audit.",
      pageNumber: index + 1,
      totalPages,
      mutedColor: rgb(0.32, 0.38, 0.48),
    });
  }

  const baseName = input.quarter
    ? `SNAPSHOT-FY${input.fy}-${input.quarter}`
    : `SNAPSHOT-FY${input.fy}-ANNUAL`;

  return writePdfToPath(doc, "transparency", baseName);
}
