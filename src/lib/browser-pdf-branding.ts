import fs from "node:fs/promises";
import path from "node:path";
import { BRAND_LOGO_PATH, BRAND_ORG_NAME, BRAND_WATERMARK_OPACITY } from "@/lib/brand-identity";
import { officialContact } from "@/lib/contact";
import { getPdfThemeCss } from "@/lib/pdf-theme";
import { getActiveOrganizationProfile } from "@/lib/server/postgres/repositories/organization-profile";

const DEFAULT_FOOTER_NOTE =
  "Aggregated, privacy-protected operational document. Internal use only where applicable.";

export type BrowserPdfBrandingInput = {
  title: string;
  subtitle?: string;
  documentNumber?: string;
  footerNote?: string;
  accentHex?: string;
};

export type BrowserPdfBrandingPayload = {
  css: string;
  frameHtml: string;
  watermarkHtml: string;
  headerHtml: string;
  footerHtml: string;
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function logoToDataUri(source: string | null) {
  const candidate = source?.trim();
  let logoBytes: Buffer;

  if (!candidate) {
    logoBytes = await fs.readFile(BRAND_LOGO_PATH);
  } else if (/^https?:\/\//i.test(candidate)) {
    const response = await fetch(candidate, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not fetch logo from ${candidate}`);
    }
    logoBytes = Buffer.from(await response.arrayBuffer());
  } else if (candidate.startsWith("/")) {
    logoBytes = await fs.readFile(path.join(process.cwd(), "public", candidate));
  } else {
    logoBytes = await fs.readFile(path.resolve(candidate));
  }

  const base64 = logoBytes.toString("base64");
  return `data:image/png;base64,${base64}`;
}

export async function buildBrowserPdfBranding(
  input: BrowserPdfBrandingInput,
): Promise<BrowserPdfBrandingPayload> {
  const profile = await getActiveOrganizationProfile();
  const logoDataUri = await logoToDataUri(profile.logoStorageUrl || "/photos/PXL_20260218_133701748.jpg").catch(() => null);
  const pdfThemeCss = await getPdfThemeCss();
  const safeTitle = escapeHtml(input.title);
  const safeSubtitle = input.subtitle ? escapeHtml(input.subtitle) : "";
  const safeDocumentNumber = input.documentNumber ? escapeHtml(input.documentNumber) : "";
  const safeFooterNote = escapeHtml(input.footerNote || DEFAULT_FOOTER_NOTE);
  const accentHex = input.accentHex || "#1f2a44";

  const orgName = escapeHtml(profile.name || BRAND_ORG_NAME);
  const address = escapeHtml(profile.address || officialContact.address);
  const poBox = escapeHtml(profile.poBox || officialContact.postalAddress);
  const telephone = escapeHtml(profile.telephone || officialContact.phoneDisplay);
  const email = escapeHtml(profile.email || officialContact.email);
  const tin = escapeHtml(profile.tin || officialContact.tin);
  const registrationNumber = escapeHtml(profile.registrationNumber || officialContact.regNo);

  const css = `
    ${pdfThemeCss}

    :root {
      --orbf-accent: ${accentHex};
      --orbf-muted: #5b677d;
      --orbf-border: #d1d8e6;
      --orbf-ink: #0f172a;
      --orbf-watermark-opacity: ${BRAND_WATERMARK_OPACITY};
    }

    .orbf-brand-frame {
      position: fixed;
      inset: 5mm;
      pointer-events: none;
      z-index: 1;
    }

    .orbf-brand-watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 44%;
      opacity: var(--orbf-watermark-opacity);
      pointer-events: none;
      z-index: 0;
      text-align: center;
    }

    .orbf-brand-watermark img {
      width: 100%;
      height: auto;
      object-fit: contain;
    }

    .orbf-brand-header {
      position: relative;
      margin: 10mm 18mm 10mm;
      text-align: center;
      z-index: 5;
      page-break-inside: avoid;
    }

    .orbf-brand-header-logo {
      width: 72px;
      height: auto;
      margin: 0 auto 6px;
      display: block;
    }

    .orbf-brand-org {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: var(--orbf-accent);
      line-height: 1.2;
      font-family: var(--pdf-font-family);
    }

    .orbf-brand-meta {
      margin: 1px 0 0;
      font-size: 8.3px;
      color: var(--orbf-muted);
      line-height: 1.25;
      font-family: var(--pdf-font-family);
    }

    .orbf-brand-title {
      margin: 10px 0 0;
      font-size: 27px;
      font-weight: 700;
      line-height: 1.15;
      color: var(--orbf-ink);
      letter-spacing: 0.2px;
      text-transform: uppercase;
      font-family: var(--pdf-font-family);
    }

    .orbf-brand-number {
      margin: 4px 0 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--orbf-ink);
      font-family: var(--pdf-font-family);
    }

    .orbf-brand-subtitle {
      margin: 3px 0 0;
      font-size: 10px;
      color: var(--orbf-muted);
      font-family: var(--pdf-font-family);
    }

    .orbf-brand-footer {
      position: fixed;
      left: 18mm;
      right: 18mm;
      bottom: 0mm;
      text-align: center;
      z-index: 5;
    }

    .orbf-brand-footer-line {
      height: 0;
      border-top: 2px solid var(--orbf-ink);
      margin-bottom: 5px;
    }

    .orbf-brand-footer-main {
      margin: 0;
      font-size: 8.6px;
      color: var(--orbf-muted);
      line-height: 1.2;
      font-family: var(--pdf-font-family);
    }

    .orbf-brand-footer-sub {
      margin: 1px 0 0;
      font-size: 7.7px;
      color: var(--orbf-muted);
      line-height: 1.2;
      font-family: var(--pdf-font-family);
    }

    .orbf-brand-footer-note {
      margin: 2px 0 0;
      font-size: 6.8px;
      color: var(--orbf-muted);
      line-height: 1.2;
      font-family: var(--pdf-font-family);
    }

    .orbf-brand-main {
      position: relative;
      z-index: 2;
      margin: 0 18mm;
    }
  `;

  const frameHtml = `<div class="orbf-brand-frame" aria-hidden="true"></div>`;
  const watermarkHtml = logoDataUri
    ? `<div class="orbf-brand-watermark" aria-hidden="true"><img src="${logoDataUri}" alt="" /></div>`
    : "";
  const headerHtml = `
    <header class="orbf-brand-header">
      ${logoDataUri ? `<img class="orbf-brand-header-logo" src="${logoDataUri}" alt="${orgName} logo" />` : ""}
      <p class="orbf-brand-org">${orgName}</p>
      <p class="orbf-brand-meta">${address}</p>
      <p class="orbf-brand-meta">${poBox} • ${telephone} • ${email}</p>
      <p class="orbf-brand-meta">TIN ${tin} • REG ${registrationNumber}</p>
      <h1 class="orbf-brand-title">${safeTitle}</h1>
      ${safeDocumentNumber ? `<p class="orbf-brand-number">${safeDocumentNumber}</p>` : ""}
      ${safeSubtitle ? `<p class="orbf-brand-subtitle">${safeSubtitle}</p>` : ""}
    </header>
  `;

  const footerHtml = `
    <footer class="orbf-brand-footer">
      <div class="orbf-brand-footer-line"></div>
      <p class="orbf-brand-footer-main">${address} • ${telephone} • ${email}</p>
      <p class="orbf-brand-footer-sub">${poBox} • TIN ${tin} • REG ${registrationNumber}</p>
      <p class="orbf-brand-footer-note">${safeFooterNote}</p>
    </footer>
  `;

  return {
    css,
    frameHtml,
    watermarkHtml,
    headerHtml,
    footerHtml,
  };
}
