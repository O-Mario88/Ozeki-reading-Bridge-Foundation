/**
 * PDF rendering engine using pdf-lib (pure JavaScript — no Chromium required).
 *
 * Replaces the previous puppeteer-based implementation so that PDF generation
 * works in container environments without a browser binary (Railway, Cloud Run, etc.).
 *
 * The function parses the HTML content produced by the finance/program templates
 * and renders it using pdf-lib drawing primitives with branded headers/footers.
 */
import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from "pdf-lib";
import {
  drawBrandHeader,
  drawBrandFooter,
  drawBrandWatermark,
  drawBrandFrame,
  loadBrandLogo,
} from "@/lib/pdf-branding";

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

/* ───────────────────────── constants ───────────────────────── */
const A4_WIDTH = 595.27;
const A4_HEIGHT = 841.89;
const MARGIN_LEFT = 42;
const MARGIN_RIGHT = 42;
const CONTENT_WIDTH = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const CONTENT_START_Y = A4_HEIGHT - 260; // below branded header
const PAGE_BOTTOM_Y = 80; // above branded footer
const LINE_HEIGHT = 1.45;

const COLOR_TEXT = rgb(0.06, 0.09, 0.16);
const COLOR_MUTED = rgb(0.39, 0.45, 0.53);
const COLOR_HEADING = rgb(0.06, 0.09, 0.16);
const COLOR_TABLE_HEADER_BG = rgb(0.97, 0.98, 0.99);
const COLOR_TABLE_BORDER = rgb(0.80, 0.83, 0.87);
const COLOR_SURFACE = rgb(0.95, 0.97, 0.98);

/* ───────── lightweight HTML → content blocks parser ────────── */
type ColumnEntry = { heading?: string; lines: string[] };

type ContentBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string; bold?: boolean }
  | { type: "table"; headers: string[]; rows: string[][]; numericCols?: Set<number> }
  | { type: "spacer"; height: number }
  | { type: "kpi"; items: { label: string; value: string }[] }
  | { type: "divider" }
  | { type: "blockquote"; text: string; attribution?: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "image"; dataUri: string; altText?: string }
  | { type: "columns"; cols: ColumnEntry[] };

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractText(html: string): string {
  return stripTags(html).replace(/\s+/g, " ").trim();
}

/* ---- sub-parsers for individual element types ---- */

function parseTable(tableHtml: string): ContentBlock | null {
  const inner = tableHtml.match(/<table[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!inner) return null;

  const headers: string[] = [];
  const rows: string[][] = [];
  const numericCols = new Set<number>();

  const theadMatch = inner.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  if (theadMatch) {
    const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
    let thMatch;
    let colIdx = 0;
    while ((thMatch = thRe.exec(theadMatch[1])) !== null) {
      const thTag = theadMatch[1].slice(thMatch.index, thMatch.index + thMatch[0].indexOf(">"));
      if (thTag.includes("num")) numericCols.add(colIdx);
      headers.push(extractText(thMatch[1]));
      colIdx++;
    }
  }

  const tbodyMatch = inner.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const bodyContent = tbodyMatch ? tbodyMatch[1] : inner;
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(bodyContent)) !== null) {
    if (theadMatch && trMatch.index < (theadMatch.index ?? 0) + theadMatch[0].length) continue;
    const cells: string[] = [];
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let tdMatch;
    let ci = 0;
    while ((tdMatch = tdRe.exec(trMatch[1])) !== null) {
      const tdTag = trMatch[1].slice(tdMatch.index, tdMatch.index + tdMatch[0].indexOf(">"));
      if (tdTag.includes("num")) numericCols.add(ci);
      cells.push(extractText(tdMatch[1]));
      ci++;
    }
    if (cells.length > 0) rows.push(cells);
  }

  if (headers.length > 0 || rows.length > 0) {
    return { type: "table", headers, rows, numericCols };
  }
  return null;
}

