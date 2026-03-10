import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { buildBrowserPdfBranding } from "@/lib/browser-pdf-branding";
import { getNewsletterIssueBySlug } from "@/lib/db";
import { buildNewsletterPageFragment } from "@/lib/newsletter";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const issue = getNewsletterIssueBySlug(slug);
  if (!issue || issue.status !== "published") {
    return new NextResponse("Newsletter issue not found.", { status: 404 });
  }

  const baseUrl = request.nextUrl.origin;
  const branding = await buildBrowserPdfBranding({
    title: "Newsletter",
    documentNumber: `Issue ${issue.slug}`,
    subtitle: issue.title,
    footerNote: "Public newsletter publication from Ozeki Reading Bridge Foundation.",
    accentHex: "#0f5c7b",
  });

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <base href="${escapeHtml(baseUrl)}" />
  <style>
    ${branding.css}

    @page {
      size: A4;
      margin: 22mm 16mm 24mm 16mm;
    }

    body {
      margin: 0;
      padding: 0;
      font-size: 11pt;
      line-height: 1.5;
      color: #0f172a;
      background: #ffffff;
    }

    .newsletter-document.newsletter-document-template {
      border: none;
      padding: 0;
      background: transparent;
    }

    .newsletter-document-header h1 {
      margin: 0 0 8px;
      font-size: 23pt;
      line-height: 1.2;
      color: #0d3330;
    }

    .newsletter-kicker {
      margin: 0 0 8px;
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
      color: #0f5c7b;
    }

    .newsletter-preheader {
      margin: 0 0 7px;
      color: #334155;
      font-size: 11pt;
    }

    .newsletter-date {
      margin: 0 0 12px;
      color: #64748b;
      font-size: 9.5pt;
    }

    .newsletter-content img {
      max-width: 100%;
      border-radius: 8px;
      height: auto;
      page-break-inside: avoid;
    }

    .newsletter-content table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: avoid;
    }

    .newsletter-content th,
    .newsletter-content td {
      border: 1px solid #d8deea;
      text-align: left;
      padding: 6px 8px;
      vertical-align: top;
    }

    .newsletter-content h1,
    .newsletter-content h2,
    .newsletter-content h3,
    .newsletter-content h4 {
      page-break-after: avoid;
    }
  </style>
</head>
<body>
  ${branding.frameHtml}
  ${branding.watermarkHtml}
  ${branding.headerHtml}
  ${branding.footerHtml}
  <main class="orbf-brand-main">
    ${buildNewsletterPageFragment(issue)}
  </main>
</body>
</html>`;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 45000 });
    await page.evaluate(async () => {
      if ("fonts" in document) {
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      }
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "22mm", right: "16mm", bottom: "24mm", left: "16mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate:
        '<div style="font-size:10px;text-align:center;width:100%;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(issue.slug)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Newsletter PDF generation failed:", error);
    return new NextResponse("Failed to generate newsletter PDF.", { status: 500 });
  }
}
