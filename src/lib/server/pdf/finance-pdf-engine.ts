import { PDFDocument, rgb } from "pdf-lib";
import { 
  drawBrandFooter, 
  drawBrandHeader, 
  drawBrandWatermark, 
  loadBrandLogo 
} from "@/lib/pdf-branding";
import { embedPdfSansFonts, embedPdfSerifFonts } from "@/lib/pdf-fonts";

/**
 * Generates a professional PDF for a financial document.
 */
export async function generateFinancePdf(options: {
  title: string;
  subtitle?: string;
  documentNumber?: string;
  content: (ctx: { doc: PDFDocument; page: any; font: any; fontBold: any; y: number }) => Promise<number>;
}) {
  const doc = await PDFDocument.create();
  const { regular: sans, bold: sansBold } = await embedPdfSansFonts(doc);
  const logo = await loadBrandLogo(doc);

  let page = doc.addPage([595.27, 841.89]); // A4
  const { width, height } = page.getSize();

  drawBrandWatermark(page, logo);
  drawBrandHeader({
    page,
    font: sans,
    fontBold: sansBold,
    logo,
    title: options.title,
    subtitle: options.subtitle,
    documentNumber: options.documentNumber,
  });

  // Main content area starts below header
  let currentY = height - 220;
  
  await options.content({ 
    doc, 
    page, 
    font: sans, 
    fontBold: sansBold, 
    y: currentY 
  });

  drawBrandFooter({
    page,
    font: sans,
    pageNumber: 1,
    totalPages: 1,
  });

  return await doc.save();
}

/**
 * Specifically for Donor Receipts.
 */
export async function generateDonorReceiptPdf(receipt: any) {
  return generateFinancePdf({
    title: "DONATION RECEIPT",
    documentNumber: receipt.receipt_number,
    subtitle: `Date: ${receipt.receipt_date}`,
    content: async ({ page, font, fontBold, y }) => {
      const x = 50;
      page.drawText("Received From:", { x, y, size: 10, font: fontBold });
      page.drawText(receipt.received_from, { x: x + 80, y, size: 10, font });
      
      const nextY = y - 20;
      page.drawText("Amount:", { x, y: nextY, size: 10, font: fontBold });
      page.drawText(`${receipt.currency} ${receipt.amount_received.toLocaleString()}`, { x: x + 80, y: nextY, size: 12, font: fontBold, color: rgb(0, 0.4, 0) });

      page.drawText("Description:", { x, y: nextY - 30, size: 10, font: fontBold });
      page.drawText(receipt.description || "N/A", { x: x + 80, y: nextY - 30, size: 10, font });

      return nextY - 60;
    }
  });
}

/**
 * Specifically for Financial Reports (Table layout).
 */
export async function generateFinancialReportPdf(title: string, data: any[]) {
  return generateFinancePdf({
    title,
    content: async ({ page, font, fontBold, y }) => {
      let currentY = y;
      const x = 50;
      const colWidths = [100, 250, 100];
      
      // Header
      page.drawRectangle({ x, y: currentY - 5, width: 450, height: 20, color: rgb(0.9, 0.9, 0.9) });
      page.drawText("Code", { x: x + 5, y: currentY, size: 9, font: fontBold });
      page.drawText("Account Name", { x: x + colWidths[0], y: currentY, size: 9, font: fontBold });
      page.drawText("Balance", { x: x + colWidths[0] + colWidths[1], y: currentY, size: 9, font: fontBold });

      currentY -= 25;

      for (const row of data) {
        page.drawText(String(row.account_code || ""), { x: x + 5, y: currentY, size: 8, font });
        page.drawText(String(row.account_name || ""), { x: x + colWidths[0], y: currentY, size: 8, font });
        page.drawText(Number(row.balance || 0).toLocaleString(), { x: x + colWidths[0] + colWidths[1], y: currentY, size: 8, font });
        currentY -= 15;
        
        if (currentY < 100) break; // Simple page break handle logic needed for production
      }
      
      return currentY;
    }
  });
}
