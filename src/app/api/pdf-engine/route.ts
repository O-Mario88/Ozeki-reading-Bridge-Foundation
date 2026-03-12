import { NextRequest, NextResponse } from "next/server";
import { getStoryBySlug } from "@/lib/db";
import puppeteer from "puppeteer";
import { buildBrowserPdfBranding } from "@/lib/browser-pdf-branding";
import type { StoryContentBlock } from "@/lib/types";

export async function GET(request: NextRequest) {
    const slug = request.nextUrl.searchParams.get("slug");
    if (!slug) return new NextResponse("Missing slug", { status: 400 });

    const story = getStoryBySlug(slug);
    if (!story) return new NextResponse("Story not found", { status: 404 });

    const baseUrl = request.nextUrl.origin;
    const branding = await buildBrowserPdfBranding({
        title: "Story Anthology",
        documentNumber: `#${story.slug}`,
        subtitle: `${story.schoolName} • ${story.publicAuthorDisplay}`,
        footerNote:
            "This story has been published with guardian and school consent. Standard safeguarding policies apply.",
        accentHex: "#C35D0E",
    });

    // Generate HTML for the PDF
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <base href="${baseUrl}">
        <style>
            ${branding.css}

            @page {
                size: A4;
                margin: 22mm 16mm 24mm 16mm;
            }

            body {
                font-size: 11.5pt;
                line-height: 1.45;
                margin: 0;
                padding: 0;
            }

            .story-document {
                position: relative;
                z-index: 2;
                padding-top: 90mm;
                padding-bottom: 34mm;
            }

            .cover-page {
                min-height: calc(100vh - 130mm);
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
                margin-bottom: 2rem;
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
        </style>
    </head>
    <body>
        ${branding.frameHtml}
        ${branding.watermarkHtml}
        ${branding.headerHtml}
        ${branding.footerHtml}

        <main class="story-document">
            <div class="cover-page">
                <div>
                    <h1 class="cover-title">${escapeHtml(story.title)}</h1>
                    <div class="cover-author">By ${escapeHtml(story.publicAuthorDisplay)}</div>
                    <div style="font-size: 12pt; margin-bottom: 0.5rem; color: #777;">${escapeHtml(story.schoolName)}</div>
                    <div style="font-size: 12pt; color: #777;">1001 Story Project</div>
                </div>
                
                <div class="disclaimer">
                    This story has been published with the explicit written consent of the author's guardian and school.<br/>
                    Standard safeguarding policies apply.
                </div>
            </div>

            <div class="story-content">
                ${(story.storyContentBlocks || []).map(renderBlock).join('\n')}
            </div>
        </main>
    </body>
    </html>
    `;

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Wait until network is idle to ensure valid fonts/images loads
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.evaluate(async () => {
            if ("fonts" in document) {
                await (document as Document & { fonts: FontFaceSet }).fonts.ready;
            }
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '22mm', right: '16mm', bottom: '24mm', left: '16mm' },
            displayHeaderFooter: true,
            headerTemplate: "<div></div>",
            footerTemplate: `<div style="font-size: 10px; text-align: center; width: 100%;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`
        });

        await browser.close();

        return new NextResponse(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${story.slug}.pdf"`
            }
        });
    } catch (error) {
        console.error("PDF engine error:", error);
        return new NextResponse("Failed to generate PDF", { status: 500 });
    }
}

function escapeHtml(unsafe: string) {
    return (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
        <div class="illustration ${block.keep_with_next ? 'keep-with-next' : ''}">
            <img src="${escapeHtml(block.image_url)}" alt="${escapeHtml(block.alt_text || 'Image')}" />
            ${block.caption ? `<div class="caption">${escapeHtml(block.caption)}</div>` : ''}
        </div>
        `;
    }
    return '';
}
