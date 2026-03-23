import { FinancialNarrationResult } from "../ai/finance-narration";
import { renderBrandedPdf } from "./render";

export interface FinancialReportData {
  title: string;
  organization: string;
  period: string;
  tables: Array<{
    name: string;
    headers: string[];
    rows: Array<Array<string | number>>;
  }>;
  narration?: FinancialNarrationResult;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function generateFinancialPdf(data: FinancialReportData): Promise<Buffer> {
  const tableHtml = data.tables
    .map(
      (table) => `
    <div style="margin-top: 20px;">
      <h3>${escapeHtml(table.name)}</h3>
      <table>
        <thead>
          <tr>${table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${table.rows
            .map(
              (row) => `
                <tr>
                  ${row
                    .map((cell) => {
                      const rendered = typeof cell === "number" ? cell.toLocaleString() : String(cell ?? "");
                      return `<td style="${typeof cell === "number" ? "text-align: right; font-family: monospace;" : ""}">${escapeHtml(rendered)}</td>`;
                    })
                    .join("")}
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `,
    )
    .join("");

  const contentHtml = `
    <div class="fp-header-grid">
      <div class="fp-header-col">
        <p><strong>Prepared For:</strong> Board of Directors</p>
        <p><strong>Organization:</strong> ${escapeHtml(data.organization)}</p>
      </div>
      <div class="fp-header-col">
        <p><strong>Reporting Period:</strong> ${escapeHtml(data.period)}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
    </div>
    
    <hr />
    
    ${data.narration ? `
      <h3>Executive Summary</h3>
      <p>${escapeHtml(data.narration.executiveSummary)}</p>
      
      <h3>Financial Findings & Analysis</h3>
      <p>${escapeHtml(data.narration.findings)}</p>
      <hr />
    ` : ""}

    ${tableHtml}
  `;

  return renderBrandedPdf({
    title: data.title,
    subtitle: `Statement Period: ${data.period}`,
    documentNumber: "OFFICIAL OZEKI FINANCIAL STATEMENT",
    contentHtml,
    accentHex: "#00155F",
  });
}
