import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFImage, PDFPage, PDFFont, rgb } from "pdf-lib";
import { BRAND_LOGO_PATH, BRAND_ORG_NAME, BRAND_WATERMARK_OPACITY } from "@/lib/brand-identity";
import { officialContact } from "@/lib/contact";
import { getActiveOrganizationProfile } from "@/lib/server/postgres/repositories/organization-profile";

type HeaderColor = ReturnType<typeof rgb>;

/** Convert text to ASCII-safe characters for pdf-lib standard fonts (WinAnsi). */
function sanitizeForPdf(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u2024\u2027\u00B7]/g, "|")
    .replace(/[\u2192\u2794\u279C]/g, "->")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .trim();
}

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
  includeBiodata?: boolean;
};

type DrawBrandFooterOptions = {
  page: PDFPage;
  font: PDFFont;
  footerNote?: string;
  pageNumber?: number;
  totalPages?: number;
  mutedColor?: HeaderColor;
  lineColor?: HeaderColor;
};

type ResolvedBrandProfile = {
  name: string;
  address: string;
  poBox: string;
  telephone: string;
  email: string;
  tin: string;
  registrationNumber: string;
  logoSource: string | null;
};

let activeProfile: ResolvedBrandProfile = {
  name: BRAND_ORG_NAME,
  address: officialContact.address,
  poBox: officialContact.postalAddress,
  telephone: officialContact.phoneDisplay,
  email: officialContact.email,
  tin: officialContact.tin,
  registrationNumber: officialContact.regNo,
  logoSource: BRAND_LOGO_PATH,
};

function getBrandProfile() {
  return activeProfile;
}

async function resolveBrandProfile() {
  try {
    const profile = await getActiveOrganizationProfile();
    activeProfile = {
      name: profile.name || BRAND_ORG_NAME,
      address: profile.address || officialContact.address,
      poBox: profile.poBox || officialContact.postalAddress,
      telephone: profile.telephone || officialContact.phoneDisplay,
      email: profile.email || officialContact.email,
      tin: profile.tin || officialContact.tin,
      registrationNumber: profile.registrationNumber || officialContact.regNo,
      logoSource: profile.logoStorageUrl || BRAND_LOGO_PATH,
    };
  } catch {
    activeProfile = {
      name: BRAND_ORG_NAME,
      address: officialContact.address,
      poBox: officialContact.postalAddress,
      telephone: officialContact.phoneDisplay,
      email: officialContact.email,
      tin: officialContact.tin,
      registrationNumber: officialContact.regNo,
      logoSource: BRAND_LOGO_PATH,
    };
  }
  return activeProfile;
}

function drawCenteredText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  y: number,
  size: number,
  color: HeaderColor,
) {
  try {
    const safe = sanitizeForPdf(text);
    const textWidth = font.widthOfTextAtSize(safe, size);
    const x = Math.max(24, (page.getWidth() - textWidth) / 2);
    page.drawText(safe, { x, y, size, font, color });
  } catch {
    // Skip line rather than crash entire PDF
  }
}

