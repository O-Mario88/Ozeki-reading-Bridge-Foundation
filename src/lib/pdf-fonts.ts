import fs from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, StandardFonts } from "pdf-lib";

type PdfSerifFonts = {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  familyName: "Times New Roman" | "Liberation Serif" | "Times-Roman";
};

type PdfSansFonts = {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  familyName: "Calibri" | "Arial" | "Helvetica";
};

type FontBytesSet = {
  regular: Uint8Array;
  bold: Uint8Array;
  italic: Uint8Array;
  boldItalic: Uint8Array;
};

const SYSTEM_TIMES_PATHS = {
  regular: [
    "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    "/Library/Fonts/Times New Roman.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Times_New_Roman.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/times.ttf",
    "C:\\Windows\\Fonts\\times.ttf",
  ],
  bold: [
    "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
    "/Library/Fonts/Times New Roman Bold.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Times_New_Roman_Bold.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/timesbd.ttf",
    "C:\\Windows\\Fonts\\timesbd.ttf",
  ],
  italic: [
    "/System/Library/Fonts/Supplemental/Times New Roman Italic.ttf",
    "/Library/Fonts/Times New Roman Italic.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Times_New_Roman_Italic.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/timesi.ttf",
    "C:\\Windows\\Fonts\\timesi.ttf",
  ],
  boldItalic: [
    "/System/Library/Fonts/Supplemental/Times New Roman Bold Italic.ttf",
    "/Library/Fonts/Times New Roman Bold Italic.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Times_New_Roman_Bold_Italic.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/timesbi.ttf",
    "C:\\Windows\\Fonts\\timesbi.ttf",
  ],
} as const;

const BUNDLED_LIBERATION_PATHS = {
  regular: path.join(process.cwd(), "public", "assets", "fonts", "pdf", "LiberationSerif-Regular.ttf"),
  bold: path.join(process.cwd(), "public", "assets", "fonts", "pdf", "LiberationSerif-Bold.ttf"),
  italic: path.join(process.cwd(), "public", "assets", "fonts", "pdf", "LiberationSerif-Italic.ttf"),
  boldItalic: path.join(process.cwd(), "public", "assets", "fonts", "pdf", "LiberationSerif-BoldItalic.ttf"),
} as const;

const SYSTEM_CALIBRI_PATHS = {
  regular: [
    "/Library/Fonts/Calibri.ttf",
    "/System/Library/Fonts/Supplemental/Calibri.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/calibri.ttf",
    "C:\\Windows\\Fonts\\calibri.ttf",
  ],
  bold: [
    "/Library/Fonts/Calibri Bold.ttf",
    "/System/Library/Fonts/Supplemental/Calibri Bold.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/calibrib.ttf",
    "C:\\Windows\\Fonts\\calibrib.ttf",
  ],
  italic: [
    "/Library/Fonts/Calibri Italic.ttf",
    "/System/Library/Fonts/Supplemental/Calibri Italic.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/calibrii.ttf",
    "C:\\Windows\\Fonts\\calibrii.ttf",
  ],
  boldItalic: [
    "/Library/Fonts/Calibri Bold Italic.ttf",
    "/System/Library/Fonts/Supplemental/Calibri Bold Italic.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/calibriz.ttf",
    "C:\\Windows\\Fonts\\calibriz.ttf",
  ],
} as const;

const SYSTEM_ARIAL_PATHS = {
  regular: [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Arial.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/arial.ttf",
    "C:\\Windows\\Fonts\\arial.ttf",
  ],
  bold: [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/arialbd.ttf",
    "C:\\Windows\\Fonts\\arialbd.ttf",
  ],
  italic: [
    "/System/Library/Fonts/Supplemental/Arial Italic.ttf",
    "/Library/Fonts/Arial Italic.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Arial_Italic.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/ariali.ttf",
    "C:\\Windows\\Fonts\\ariali.ttf",
  ],
  boldItalic: [
    "/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf",
    "/Library/Fonts/Arial Bold Italic.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Arial_Bold_Italic.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/arialbi.ttf",
    "C:\\Windows\\Fonts\\arialbi.ttf",
  ],
} as const;

async function readFirstExisting(paths: readonly string[]): Promise<Uint8Array | null> {
  for (const candidate of paths) {
    try {
      return await fs.readFile(candidate);
    } catch {
      // Continue searching.
    }
  }
  return null;
}

