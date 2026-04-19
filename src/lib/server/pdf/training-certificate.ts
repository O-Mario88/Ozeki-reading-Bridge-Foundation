/**
 * Training Certificate PDF generator
 * A4 landscape, decorative border, directly uses pdf-lib (no Chromium).
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { loadBrandLogo } from "@/lib/pdf-branding";

export type TrainingCertificateInput = {
  participantName: string;
  participantRole: string;
  trainingTopic: string;
  trainingDate: string;
  schoolName?: string;
  district?: string;
  facilitatorName?: string;
  certificateNumber: string;
  issuedDate: string;
};

export async function generateTrainingCertificatePdf(
  input: TrainingCertificateInput,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  // A4 landscape: 842 × 595
  const page = pdf.addPage([841.89, 595.27]);
  const { width, height } = page.getSize();

  const accent = rgb(0.949, 0.452, 0.125); // #f2730f orange
  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.39, 0.45, 0.53);
  const gold = rgb(0.72, 0.52, 0.18);

  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const fontScript = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);

  // ── Decorative border ─────────────────────────────────────────
  const margin = 28;
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - 2 * margin,
    height: height - 2 * margin,
    borderColor: accent,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: margin + 8,
    y: margin + 8,
    width: width - 2 * (margin + 8),
    height: height - 2 * (margin + 8),
    borderColor: gold,
    borderWidth: 1,
  });

  // Corner flourishes
  const corner = (cx: number, cy: number) => {
    page.drawCircle({ x: cx, y: cy, size: 6, color: accent });
    page.drawCircle({ x: cx, y: cy, size: 3, color: gold });
  };
  corner(margin + 8, height - margin - 8);
  corner(width - margin - 8, height - margin - 8);
  corner(margin + 8, margin + 8);
  corner(width - margin - 8, margin + 8);

  // ── Logo (top centre) ─────────────────────────────────────────
  try {
    const logoImg = await loadBrandLogo(pdf);
    if (logoImg) {
      const logoDims = logoImg.scale(0.28);
      page.drawImage(logoImg, {
        x: (width - logoDims.width) / 2,
        y: height - margin - 72,
        width: logoDims.width,
        height: logoDims.height,
      });
    }
  } catch (_e) {
    // Logo is optional
  }

  // ── Organization name ─────────────────────────────────────────
  const orgText = "OZEKI READING BRIDGE FOUNDATION";
  const orgWidth = fontBold.widthOfTextAtSize(orgText, 14);
  page.drawText(orgText, {
    x: (width - orgWidth) / 2,
    y: height - margin - 96,
    size: 14,
    font: fontBold,
    color: ink,
  });

  // ── Title ─────────────────────────────────────────────────────
  const title = "Certificate of Participation";
  const titleSize = 38;
  const titleWidth = fontScript.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - margin - 152,
    size: titleSize,
    font: fontScript,
    color: accent,
  });

  // ── Divider ──────────────────────────────────────────────────
  page.drawLine({
    start: { x: width / 2 - 60, y: height - margin - 170 },
    end: { x: width / 2 + 60, y: height - margin - 170 },
    thickness: 1.5,
    color: gold,
  });

  // ── Presented to line ────────────────────────────────────────
  const presentedTo = "This certificate is proudly presented to";
  const presentedSize = 12;
  const presentedWidth = fontRegular.widthOfTextAtSize(presentedTo, presentedSize);
  page.drawText(presentedTo, {
    x: (width - presentedWidth) / 2,
    y: height - margin - 204,
    size: presentedSize,
    font: fontRegular,
    color: muted,
  });

  // ── Participant name ─────────────────────────────────────────
  const nameSize = 32;
  const nameWidth = fontBold.widthOfTextAtSize(input.participantName, nameSize);
  page.drawText(input.participantName, {
    x: (width - nameWidth) / 2,
    y: height - margin - 252,
    size: nameSize,
    font: fontBold,
    color: ink,
  });
  // Underline
  page.drawLine({
    start: { x: (width - Math.max(nameWidth, 280)) / 2, y: height - margin - 262 },
    end: { x: (width + Math.max(nameWidth, 280)) / 2, y: height - margin - 262 },
    thickness: 0.8,
    color: muted,
  });

  // ── Citation ─────────────────────────────────────────────────
  const roleLine = input.participantRole
    ? `(${input.participantRole}${input.schoolName ? `, ${input.schoolName}` : ""})`
    : input.schoolName || "";
  if (roleLine) {
    const roleWidth = fontItalic.widthOfTextAtSize(roleLine, 12);
    page.drawText(roleLine, {
      x: (width - roleWidth) / 2,
      y: height - margin - 282,
      size: 12,
      font: fontItalic,
      color: muted,
    });
  }

  const citation1 = "for actively participating in and successfully completing the training programme";
  const cWidth1 = fontRegular.widthOfTextAtSize(citation1, 13);
  page.drawText(citation1, {
    x: (width - cWidth1) / 2,
    y: height - margin - 316,
    size: 13,
    font: fontRegular,
    color: ink,
  });

  // Topic (bold, featured)
  const topic = `"${input.trainingTopic}"`;
  const topicSize = 18;
  const topicWidth = fontBold.widthOfTextAtSize(topic, topicSize);
  page.drawText(topic, {
    x: (width - topicWidth) / 2,
    y: height - margin - 348,
    size: topicSize,
    font: fontBold,
    color: accent,
  });

  const citation2 = `delivered on ${input.trainingDate}${input.district ? ` in ${input.district}` : ""}.`;
  const cWidth2 = fontRegular.widthOfTextAtSize(citation2, 12);
  page.drawText(citation2, {
    x: (width - cWidth2) / 2,
    y: height - margin - 372,
    size: 12,
    font: fontRegular,
    color: muted,
  });

  // ── Signatures row ───────────────────────────────────────────
  const sigY = 130;
  const sigWidth = 180;
  const leftSigX = width * 0.22;
  const rightSigX = width * 0.78 - sigWidth;

  // Facilitator signature (left)
  page.drawLine({
    start: { x: leftSigX, y: sigY + 24 },
    end: { x: leftSigX + sigWidth, y: sigY + 24 },
    thickness: 0.6,
    color: ink,
  });
  const facLabel = input.facilitatorName || "Lead Facilitator";
  const facLabelWidth = fontBold.widthOfTextAtSize(facLabel, 11);
  page.drawText(facLabel, {
    x: leftSigX + (sigWidth - facLabelWidth) / 2,
    y: sigY + 8,
    size: 11,
    font: fontBold,
    color: ink,
  });
  const facSub = "Facilitator";
  const facSubWidth = fontRegular.widthOfTextAtSize(facSub, 9);
  page.drawText(facSub, {
    x: leftSigX + (sigWidth - facSubWidth) / 2,
    y: sigY - 6,
    size: 9,
    font: fontRegular,
    color: muted,
  });

  // Programme Director signature (right)
  page.drawLine({
    start: { x: rightSigX, y: sigY + 24 },
    end: { x: rightSigX + sigWidth, y: sigY + 24 },
    thickness: 0.6,
    color: ink,
  });
  const dirLabel = "Ozeki Read Programmes";
  const dirLabelWidth = fontBold.widthOfTextAtSize(dirLabel, 11);
  page.drawText(dirLabel, {
    x: rightSigX + (sigWidth - dirLabelWidth) / 2,
    y: sigY + 8,
    size: 11,
    font: fontBold,
    color: ink,
  });
  const dirSub = "Programme Office";
  const dirSubWidth = fontRegular.widthOfTextAtSize(dirSub, 9);
  page.drawText(dirSub, {
    x: rightSigX + (sigWidth - dirSubWidth) / 2,
    y: sigY - 6,
    size: 9,
    font: fontRegular,
    color: muted,
  });

  // ── Certificate number + issuance (bottom) ────────────────────
  const certMeta = `Certificate № ${input.certificateNumber} · Issued ${input.issuedDate}`;
  const certMetaWidth = fontRegular.widthOfTextAtSize(certMeta, 9);
  page.drawText(certMeta, {
    x: (width - certMetaWidth) / 2,
    y: 60,
    size: 9,
    font: fontRegular,
    color: muted,
  });

  // Verification line
  const verify = "Verify authenticity at ozekiread.org/verify/" + input.certificateNumber;
  const verifyWidth = fontRegular.widthOfTextAtSize(verify, 8);
  page.drawText(verify, {
    x: (width - verifyWidth) / 2,
    y: 46,
    size: 8,
    font: fontRegular,
    color: muted,
  });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

export function generateCertificateNumber(attendanceId: number, trainingDate: string): string {
  const year = new Date(trainingDate).getFullYear();
  const suffix = attendanceId.toString().padStart(6, "0");
  return `OZK-CERT-${year}-${suffix}`;
}
