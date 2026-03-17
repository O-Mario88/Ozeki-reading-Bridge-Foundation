import { buildBrowserPdfBranding, type BrowserPdfBrandingInput } from "@/lib/browser-pdf-branding";

export async function getPdfBranding(input: BrowserPdfBrandingInput) {
  return buildBrowserPdfBranding(input);
}
