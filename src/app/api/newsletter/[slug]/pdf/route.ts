import { NextRequest, NextResponse } from "next/server";
import { getNewsletterIssueBySlug } from "@/lib/content-db";
import { buildNewsletterPageFragment } from "@/lib/newsletter";
import { renderBrandedPdf } from "@/lib/server/pdf/render";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const issue = await getNewsletterIssueBySlug(slug);
  if (!issue || issue.status !== "published") {
    return new NextResponse("Newsletter issue not found.", { status: 404 });
  }

  try {
    const pdfBuffer = await renderBrandedPdf({
      title: "Newsletter",
      documentNumber: `Issue ${issue.slug}`,
      subtitle: issue.title,
      footerNote: "Public newsletter publication from Ozeki Reading Bridge Foundation.",
      accentHex: "#0f5c7b",
      baseUrl: request.nextUrl.origin,
      marginTop: "22mm",
      marginRight: "16mm",
      marginBottom: "24mm",
      marginLeft: "16mm",
      additionalCss: `
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
      `,
      contentHtml: buildNewsletterPageFragment(issue),
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(issue.slug)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Newsletter PDF generation failed:", error);
    return new NextResponse("Failed to generate newsletter PDF.", { status: 500 });
  }
}