function parseKpiGrid(divHtml: string): ContentBlock | null {
  const items: { label: string; value: string }[] = [];
  const boxRe = /<span[^>]*class="[^"]*fp-kpi-label[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<span[^>]*class="[^"]*fp-kpi-val[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let boxMatch;
  while ((boxMatch = boxRe.exec(divHtml)) !== null) {
    items.push({ label: extractText(boxMatch[1]), value: extractText(boxMatch[2]) });
  }
  if (items.length === 0) {
    // Try <article>-based layout (training reports)
    const articleRe = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    let artMatch;
    while ((artMatch = articleRe.exec(divHtml)) !== null) {
      const spanRe = /<span>([\s\S]*?)<\/span>\s*<strong>([\s\S]*?)<\/strong>/i;
      const sm = artMatch[1].match(spanRe);
      if (sm) items.push({ label: extractText(sm[1]), value: extractText(sm[2]) });
    }
  }
  return items.length > 0 ? { type: "kpi", items } : null;
}

/**
 * Position-aware HTML → ContentBlock parser.
 *
 * Instead of extracting each block type in separate passes (which scrambles
 * document order), this searches for ALL top-level elements, records their
 * positions, sorts by position, and parses each in document order.
 */
function parseHtmlToBlocks(html: string): ContentBlock[] {
  // Strip <head>, <style>, <meta>, <link>, <base>
  let cleaned = html;
  cleaned = cleaned.replace(/<head[\s\S]*?<\/head>/gi, "");
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<meta[^>]*>/gi, "");
  cleaned = cleaned.replace(/<link[^>]*>/gi, "");
  cleaned = cleaned.replace(/<base[^>]*>/gi, "");

  // Collect every top-level element with its position
  type TagHit = { index: number; fullMatch: string; tag: string; inner: string };
  const hits: TagHit[] = [];

  let m: RegExpExecArray | null;

  // Column grids (fp-header-grid with fp-header-col children — must be before other patterns)
  const colGridRe = /<div[^>]*class="[^"]*fp-header-grid[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  while ((m = colGridRe.exec(cleaned)) !== null) {
    hits.push({ index: m.index, fullMatch: m[0], tag: "columns", inner: m[0] });
  }

  // Tables
  const tableRe = /<table[^>]*>[\s\S]*?<\/table>/gi;
  while ((m = tableRe.exec(cleaned)) !== null) {
    hits.push({ index: m.index, fullMatch: m[0], tag: "table", inner: m[0] });
  }

  // Headings
  const headingRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  while ((m = headingRe.exec(cleaned)) !== null) {
    hits.push({ index: m.index, fullMatch: m[0], tag: `h${m[1]}`, inner: m[2] });
  }

  // Blockquotes
  const bqRe = /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi;
  while ((m = bqRe.exec(cleaned)) !== null) {
    hits.push({ index: m.index, fullMatch: m[0], tag: "blockquote", inner: m[1] });
  }

  // Lists
  const listRe = /<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  while ((m = listRe.exec(cleaned)) !== null) {
    hits.push({ index: m.index, fullMatch: m[0], tag: m[1].toLowerCase(), inner: m[2] });
  }

  // Horizontal rules
  const hrRe = /<hr[^>]*\/?>/gi;
  while ((m = hrRe.exec(cleaned)) !== null) {
    hits.push({ index: m.index, fullMatch: m[0], tag: "hr", inner: "" });
  }

  // Images (base64 data URIs only — for embedded signatures)
  const imgRe = /<img[^>]*\bsrc="(data:image\/[^"]+)"[^>]*>/gi;
  while ((m = imgRe.exec(cleaned)) !== null) {
    const altMatch = m[0].match(/\balt="([^"]*)"/i);
    hits.push({ index: m.index, fullMatch: m[0], tag: "img", inner: m[1] + (altMatch ? `\n${altMatch[1]}` : "") });
  }

  // Paragraphs (<p> tags as top-level text containers)
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((m = pRe.exec(cleaned)) !== null) {
    hits.push({ index: m.index, fullMatch: m[0], tag: "p", inner: m[1] });
  }

  // KPI grids (special class-based divs)
  const kpiRe = /<div[^>]*class="[^"]*(?:fp-kpi-grid|kpis)[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi;
  while ((m = kpiRe.exec(cleaned)) !== null) {
    hits.push({ index: m.index, fullMatch: m[0], tag: "kpi", inner: m[0] });
  }

  // Sort by document position
  hits.sort((a, b) => a.index - b.index);

  // Remove hits that are nested inside earlier, larger hits
  const used = new Set<number>();
  const topLevel: TagHit[] = [];
  for (const hit of hits) {
    const end = hit.index + hit.fullMatch.length;
    let nested = false;
    for (const prev of topLevel) {
      const prevEnd = prev.index + prev.fullMatch.length;
      if (hit.index > prev.index && end <= prevEnd) {
        nested = true;
        break;
      }
    }
    if (!nested && !used.has(hit.index)) {
      topLevel.push(hit);
      used.add(hit.index);
    }
  }

  // Parse each hit into a ContentBlock
  const blocks: ContentBlock[] = [];

  for (const hit of topLevel) {
    if (hit.tag === "columns") {
      // Parse fp-header-col children into column entries
      const colRe = /<div[^>]*class="[^"]*fp-header-col[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      const cols: ColumnEntry[] = [];
      let colMatch;
      while ((colMatch = colRe.exec(hit.fullMatch)) !== null) {
        const colHtml = colMatch[1];
        const headingMatch = colHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
        const lines: string[] = [];
        const pTagRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        let pMatch;
        while ((pMatch = pTagRe.exec(colHtml)) !== null) {
          const text = extractText(pMatch[1]);
          if (text) lines.push(text);
        }
        cols.push({
          heading: headingMatch ? extractText(headingMatch[1]) : undefined,
          lines,
        });
      }
      if (cols.length > 0) {
        blocks.push({ type: "columns", cols });
      }
      continue;
    }

    if (hit.tag === "table") {
      const block = parseTable(hit.fullMatch);
      if (block) blocks.push(block);
      continue;
    }

    if (hit.tag === "kpi") {
      const block = parseKpiGrid(hit.fullMatch);
      if (block) blocks.push(block);
      continue;
    }

    if (/^h[1-6]$/.test(hit.tag)) {
      const text = extractText(hit.inner);
      if (text) {
        blocks.push({ type: "heading", level: parseInt(hit.tag[1], 10), text });
      }
      continue;
    }

    if (hit.tag === "blockquote") {
      const pMatch = hit.inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const footerMatch = hit.inner.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
      blocks.push({
        type: "blockquote",
        text: pMatch ? extractText(pMatch[1]) : extractText(hit.inner),
        attribution: footerMatch ? extractText(footerMatch[1]) : undefined,
      });
      continue;
    }

    if (hit.tag === "ul" || hit.tag === "ol") {
      const items: string[] = [];
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = liRe.exec(hit.inner)) !== null) {
        const text = extractText(liMatch[1]);
        if (text) items.push(text);
      }
      if (items.length > 0) {
        blocks.push({ type: "list", items, ordered: hit.tag === "ol" });
      }
      continue;
    }

    if (hit.tag === "hr") {
      blocks.push({ type: "divider" });
      continue;
    }

    if (hit.tag === "img") {
      const parts = hit.inner.split("\n");
      blocks.push({ type: "image", dataUri: parts[0], altText: parts[1] || undefined });
      continue;
    }

    if (hit.tag === "p") {
      const text = extractText(hit.inner);
      if (text && text.length > 2) {
        const isBold = /<strong|font-weight:\s*[67]00|font-weight:\s*bold/i.test(hit.fullMatch);
        blocks.push({ type: "paragraph", text, bold: isBold });
      }
      continue;
    }
  }

  // Fallback: if we extracted nothing, grab all remaining text
  if (blocks.length === 0) {
    // Try to pick up div/section-level text
    const divRe = /<(?:div|section)[^>]*>([\s\S]*?)<\/(?:div|section)>/gi;
    let dMatch;
    while ((dMatch = divRe.exec(cleaned)) !== null) {
      const text = extractText(dMatch[1]);
      if (text && text.length > 2) {
        blocks.push({ type: "paragraph", text });
      }
    }
  }

  if (blocks.length === 0) {
    const leftover = extractText(cleaned);
    if (leftover && leftover.length > 5) {
      blocks.push({ type: "paragraph", text: leftover });
    }
  }

  return blocks;
}

