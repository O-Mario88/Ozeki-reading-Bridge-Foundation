import { NextRequest, NextResponse } from "next/server";
import { renderBrandedPdf } from "@/lib/server/pdf/render";
import type { StoryContentBlock } from "@/lib/types";
import { getStoryBySlugPostgres } from "@/lib/server/postgres/repositories/public-content";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return new NextResponse("Missing slug", { status: 400 });
  }

  const story = await getStoryBySlugPostgres(slug);
  if (!story) {
    return new NextResponse("Story not found", { status: 404 });
  }

  const contentHtml = `
    <section class="story-document">
      <div class="cover-page">
        <div>
          <h1 class="cover-title">${escapeHtml(story.title)}</h1>
          <div class="cover-author">By ${escapeHtml(story.publicAuthorDisplay)}</div>
          <div class="cover-meta">${escapeHtml(story.schoolName)}</div>
          <div class="cover-meta">1001 Story Project</div>
        </div>

        <div class="disclaimer">
          This story has been published with the explicit written consent of the author's guardian and school.<br/>
          Standard safeguarding policies apply.
        </div>
      </div>

      <div class="story-content">
        ${(story.storyContentBlocks || []).map(renderBlock).join("\n")}
      </div>
    </section>
  `;

  try {
    const pdfBuffer = await renderBrandedPdf({
      title: "Story Anthology",
      documentNumber: `#${story.slug}`,
      subtitle: `${story.schoolName} • ${story.publicAuthorDisplay}`,
      footerNote:
        "This story has been published with guardian and school consent. Standard safeguarding policies apply.",
      accentHex: "#C35D0E",
      baseUrl: request.nextUrl.origin,
      marginTop: "22mm",
      marginRight: "16mm",
      marginBottom: "24mm",
      marginLeft: "16mm",
      additionalCss: `
        .story-document {
          position: relative;
          z-index: 2;
        }
        .cover-page {
          min-height: 55vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          page-break-after: always;
        }
        .cover-title {
          font-size: 36pt;
          font-weight: 800;
          margin-bottom: 1rem;
        }
        .cover-author {
          font-size: 18pt;
          color: #555;
          margin-bottom: 1rem;
        }
        .cover-meta {
          font-size: 12pt;
          margin-bottom: 0.4rem;
          color: #777;
        }
        .disclaimer {
          margin-top: auto;
          font-size: 10pt;
          color: #666;
          font-style: italic;
          padding: 2rem;
          border-top: 1px solid #ccc;
          width: 80%;
        }
        h2 {
          font-size: 17pt;
          page-break-after: avoid;
          margin-top: 2rem;
        }
        p {
          margin-bottom: 1.2rem;
          page-break-inside: avoid;
        }
        .illustration {
          text-align: center;
          margin: 2rem 0;
          page-break-inside: avoid;
        }
        .illustration.keep-with-next {
          page-break-after: avoid;
        }
        img {
          max-width: 100%;
          max-height: 500px;
          object-fit: contain;
        }
        .caption {
          font-size: 9.5pt;
          color: #555;
          margin-top: 0.5rem;
          font-style: italic;
        }
      `,
      contentHtml,
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${story.slug}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF engine error:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}

function escapeHtml(unsafe: string) {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderBlock(block: StoryContentBlock) {
  if (block.type === "paragraph") {
    return `<p>${escapeHtml(block.text)}</p>`;
  }
  if (block.type === "heading") {
    return `<h2>${escapeHtml(block.text)}</h2>`;
  }
  if (block.type === "illustration") {
    return `
      <div class="illustration ${block.keep_with_next ? "keep-with-next" : ""}">
        <img src="${escapeHtml(block.image_url)}" alt="${escapeHtml(block.alt_text || "Image")}" />
        ${block.caption ? `<div class="caption">${escapeHtml(block.caption)}</div>` : ""}
      </div>
    `;
  }
  return "";
}
