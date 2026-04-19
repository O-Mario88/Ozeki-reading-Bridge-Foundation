import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { loadBrandLogo } from "@/lib/pdf-branding";

export type LessonCertificateInput = {
  participantName: string;
  lessonTitle: string;
  completedDate: string;
  quizScore: number | null;
  lessonTeacherName?: string;
  certificateNumber: string;
  issuedDate: string;
  pdHours?: number;
};

export async function generateLessonCertificatePdf(input: LessonCertificateInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.27]); // A4 landscape
  const { width, height } = page.getSize();

  const accent = rgb(0.125, 0.545, 0.815); // lesson cert = blue accent
  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.39, 0.45, 0.53);
  const gold = rgb(0.72, 0.52, 0.18);

  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const fontScript = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);

  const margin = 28;
  page.drawRectangle({
    x: margin, y: margin, width: width - 2 * margin, height: height - 2 * margin,
    borderColor: accent, borderWidth: 2,
  });
  page.drawRectangle({
    x: margin + 8, y: margin + 8,
    width: width - 2 * (margin + 8), height: height - 2 * (margin + 8),
    borderColor: gold, borderWidth: 1,
  });
  const corner = (cx: number, cy: number) => {
    page.drawCircle({ x: cx, y: cy, size: 6, color: accent });
    page.drawCircle({ x: cx, y: cy, size: 3, color: gold });
  };
  corner(margin + 8, height - margin - 8);
  corner(width - margin - 8, height - margin - 8);
  corner(margin + 8, margin + 8);
  corner(width - margin - 8, margin + 8);

  try {
    const logoImg = await loadBrandLogo(pdf);
    if (logoImg) {
      const logoDims = logoImg.scale(0.28);
      page.drawImage(logoImg, {
        x: (width - logoDims.width) / 2,
        y: height - margin - 72,
        width: logoDims.width, height: logoDims.height,
      });
    }
  } catch { /* optional */ }

  const orgText = "OZEKI READING BRIDGE FOUNDATION — PROFESSIONAL DEVELOPMENT";
  const orgWidth = fontBold.widthOfTextAtSize(orgText, 12);
  page.drawText(orgText, { x: (width - orgWidth) / 2, y: height - margin - 96, size: 12, font: fontBold, color: ink });

  const title = "Certificate of Completion";
  const titleSize = 38;
  const titleWidth = fontScript.widthOfTextAtSize(title, titleSize);
  page.drawText(title, { x: (width - titleWidth) / 2, y: height - margin - 152, size: titleSize, font: fontScript, color: accent });

  page.drawLine({
    start: { x: width / 2 - 60, y: height - margin - 170 },
    end: { x: width / 2 + 60, y: height - margin - 170 },
    thickness: 1.5, color: gold,
  });

  const presentedTo = "This certificate is awarded to";
  const pWidth = fontRegular.widthOfTextAtSize(presentedTo, 12);
  page.drawText(presentedTo, { x: (width - pWidth) / 2, y: height - margin - 204, size: 12, font: fontRegular, color: muted });

  const nameWidth = fontBold.widthOfTextAtSize(input.participantName, 32);
  page.drawText(input.participantName, {
    x: (width - nameWidth) / 2, y: height - margin - 252, size: 32, font: fontBold, color: ink,
  });
  page.drawLine({
    start: { x: (width - Math.max(nameWidth, 280)) / 2, y: height - margin - 262 },
    end: { x: (width + Math.max(nameWidth, 280)) / 2, y: height - margin - 262 },
    thickness: 0.8, color: muted,
  });

  const citation1 = "for successfully completing the recorded professional development lesson";
  const cWidth1 = fontRegular.widthOfTextAtSize(citation1, 13);
  page.drawText(citation1, {
    x: (width - cWidth1) / 2, y: height - margin - 296, size: 13, font: fontRegular, color: ink,
  });

  const topic = `"${input.lessonTitle}"`;
  const topicSize = 18;
  const topicWidth = fontBold.widthOfTextAtSize(topic, topicSize);
  page.drawText(topic, {
    x: (width - topicWidth) / 2, y: height - margin - 328, size: topicSize, font: fontBold, color: accent,
  });

  const meta: string[] = [];
  if (input.lessonTeacherName) meta.push(`Lesson by ${input.lessonTeacherName}`);
  meta.push(`Completed on ${input.completedDate}`);
  if (input.quizScore !== null && input.quizScore !== undefined) meta.push(`Quiz score ${input.quizScore}%`);
  if (input.pdHours) meta.push(`${input.pdHours} PD hour${input.pdHours === 1 ? "" : "s"}`);
  const metaLine = meta.join(" · ");
  const metaWidth = fontItalic.widthOfTextAtSize(metaLine, 12);
  page.drawText(metaLine, {
    x: (width - metaWidth) / 2, y: height - margin - 352, size: 12, font: fontItalic, color: muted,
  });

  // Signature
  const sigY = 130;
  const sigWidth = 180;
  const leftSigX = width * 0.22;
  const rightSigX = width * 0.78 - sigWidth;

  page.drawLine({
    start: { x: leftSigX, y: sigY + 24 }, end: { x: leftSigX + sigWidth, y: sigY + 24 },
    thickness: 0.6, color: ink,
  });
  const facLabel = input.lessonTeacherName || "Lead Instructor";
  const facLabelWidth = fontBold.widthOfTextAtSize(facLabel, 11);
  page.drawText(facLabel, { x: leftSigX + (sigWidth - facLabelWidth) / 2, y: sigY + 8, size: 11, font: fontBold, color: ink });
  const facSub = "Lesson Instructor";
  const facSubWidth = fontRegular.widthOfTextAtSize(facSub, 9);
  page.drawText(facSub, { x: leftSigX + (sigWidth - facSubWidth) / 2, y: sigY - 6, size: 9, font: fontRegular, color: muted });

  page.drawLine({
    start: { x: rightSigX, y: sigY + 24 }, end: { x: rightSigX + sigWidth, y: sigY + 24 },
    thickness: 0.6, color: ink,
  });
  const dirLabel = "Ozeki Read Academy";
  const dirLabelWidth = fontBold.widthOfTextAtSize(dirLabel, 11);
  page.drawText(dirLabel, { x: rightSigX + (sigWidth - dirLabelWidth) / 2, y: sigY + 8, size: 11, font: fontBold, color: ink });
  const dirSub = "Programme Office";
  const dirSubWidth = fontRegular.widthOfTextAtSize(dirSub, 9);
  page.drawText(dirSub, { x: rightSigX + (sigWidth - dirSubWidth) / 2, y: sigY - 6, size: 9, font: fontRegular, color: muted });

  const certMeta = `Certificate № ${input.certificateNumber} · Issued ${input.issuedDate}`;
  const certMetaWidth = fontRegular.widthOfTextAtSize(certMeta, 9);
  page.drawText(certMeta, { x: (width - certMetaWidth) / 2, y: 60, size: 9, font: fontRegular, color: muted });

  const verify = `Verify authenticity at ozekiread.org/verify/${input.certificateNumber}`;
  const verifyWidth = fontRegular.widthOfTextAtSize(verify, 8);
  page.drawText(verify, { x: (width - verifyWidth) / 2, y: 46, size: 8, font: fontRegular, color: muted });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

export function generateLessonCertificateNumber(userId: number, lessonId: number, completedDate: string): string {
  const year = new Date(completedDate).getFullYear();
  const suffix = `${userId.toString().padStart(4, "0")}${lessonId.toString().padStart(4, "0")}`;
  return `OZK-LMS-${year}-${suffix}`;
}
