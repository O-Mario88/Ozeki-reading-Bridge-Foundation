import puppeteer from "puppeteer";
import { getPdfBranding } from "@/lib/server/pdf/branding";

export type RenderBrandedPdfInput = {
  title: string;
  contentHtml: string;
  subtitle?: string;
  documentNumber?: string;
  footerNote?: string;
  accentHex?: string;
  baseUrl?: string;
  additionalCss?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function renderBrandedPdf(input: RenderBrandedPdfInput): Promise<Buffer> {
  const branding = await getPdfBranding({
    title: input.title,
    subtitle: input.subtitle,
    documentNumber: input.documentNumber,
    footerNote: input.footerNote,
    accentHex: input.accentHex,
  });

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${input.baseUrl ? `<base href="${escapeHtml(input.baseUrl)}" />` : ""}
  <style>
    ${branding.css}
    ${input.additionalCss ?? ""}
    @page {
      size: A4;
      margin: ${input.marginTop ?? "18mm"} ${input.marginRight ?? "14mm"} ${input.marginBottom ?? "24mm"} ${input.marginLeft ?? "14mm"};
    }
    body {
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 11pt;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  ${branding.frameHtml}
  ${branding.watermarkHtml}
  ${branding.headerHtml}
  ${branding.footerHtml}
  <main class="orbf-brand-main">${input.contentHtml}</main>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.evaluate(async () => {
      if ("fonts" in document) {
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      }
    });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: input.marginTop ?? "18mm",
        right: input.marginRight ?? "14mm",
        bottom: input.marginBottom ?? "24mm",
        left: input.marginLeft ?? "14mm",
      },
      displayHeaderFooter: false,
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