/* ──────────── pdf-lib rendering engine ──────────── */
type RenderContext = {
  doc: PDFDocument;
  font: PDFFont;
  fontBold: PDFFont;
  pages: PDFPage[];
  currentPage: PDFPage;
  y: number;
  pageCount: number;
};

function addNewPage(ctx: RenderContext, logo: ReturnType<typeof loadBrandLogo> extends Promise<infer T> ? T : never): PDFPage {
  const page = ctx.doc.addPage([A4_WIDTH, A4_HEIGHT]);
  ctx.pages.push(page);
  ctx.currentPage = page;
  ctx.y = A4_HEIGHT - 100; // smaller top margin for subsequent pages since no huge header
  ctx.pageCount++;
  drawBrandFrame(page);
  drawBrandWatermark(page, logo);
  return page;
}

function ensureSpace(ctx: RenderContext, needed: number, logo: Parameters<typeof addNewPage>[1]): void {
  if (ctx.y - needed < PAGE_BOTTOM_Y) {
    addNewPage(ctx, logo);
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    try {
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    } catch {
      // If a character can't be measured (unsupported glyph), skip it
      if (currentLine) lines.push(currentLine);
      currentLine = word.replace(/[^\x20-\x7E]/g, "");
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

function sanitizeForPdf(text: string): string {
  // Replace characters that might not be in standard PDF fonts
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/[\u2192\u2794\u279C]/g, "->")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .trim();
}

function drawWrappedText(
  ctx: RenderContext,
  text: string,
  fontSize: number,
  color: ReturnType<typeof rgb>,
  font: PDFFont,
  logo: Parameters<typeof addNewPage>[1],
  indent: number = 0,
): void {
  const cleanText = sanitizeForPdf(text);
  const paragraphs = cleanText.split("\n");
  for (const para of paragraphs) {
    if (!para.trim()) {
      ctx.y -= 4;
      continue;
    }
    const lines = wrapText(para, font, fontSize, CONTENT_WIDTH - indent);
    for (const line of lines) {
      ensureSpace(ctx, fontSize * LINE_HEIGHT + 2, logo);
      try {
        ctx.currentPage.drawText(line, {
          x: MARGIN_LEFT + indent,
          y: ctx.y,
          size: fontSize,
          font,
          color,
        });
      } catch {
        // Skip lines with unsupported characters
      }
      ctx.y -= fontSize * LINE_HEIGHT;
    }
  }
}

function drawTable(
  ctx: RenderContext,
  block: Extract<ContentBlock, { type: "table" }>,
  logo: Parameters<typeof addNewPage>[1],
): void {
  const { headers, rows, numericCols } = block;
  const colCount = Math.max(headers.length, rows[0]?.length ?? 1);
  const colWidth = CONTENT_WIDTH / colCount;
  const fontSize = 8;
  const cellPadding = 5;
  const contentWidthPerCol = colWidth - cellPadding * 2;

  // Draw header row
  if (headers.length > 0) {
    const headerLines = headers.map(h => wrapText(sanitizeForPdf(h), ctx.fontBold, fontSize, contentWidthPerCol));
    const maxLines = Math.max(1, ...headerLines.map(lines => lines.length));
    const rowHeight = maxLines * (fontSize * LINE_HEIGHT) + cellPadding * 2;

    ensureSpace(ctx, rowHeight + 4, logo);
    // Header background
    ctx.currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: ctx.y - rowHeight + cellPadding,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: COLOR_TABLE_HEADER_BG,
    });
    // Header border bottom
    ctx.currentPage.drawLine({
      start: { x: MARGIN_LEFT, y: ctx.y - rowHeight + cellPadding },
      end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: ctx.y - rowHeight + cellPadding },
      thickness: 1.5,
      color: COLOR_TABLE_BORDER,
    });
    for (let i = 0; i < headers.length; i++) {
      const lines = headerLines[i];
      const x = MARGIN_LEFT + i * colWidth + cellPadding;
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const lineText = lines[lineIdx];
        const lineY = ctx.y - fontSize - (lineIdx * fontSize * LINE_HEIGHT);
        try {
          ctx.currentPage.drawText(lineText, {
            x: numericCols?.has(i) ? x + contentWidthPerCol - ctx.fontBold.widthOfTextAtSize(lineText, fontSize) : x,
            y: lineY,
            size: fontSize,
            font: ctx.fontBold,
            color: COLOR_HEADING,
          });
        } catch { /* skip */ }
      }
    }
    ctx.y -= rowHeight;
  }

  // Draw data rows
  for (const row of rows) {
    const rowLines = row.map(c => wrapText(sanitizeForPdf(c), ctx.font, fontSize, contentWidthPerCol));
    const maxLines = Math.max(1, ...rowLines.map(lines => lines.length));
    const rowHeight = maxLines * (fontSize * LINE_HEIGHT) + cellPadding * 2;

    ensureSpace(ctx, rowHeight, logo);
    // Row border bottom
    ctx.currentPage.drawLine({
      start: { x: MARGIN_LEFT, y: ctx.y - rowHeight + cellPadding },
      end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: ctx.y - rowHeight + cellPadding },
      thickness: 0.5,
      color: COLOR_TABLE_BORDER,
    });
    for (let i = 0; i < Math.min(row.length, colCount); i++) {
      const lines = rowLines[i];
      const x = MARGIN_LEFT + i * colWidth + cellPadding;
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const lineText = lines[lineIdx];
        const lineY = ctx.y - fontSize - (lineIdx * fontSize * LINE_HEIGHT);
        try {
          const textWidth = ctx.font.widthOfTextAtSize(lineText, fontSize);
          ctx.currentPage.drawText(lineText, {
            x: numericCols?.has(i) ? x + contentWidthPerCol - textWidth : x,
            y: lineY,
            size: fontSize,
            font: ctx.font,
            color: COLOR_TEXT,
          });
        } catch { /* skip unsupported chars */ }
      }
    }
    ctx.y -= rowHeight;
  }

  ctx.y -= 8;
}

