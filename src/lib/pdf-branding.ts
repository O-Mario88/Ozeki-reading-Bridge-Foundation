import fs from "node:fs/promises";
import { PDFDocument, PDFImage, PDFPage, PDFFont, rgb } from "pdf-lib";
import { BRAND_LOGO_PATH, BRAND_ORG_NAME, BRAND_WATERMARK_OPACITY } from "@/lib/brand-identity";
import { officialContact } from "@/lib/contact";

type HeaderColor = ReturnType<typeof rgb>;

type DrawBrandHeaderOptions = {
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  logo: PDFImage | null;
  title: string;
  subtitle?: string;
  documentNumber?: string;
  titleColor?: HeaderColor;
  mutedColor?: HeaderColor;
  titleSize?: number;
  numberSize?: number;
  subtitleSize?: number;
};

function drawCenteredText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  y: number,
  size: number,
  color: HeaderColor,
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  const x = Math.max(24, (page.getWidth() - textWidth) / 2);
  page.drawText(text, { x, y, size, font, color });
}

export async function loadBrandLogo(doc: PDFDocument): Promise<PDFImage | null> {
  try {
    const logoBytes = await fs.readFile(BRAND_LOGO_PATH);
    try {
      return await doc.embedPng(logoBytes);
    } catch {
      return await doc.embedJpg(logoBytes);
    }
  } catch {
    return null;
  }
}

export function drawBrandFrame(page: PDFPage) {
  const x = 20;
  const y = 20;
  const width = page.getWidth() - 40;
  const height = page.getHeight() - 40;
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.82, 0.85, 0.9),
    borderWidth: 1.2,
  });
}

export function drawBrandWatermark(page: PDFPage, logo: PDFImage | null) {
  if (!logo) {
    return;
  }
  const maxWidth = Math.min(300, page.getWidth() * 0.5);
  const watermarkHeight = (logo.height / logo.width) * maxWidth;
  page.drawImage(logo, {
    x: (page.getWidth() - maxWidth) / 2,
    y: (page.getHeight() - watermarkHeight) / 2 - 10,
    width: maxWidth,
    height: watermarkHeight,
    opacity: BRAND_WATERMARK_OPACITY,
  });
}

export function drawBrandHeader({
  page,
  font,
  fontBold,
  logo,
  title,
  subtitle,
  documentNumber,
  titleColor = rgb(0.06, 0.1, 0.18),
  mutedColor = rgb(0.35, 0.4, 0.5),
  titleSize = 28,
  numberSize = 17,
  subtitleSize = 10,
}: DrawBrandHeaderOptions) {
  const headerTopY = page.getHeight() - 98;

  if (logo) {
    const logoWidth = 72;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    page.drawImage(logo, {
      x: (page.getWidth() - logoWidth) / 2,
      y: headerTopY,
      width: logoWidth,
      height: logoHeight,
    });
  }

  drawCenteredText(page, fontBold, BRAND_ORG_NAME, headerTopY - 20, 16, titleColor);
  drawCenteredText(page, font, officialContact.address, headerTopY - 34, 8.6, mutedColor);
  drawCenteredText(
    page,
    font,
    `${officialContact.postalAddress} • ${officialContact.phoneDisplay} • ${officialContact.email}`,
    headerTopY - 46,
    8.4,
    mutedColor,
  );
  drawCenteredText(
    page,
    font,
    `TIN ${officialContact.tin} • REG ${officialContact.regNo}`,
    headerTopY - 58,
    8,
    mutedColor,
  );

  const titleY = headerTopY - 90;
  drawCenteredText(page, fontBold, title, titleY, titleSize, titleColor);
  let nextLineY = titleY - 24;

  if (documentNumber && documentNumber.trim().length > 0) {
    drawCenteredText(page, fontBold, documentNumber, nextLineY, numberSize, titleColor);
    nextLineY -= 15;
  }

  if (subtitle && subtitle.trim().length > 0) {
    drawCenteredText(page, font, subtitle, nextLineY, subtitleSize, mutedColor);
  }
}
