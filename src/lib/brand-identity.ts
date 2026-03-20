import path from "node:path";

export const BRAND_ORG_NAME = "Ozeki Reading Bridge Foundation";
export const BRAND_LOGO_PATH = path.join(process.cwd(), "public", "photos", "logo.png");
/** Compressed logo for PDF embedding — keeps PDF under Lambda 6MB limit */
export const BRAND_LOGO_PDF_PATH = path.join(process.cwd(), "public", "photos", "logo-pdf.png");
export const BRAND_WATERMARK_OPACITY = 0.055;