async function readLogoBytes(logoSource: string | null) {
  const candidate = logoSource?.trim();
  if (!candidate) {
    return fs.readFile(BRAND_LOGO_PATH);
  }

  if (/^https?:\/\//i.test(candidate)) {
    const response = await fetch(candidate, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not fetch logo from ${candidate}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  if (candidate.startsWith("/")) {
    return fs.readFile(path.join(process.cwd(), "public", candidate));
  }

  return fs.readFile(path.resolve(candidate));
}

export async function loadBrandLogo(doc: PDFDocument): Promise<PDFImage | null> {
  const profile = await resolveBrandProfile();

  // Try compressed PDF-specific logo first (keeps PDF under Lambda 6MB limit)
  try {
    const { BRAND_LOGO_PDF_PATH } = await import("@/lib/brand-identity");
    const pdfLogoBytes = await fs.readFile(BRAND_LOGO_PDF_PATH);
    try {
      return await doc.embedPng(pdfLogoBytes);
    } catch {
      return await doc.embedJpg(pdfLogoBytes);
    }
  } catch {
    // Fall back to full-size logo or org profile logo
  }

  try {
    const logoBytes = await readLogoBytes(profile.logoSource);
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
  includeBiodata = true,
}: DrawBrandHeaderOptions) {
  const profile = getBrandProfile();
  const headerTopY = page.getHeight() - 98;

  if (includeBiodata) {
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

    drawCenteredText(page, fontBold, profile.name, headerTopY - 20, 16, titleColor);
    drawCenteredText(page, font, profile.address, headerTopY - 34, 8.6, mutedColor);
    drawCenteredText(
      page,
      font,
      `${profile.poBox} | ${profile.telephone} | ${profile.email}`,
      headerTopY - 46,
      8.4,
      mutedColor,
    );
    drawCenteredText(
      page,
      font,
      `TIN ${profile.tin} | REG ${profile.registrationNumber}`,
      headerTopY - 58,
      8,
      mutedColor,
    );

    const titleY = headerTopY - 90;
    if (titleSize > 0) {
      drawCenteredText(page, fontBold, title, titleY, titleSize, titleColor);
    }
    
    let nextLineY = titleY - 24;

    if (documentNumber && documentNumber.trim().length > 0) {
      drawCenteredText(page, fontBold, documentNumber, nextLineY, numberSize, titleColor);
      nextLineY -= 15;
    }

    if (subtitle && subtitle.trim().length > 0) {
      drawCenteredText(page, font, subtitle, nextLineY, subtitleSize, mutedColor);
    }
  } else {
    // For subsequent pages without biodata
    const topMarginY = page.getHeight() - 60;
    let nextLineY = topMarginY;
    
    if (titleSize > 0 && title.trim().length > 0) {
      drawCenteredText(page, fontBold, title, nextLineY, titleSize, titleColor);
      nextLineY -= 16;
    }
    
    if (documentNumber && documentNumber.trim().length > 0) {
      drawCenteredText(page, fontBold, documentNumber, nextLineY, numberSize, titleColor);
      nextLineY -= 12;
    }

    if (subtitle && subtitle.trim().length > 0) {
      drawCenteredText(page, font, subtitle, nextLineY, subtitleSize, mutedColor);
    }
  }
}

export function drawBrandFooter({
  page,
  font,
  footerNote,
  pageNumber,
  totalPages,
  mutedColor = rgb(0.35, 0.4, 0.5),
  lineColor = rgb(0.1, 0.13, 0.18),
}: DrawBrandFooterOptions) {
  const profile = getBrandProfile();
  const lineY = 64;
  const lineLeft = 34;
  const lineRight = page.getWidth() - 34;
  const pageLabel =
    Number.isFinite(pageNumber) && Number.isFinite(totalPages) && Number(pageNumber) > 0
      ? `Page ${Number(pageNumber)} of ${Number(totalPages)}`
      : "";
  const metaLineTwoCore = `${profile.poBox} | TIN ${profile.tin} | REG ${profile.registrationNumber}`;
  const metaLineTwo = pageLabel ? `${metaLineTwoCore} | ${pageLabel}` : metaLineTwoCore;

  page.drawLine({
    start: { x: lineLeft, y: lineY },
    end: { x: lineRight, y: lineY },
    thickness: 1.6,
    color: lineColor,
  });

  drawCenteredText(
    page,
    font,
    `${profile.address} | ${profile.telephone} | ${profile.email}`,
    lineY - 12,
    8,
    mutedColor,
  );
  drawCenteredText(page, font, metaLineTwo, lineY - 22, 7.3, mutedColor);

  if (footerNote && footerNote.trim().length > 0) {
    drawCenteredText(page, font, footerNote, lineY - 31.5, 6.8, mutedColor);
  }
}

export function getCurrentPdfBrandProfile() {
  return getBrandProfile();
}
