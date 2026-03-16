import puppeteer from "puppeteer";
import { FinancialNarrationResult } from "../ai/finance-narration";

export interface FinancialReportData {
  title: string;
  organization: string;
  period: string;
  tables: Array<{
    name: string;
    headers: string[];
    rows: any[][];
  }>;
  narration?: FinancialNarrationResult;
}

/**
 * High-fidelity PDF generation using Puppeteer for complex financial layouts.
 */
export async function generateFinancialPdf(data: FinancialReportData): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; color: #333; margin: 40px; }
        header { border-bottom: 2px solid #0f5fc5; padding-bottom: 10px; margin-bottom: 30px; }
        h1 { color: #0f5fc5; margin: 0; font-size: 24px; }
        .meta { color: #666; font-size: 14px; margin-top: 5px; }
        
        .section { margin-bottom: 40px; }
        h2 { border-left: 4px solid #0f5fc5; padding-left: 10px; font-size: 18px; margin-bottom: 15px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th { background: #f4f7f9; text-align: left; padding: 10px; border-bottom: 2px solid #d7dde7; }
        td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
        .num { text-align: right; font-family: monospace; }
        
        .narration-box { background: #fdfefe; border: 1px solid #d7dde7; border-radius: 8px; padding: 20px; }
        .summary { font-style: italic; line-height: 1.6; margin-bottom: 20px; border-bottom: 1px dashed #ccc; padding-bottom: 15px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        ul { margin: 0; padding-left: 20px; }
        li { margin-bottom: 8px; line-height: 1.4; }
        
        .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 10px; color: #999; }
      </style>
    </head>
    <body>
      <header>
        <h1>${data.title}</h1>
        <div class="meta">${data.organization} | Reporting Period: ${data.period}</div>
      </header>

      ${data.narration ? `
        <div class="section">
          <h2>Financial Narrative & AI Insights</h2>
          <div class="narration-box">
            <div class="summary">${data.narration.executiveSummary}</div>
            <div class="grid">
              <div>
                <strong>Key Insights</strong>
                <ul>${data.narration.keyInsights.map(i => `<li>${i}</li>`).join("")}</ul>
              </div>
              <div>
                <strong>Risks & Recommendations</strong>
                <ul>
                  ${data.narration.risksAndConcerns.map(r => `<li style="color: #c53030">${r}</li>`).join("")}
                  ${data.narration.recommendations.map(re => `<li style="color: #2c5282">${re}</li>`).join("")}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ` : ""}

      ${data.tables.map(table => `
        <div class="section">
          <h2>${table.name}</h2>
          <table>
            <thead>
              <tr>${table.headers.map(h => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${table.rows.map(row => `
                <tr>
                  ${row.map((cell, i) => `<td class="${typeof cell === 'number' ? 'num' : ''}">${typeof cell === 'number' ? cell.toLocaleString() : cell}</td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `).join("")}

      <div class="footer">
        Ozeki Reading Bridge Foundation - Confidential Financial Document | Generated via Governed AI Pipeline
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20px", bottom: "40px" },
  });

  await browser.close();
  return Buffer.from(pdf);
}