function drawKpiGrid(
  ctx: RenderContext,
  items: { label: string; value: string }[],
  logo: Parameters<typeof addNewPage>[1],
): void {
  const perRow = Math.min(items.length, 4);
  const boxWidth = (CONTENT_WIDTH - (perRow - 1) * 8) / perRow;
  const boxHeight = 44;

  for (let rowStart = 0; rowStart < items.length; rowStart += perRow) {
    ensureSpace(ctx, boxHeight + 8, logo);
    const rowItems = items.slice(rowStart, rowStart + perRow);
    for (let i = 0; i < rowItems.length; i++) {
      const x = MARGIN_LEFT + i * (boxWidth + 8);
      // Box background
      ctx.currentPage.drawRectangle({
        x,
        y: ctx.y - boxHeight,
        width: boxWidth,
        height: boxHeight,
        color: COLOR_SURFACE,
        borderColor: COLOR_TABLE_BORDER,
        borderWidth: 0.5,
      });
      // Label
      try {
        ctx.currentPage.drawText(sanitizeForPdf(rowItems[i].label).toUpperCase().slice(0, 30), {
          x: x + 8,
          y: ctx.y - 14,
          size: 7,
          font: ctx.fontBold,
          color: COLOR_MUTED,
        });
      } catch { /* skip */ }
      // Value
      try {
        ctx.currentPage.drawText(sanitizeForPdf(rowItems[i].value).slice(0, 20), {
          x: x + 8,
          y: ctx.y - 34,
          size: 16,
          font: ctx.fontBold,
          color: COLOR_HEADING,
        });
      } catch { /* skip */ }
    }
    ctx.y -= boxHeight + 8;
  }
}

