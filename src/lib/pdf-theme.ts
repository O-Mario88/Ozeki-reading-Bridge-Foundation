import fs from "node:fs/promises";
import path from "node:path";

let pdfThemeCache: string | null = null;

export async function getPdfThemeCss(): Promise<string> {
  if (pdfThemeCache) {
    return pdfThemeCache;
  }

  const cssPath = path.join(process.cwd(), "src", "styles", "pdf-theme.css");
  try {
    pdfThemeCache = await fs.readFile(cssPath, "utf8");
    return pdfThemeCache;
  } catch {
    // Hard fallback so PDF generation never fails when style file is unavailable.
    pdfThemeCache = `
      :root { --pdf-font-family: "Times New Roman", "Liberation Serif", "Nimbus Roman", serif; }
      html, body, p, li, table, th, td, h1, h2, h3, h4, h5, h6, small, caption, footer {
        font-family: var(--pdf-font-family);
      }
      body { font-size: 11.5pt; line-height: 1.42; color: #111827; }
    `;
    return pdfThemeCache;
  }
}
