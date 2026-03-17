import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/portal-api";
import { renderBrandedPdf } from "@/lib/server/pdf/render";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();

    const paragraphs = Array.from({ length: 60 }, (_, index) => {
      const n = index + 1;
      return `<p><strong>Sample line ${n}.</strong> This is a branding verification paragraph used to force multi-page PDF output while testing first-page header behavior and all-page watermark rendering.</p>`;
    }).join("");

    const pdf = await renderBrandedPdf({
      title: "PDF Branding Sample",
      documentNumber: "SAMPLE-3-PAGE",
      subtitle: "Verification artifact for header + watermark rules",
      footerNote: "Generated for QA verification only.",
      accentHex: "#0f5c7b",
      contentHtml: `
        <section>
          <h2>Branding Validation</h2>
          <p>This document should show the compact organization header on page 1 only, while watermark and footer remain visible on all pages.</p>
          ${paragraphs}
        </section>
      `,
      additionalCss: `
        h2 { font-size: 20px; margin-bottom: 10px; color: #0f5c7b; }
        p { margin: 0 0 10px; line-height: 1.5; }
      `,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="pdf-branding-sample.pdf"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate sample PDF.";
    const status = /unauthorized|forbidden/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