function drawColumns(
  ctx: RenderContext,
  cols: ColumnEntry[],
  logo: Parameters<typeof addNewPage>[1],
): void {
  if (cols.length === 0) return;

  const gap = 16;
  const colCount = cols.length;
  const colWidth = (CONTENT_WIDTH - (colCount - 1) * gap) / colCount;
  const headingSize = 11;
  const textSize = 9;
  const lineSpacing = textSize * LINE_HEIGHT;

  // Pre-compute wrapped lines for each column to determine total height
  const colData = cols.map(col => {
    const wrappedLines: string[][] = [];
    for (const line of col.lines) {
      wrappedLines.push(wrapText(sanitizeForPdf(line), ctx.font, textSize, colWidth));
    }
    const lineCount = wrappedLines.reduce((sum, wl) => sum + wl.length, 0);
    const height = (col.heading ? headingSize * LINE_HEIGHT + 6 : 0) + lineCount * lineSpacing;
    return { heading: col.heading, wrappedLines, height };
  });

  const maxHeight = Math.max(...colData.map(c => c.height));
  ensureSpace(ctx, maxHeight + 10, logo);

  const startY = ctx.y;

  for (let i = 0; i < colData.length; i++) {
    const x = MARGIN_LEFT + i * (colWidth + gap);
    let colY = startY;
    const col = colData[i];

    // Draw heading
    if (col.heading) {
      try {
        ctx.currentPage.drawText(sanitizeForPdf(col.heading), {
          x,
          y: colY,
          size: headingSize,
          font: ctx.fontBold,
          color: COLOR_HEADING,
        });
      } catch { /* skip */ }
      colY -= headingSize * LINE_HEIGHT + 6;
    }

    // Draw text lines
    for (const wrappedGroup of col.wrappedLines) {
      for (const line of wrappedGroup) {
        try {
          ctx.currentPage.drawText(line, {
            x,
            y: colY,
            size: textSize,
            font: ctx.font,
            color: COLOR_TEXT,
          });
        } catch { /* skip */ }
        colY -= lineSpacing;
      }
    }
  }

  ctx.y = startY - maxHeight - 8;
}

