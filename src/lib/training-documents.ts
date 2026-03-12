import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import { embedPdfSerifFonts } from "@/lib/pdf-fonts";
import { getRuntimeDataDir } from "@/lib/runtime-paths";

/**
 * Generate PDF for AI meeting notes strictly in Times New Roman.
 */
export async function generateMeetingNotesPdf(
  htmlNotes: string,
  metadata: { title: string; date: string }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const fonts = await embedPdfSerifFonts(pdfDoc);
  const regularFont = fonts.regular;
  const boldFont = fonts.bold;

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  // Title
  page.drawText(metadata.title, {
    x: 50, y: height - 60, size: 18, font: boldFont,
  });
  page.drawText(`Date: ${metadata.date}`, {
    x: 50, y: height - 85, size: 11, font: regularFont, color: rgb(0.3, 0.3, 0.3),
  });

  // Strip simple HTML tags for text block logic
  const strippedText = (htmlNotes || "").replace(/<[^>]*>?/gm, "\n").replace(/\n\n/g, "\n");

  // Truncate to avoid page overflow for this simple demo
  page.drawText(strippedText.substring(0, 1500), {
    x: 50, y: height - 140, size: 11, font: regularFont, maxWidth: width - 100, lineHeight: 14,
  });

  page.drawText("Disclaimer: Notes are generated from meeting transcript by Ozeki AI and reviewed by staff.", {
    x: 50, y: 50, size: 9, font: regularFont, color: rgb(0.5, 0.5, 0.5)
  });

  return pdfDoc.save();
}

/**
 * Save meeting notes PDF to disk safely
 */
export async function saveMeetingNotesPdf(sessionId: string, pdfBytes: Uint8Array): Promise<string> {
  const folder = path.join(getRuntimeDataDir(), "training", "pdfs");
  await fs.mkdir(folder, { recursive: true });
  const safeId = sessionId.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const fileName = `meet_notes_${safeId}.pdf`;
  const storedPath = path.join(folder, fileName);
  await fs.writeFile(storedPath, Buffer.from(pdfBytes));
  return storedPath;
}