async function loadSystemTimesFontBytes(): Promise<FontBytesSet | null> {
  const regular = await readFirstExisting(SYSTEM_TIMES_PATHS.regular);
  const bold = await readFirstExisting(SYSTEM_TIMES_PATHS.bold);
  const italic = await readFirstExisting(SYSTEM_TIMES_PATHS.italic);
  const boldItalic = await readFirstExisting(SYSTEM_TIMES_PATHS.boldItalic);
  if (!regular || !bold || !italic || !boldItalic) {
    return null;
  }
  return { regular, bold, italic, boldItalic };
}

async function loadSystemSansFontBytes(
  paths: {
    regular: readonly string[];
    bold: readonly string[];
    italic: readonly string[];
    boldItalic: readonly string[];
  },
): Promise<FontBytesSet | null> {
  const regular = await readFirstExisting(paths.regular);
  const bold = await readFirstExisting(paths.bold);
  const italic = await readFirstExisting(paths.italic);
  const boldItalic = await readFirstExisting(paths.boldItalic);
  if (!regular || !bold || !italic || !boldItalic) {
    return null;
  }
  return { regular, bold, italic, boldItalic };
}

async function loadBundledLiberationFontBytes(): Promise<FontBytesSet | null> {
  try {
    const [regular, bold, italic, boldItalic] = await Promise.all([
      fs.readFile(BUNDLED_LIBERATION_PATHS.regular),
      fs.readFile(BUNDLED_LIBERATION_PATHS.bold),
      fs.readFile(BUNDLED_LIBERATION_PATHS.italic),
      fs.readFile(BUNDLED_LIBERATION_PATHS.boldItalic),
    ]);
    return { regular, bold, italic, boldItalic };
  } catch {
    return null;
  }
}

export async function embedPdfSerifFonts(doc: PDFDocument): Promise<PdfSerifFonts> {
  doc.registerFontkit(fontkit);

  const systemTimes = await loadSystemTimesFontBytes();
  if (systemTimes) {
    return {
      regular: await doc.embedFont(systemTimes.regular, { subset: true }),
      bold: await doc.embedFont(systemTimes.bold, { subset: true }),
      italic: await doc.embedFont(systemTimes.italic, { subset: true }),
      boldItalic: await doc.embedFont(systemTimes.boldItalic, { subset: true }),
      familyName: "Times New Roman",
    };
  }

  const liberation = await loadBundledLiberationFontBytes();
  if (liberation) {
    return {
      regular: await doc.embedFont(liberation.regular, { subset: true }),
      bold: await doc.embedFont(liberation.bold, { subset: true }),
      italic: await doc.embedFont(liberation.italic, { subset: true }),
      boldItalic: await doc.embedFont(liberation.boldItalic, { subset: true }),
      familyName: "Liberation Serif",
    };
  }

  // Last-resort fallback for environments where custom fonts are unavailable.
  return {
    regular: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    boldItalic: await doc.embedFont(StandardFonts.TimesRomanBoldItalic),
    familyName: "Times-Roman",
  };
}

export async function embedPdfSansFonts(doc: PDFDocument): Promise<PdfSansFonts> {
  doc.registerFontkit(fontkit);

  const calibri = await loadSystemSansFontBytes(SYSTEM_CALIBRI_PATHS);
  if (calibri) {
    return {
      regular: await doc.embedFont(calibri.regular, { subset: true }),
      bold: await doc.embedFont(calibri.bold, { subset: true }),
      italic: await doc.embedFont(calibri.italic, { subset: true }),
      boldItalic: await doc.embedFont(calibri.boldItalic, { subset: true }),
      familyName: "Calibri",
    };
  }

  const arial = await loadSystemSansFontBytes(SYSTEM_ARIAL_PATHS);
  if (arial) {
    return {
      regular: await doc.embedFont(arial.regular, { subset: true }),
      bold: await doc.embedFont(arial.bold, { subset: true }),
      italic: await doc.embedFont(arial.italic, { subset: true }),
      boldItalic: await doc.embedFont(arial.boldItalic, { subset: true }),
      familyName: "Arial",
    };
  }

  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
    familyName: "Helvetica",
  };
}