/* ─────────── main render function ─────────── */

export async function renderBrandedPdf(input: RenderBrandedPdfInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadBrandLogo(doc);

  // Create initial page
  const firstPage = doc.addPage([A4_WIDTH, A4_HEIGHT]);
  const ctx: RenderContext = {
    doc,
    font,
    fontBold,
    pages: [firstPage],
    currentPage: firstPage,
    y: CONTENT_START_Y,
    pageCount: 1,
  };

  // Draw frame on first page (no watermark on first page as it has the main logo)
  drawBrandFrame(firstPage);

  // Draw branded header on first page
  drawBrandHeader({
    page: firstPage,
    font,
    fontBold,
    logo,
    title: input.title || "",
    subtitle: input.subtitle,
    documentNumber: input.documentNumber,
  });

  // Parse HTML content into blocks
  const blocks = parseHtmlToBlocks(input.contentHtml);

  // Render each block
  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const sizes: Record<number, number> = { 1: 18, 2: 14, 3: 12, 4: 11, 5: 10, 6: 9 };
        const size = sizes[block.level] ?? 12;
        ctx.y -= 6;
        ensureSpace(ctx, size * LINE_HEIGHT + 8, logo);
        drawWrappedText(ctx, block.text, size, COLOR_HEADING, fontBold, logo);
        ctx.y -= 2;
        break;
      }

      case "columns": {
        ctx.y -= 4;
        drawColumns(ctx, block.cols, logo);
        break;
      }

      case "paragraph": {
        drawWrappedText(ctx, block.text, 9.5, COLOR_TEXT, block.bold ? fontBold : font, logo);
        ctx.y -= 4;
        break;
      }

      case "table": {
        drawTable(ctx, block, logo);
        break;
      }

      case "kpi": {
        drawKpiGrid(ctx, block.items, logo);
        break;
      }

      case "blockquote": {
        ensureSpace(ctx, 30, logo);
        // Draw left border
        ctx.currentPage.drawRectangle({
          x: MARGIN_LEFT,
          y: ctx.y - 20,
          width: 3,
          height: 16,
          color: rgb(0.15, 0.39, 0.92),
        });
        drawWrappedText(ctx, `"${block.text}"`, 9, COLOR_TEXT, font, logo, 10);
        if (block.attribution) {
          drawWrappedText(ctx, `— ${block.attribution}`, 7.5, COLOR_MUTED, font, logo, 10);
        }
        ctx.y -= 6;
        break;
      }

      case "list": {
        for (let i = 0; i < block.items.length; i++) {
          const bullet = block.ordered ? `${i + 1}.` : "-";
          drawWrappedText(ctx, `${bullet} ${block.items[i]}`, 9, COLOR_TEXT, font, logo, 12);
          ctx.y -= 2;
        }
        ctx.y -= 4;
        break;
      }

      case "divider": {
        ensureSpace(ctx, 10, logo);
        ctx.currentPage.drawLine({
          start: { x: MARGIN_LEFT, y: ctx.y },
          end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: ctx.y },
          thickness: 0.5,
          color: COLOR_TABLE_BORDER,
        });
        ctx.y -= 10;
        break;
      }

      case "spacer": {
        ctx.y -= block.height;
        break;
      }

      case "image": {
        try {
          const dataMatch = block.dataUri.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
          if (dataMatch) {
            const format = dataMatch[1].toLowerCase();
            const rawBytes = Uint8Array.from(atob(dataMatch[2]), c => c.charCodeAt(0));
            const img = format === "png"
              ? await ctx.doc.embedPng(rawBytes)
              : await ctx.doc.embedJpg(rawBytes);
            const maxW = Math.min(180, CONTENT_WIDTH * 0.4);
            const scale = maxW / img.width;
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            ensureSpace(ctx, drawH + 10, logo);
            // Right-align (signature style)
            const imgX = MARGIN_LEFT + CONTENT_WIDTH - drawW;
            ctx.currentPage.drawImage(img, { x: imgX, y: ctx.y - drawH, width: drawW, height: drawH });
            ctx.y -= drawH + 6;
            if (block.altText) {
              const altSafe = sanitizeForPdf(block.altText);
              try {
                const altW = ctx.font.widthOfTextAtSize(altSafe, 7);
                ctx.currentPage.drawText(altSafe, {
                  x: imgX + (drawW - altW) / 2,
                  y: ctx.y,
                  size: 7,
                  font: ctx.font,
                  color: COLOR_MUTED,
                });
              } catch { /* skip */ }
              ctx.y -= 10;
            }
          }
        } catch {
          // Skip image if decode/embed fails
        }
        break;
      }
    }
  }

  // Draw branded footer + header on every page
  const totalPages = ctx.pages.length;
  for (let i = 0; i < totalPages; i++) {
    const page = ctx.pages[i];
    if (i > 0) {
      // Draw header on subsequent pages (first page already has it)
      drawBrandHeader({
        page,
        font,
        fontBold,
        logo,
        title: "",
        subtitle: input.subtitle,
        documentNumber: input.documentNumber,
        titleSize: 0,
        numberSize: 10,
        subtitleSize: 8,
        includeBiodata: false,
      });
    }
    drawBrandFooter({
      page,
      font,
      footerNote: input.footerNote,
      pageNumber: i + 1,
      totalPages,
    });
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
