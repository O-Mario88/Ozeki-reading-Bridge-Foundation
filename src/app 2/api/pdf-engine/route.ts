import { NextRequest, NextResponse } from "next/server";
import { getStoryBySlug } from "@/lib/db";
import puppeteer from "puppeteer";

export async function GET(request: NextRequest) {
    const slug = request.nextUrl.searchParams.get("slug");
    if (!slug) return new NextResponse("Missing slug", { status: 400 });

    const story = getStoryBySlug(slug);
    if (!story) return new NextResponse("Story not found", { status: 404 });

    const baseUrl = request.nextUrl.origin;

    // Generate HTML for the PDF
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <base href="${baseUrl}">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&family=Nunito:wght@700;800&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap');
            
            body {
                font-family: 'Lexend', sans-serif;
                font-size: 14pt;
                line-height: 1.6;
                color: #1a1c1e;
                margin: 0;
                padding: 0;
            }
            .cover-page {
                height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                page-break-after: always;
            }
            .cover-title {
                font-family: 'Nunito', sans-serif;
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
                font-family: 'Nunito', sans-serif;
                font-size: 20pt;
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
                font-size: 10pt;
                color: #555;
                margin-top: 0.5rem;
                font-style: italic;
            }
        </style>
    </head>
    <body>
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

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
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

function renderBlock(block: any) {
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
