import fs from "node:fs/promises";
import path from "node:path";
import { renderBrandedPdf } from "@/lib/server/pdf/render";

async function main() {
  const paragraphs = Array.from({ length: 80 }, (_, index) => {
    const n = index + 1;
    return `<p><strong>Paragraph ${n}.</strong> This sample paragraph exists to force pagination and verify the branded PDF layout with first-page header and all-page watermark.</p>`;
  }).join("");

  const pdf = await renderBrandedPdf({
    title: "PDF Branding Sample",
    documentNumber: "LOCAL-QA-SAMPLE",
    subtitle: "Generated from scripts/generate-pdf-sample.ts",
    footerNote: "Local QA sample for branding checks.",
    contentHtml: `
      <section>
        <h2>Verification Payload</h2>
        <p>Expected behavior: first-page-only header, watermark on every page, consistent footer metadata.</p>
        ${paragraphs}
      </section>
    `,
    additionalCss: `
      h2 { margin: 0 0 10px; color: #0f5c7b; }
      p { margin: 0 0 9px; line-height: 1.5; }
    `,
  });

  const outputDir = path.join(process.cwd(), "data", "qa");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "pdf-branding-sample.pdf");
  await fs.writeFile(outputPath, pdf);
  console.log(`Generated sample PDF at ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
