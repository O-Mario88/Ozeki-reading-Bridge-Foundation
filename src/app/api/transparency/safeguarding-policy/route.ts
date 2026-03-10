import { NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import {
  safeguardingPolicyBody,
  safeguardingPolicyTitle,
  safeguardingPolicyToc,
} from "@/lib/safeguarding-policy";
import { embedPdfSerifFonts } from "@/lib/pdf-fonts";
import {
  drawBrandFooter,
  drawBrandFrame,
  drawBrandHeader,
  drawBrandWatermark,
  loadBrandLogo,
} from "@/lib/pdf-branding";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 48;
const MARGIN_BOTTOM = 52;
const FIRST_PAGE_START_Y = 600;
const CONTINUATION_PAGE_START_Y = 768;

function wrapTextByWidth(
  text: string,
  maxWidth: number,
  size: number,
  widthOf: (value: string, fontSize: number) => number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (widthOf(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (widthOf(word, size) <= maxWidth) {
      current = word;
      continue;
    }

    let segment = "";
    for (const char of word) {
      const next = `${segment}${char}`;
      if (widthOf(next, size) <= maxWidth) {
        segment = next;
      } else {
        if (segment) {
          lines.push(segment);
        }
        segment = char;
      }
    }

    if (segment) {
      current = segment;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export async function GET() {
  const document = await PDFDocument.create();
  const serifFonts = await embedPdfSerifFonts(document);
  const regularFont = serifFonts.regular;
  const boldFont = serifFonts.bold;
  const logo = await loadBrandLogo(document);
  const createBrandedPage = (subtitle: string, includeHeader: boolean) => {
    const nextPage = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawBrandFrame(nextPage);
    drawBrandWatermark(nextPage, logo);
    if (includeHeader) {
      drawBrandHeader({
        page: nextPage,
        font: regularFont,
        fontBold: boldFont,
        logo,
        title: safeguardingPolicyTitle,
        documentNumber: "FULL POLICY",
        subtitle,
        titleColor: rgb(0.03, 0.31, 0.4),
        mutedColor: rgb(0.2, 0.24, 0.3),
        titleSize: 20,
        numberSize: 12,
        subtitleSize: 9,
      });
    }
    return nextPage;
  };

  let page = createBrandedPage("Document type: Full policy text", true);
  let cursorY = FIRST_PAGE_START_Y;

  const lineGapMultiplier = 1.35;

  const widthOf = (value: string, fontSize: number) =>
    regularFont.widthOfTextAtSize(value, fontSize);
  const widthOfBold = (value: string, fontSize: number) =>
    boldFont.widthOfTextAtSize(value, fontSize);

  const ensureSpace = (heightNeeded: number) => {
    if (cursorY - heightNeeded < MARGIN_BOTTOM) {
      page = createBrandedPage("Policy continuation", false);
      cursorY = CONTINUATION_PAGE_START_Y;
    }
  };

  const drawWrapped = (
    text: string,
    options?: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      paragraphGap?: number;
      leading?: number;
    },
  ) => {
    const size = options?.size ?? 11;
    const bold = options?.bold ?? false;
    const color = options?.color ?? rgb(0.1, 0.14, 0.2);
    const indent = options?.indent ?? 0;
    const paragraphGap = options?.paragraphGap ?? 6;
    const leading = options?.leading ?? size * lineGapMultiplier;
    const font = bold ? boldFont : regularFont;
    const measure = bold ? widthOfBold : widthOf;
    const maxWidth = PAGE_WIDTH - MARGIN_X * 2 - indent;

    const wrappedLines = wrapTextByWidth(text, maxWidth, size, measure);
    ensureSpace(wrappedLines.length * leading + paragraphGap);

    wrappedLines.forEach((line) => {
      page.drawText(line, {
        x: MARGIN_X + indent,
        y: cursorY,
        size,
        font,
        color,
      });
      cursorY -= leading;
    });

    cursorY -= paragraphGap;
  };

  drawWrapped(`Generated: ${new Date().toLocaleString()}`, {
    size: 10,
    color: rgb(0.2, 0.24, 0.3),
    paragraphGap: 14,
  });

  drawWrapped("Table of Contents", {
    size: 14,
    bold: true,
    color: rgb(0.03, 0.31, 0.4),
    paragraphGap: 8,
  });
  safeguardingPolicyToc.forEach((item, index) => {
    drawWrapped(`${index + 1}. ${item}`, {
      size: 10,
      color: rgb(0.16, 0.2, 0.27),
      paragraphGap: 2,
    });
  });

  page = createBrandedPage("Policy body and clauses", false);
  cursorY = CONTINUATION_PAGE_START_Y;

  const lines = safeguardingPolicyBody.replace(/\r/g, "").trim().split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      cursorY -= 4;
      if (cursorY < MARGIN_BOTTOM) {
        page = createBrandedPage("Policy continuation", false);
        cursorY = CONTINUATION_PAGE_START_Y;
      }
      continue;
    }

    if (line.startsWith("# ")) {
      drawWrapped(line.replace(/^#\s+/, ""), {
        size: 14,
        bold: true,
        color: rgb(0.03, 0.31, 0.4),
        paragraphGap: 7,
      });
      continue;
    }

    if (line.startsWith("## ")) {
      drawWrapped(line.replace(/^##\s+/, ""), {
        size: 12,
        bold: true,
        color: rgb(0.08, 0.22, 0.32),
        paragraphGap: 6,
      });
      continue;
    }

    if (line.startsWith("- ")) {
      drawWrapped(`- ${line.replace(/^-\s+/, "")}`, {
        size: 10,
        color: rgb(0.12, 0.13, 0.17),
        indent: 12,
        paragraphGap: 2,
      });
      continue;
    }

    drawWrapped(line, {
      size: 10,
      color: rgb(0.12, 0.13, 0.17),
      paragraphGap: 5,
    });
  }

  const pages = document.getPages();
  const totalPages = pages.length;
  pages.forEach((pdfPage, index) => {
    drawBrandFooter({
      page: pdfPage,
      font: regularFont,
      footerNote: "Official safeguarding policy document.",
      pageNumber: index + 1,
      totalPages,
      mutedColor: rgb(0.2, 0.24, 0.3),
    });
  });

  const pdfBytes = await document.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="safeguarding-policy-full.pdf"',
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
