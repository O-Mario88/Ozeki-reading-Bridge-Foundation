import { FinancialNarrationResult } from "../ai/finance-narration";
import { renderBrandedPdf } from "@/lib/server/pdf/render";

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
  const contentHtml = `
    ${data.narration ? `
      <section class="section">
        <h2>Financial Narrative & AI Insights</h2>
        <div class="narration-box">
          <p class="summary">${escapeHtml(data.narration.executiveSummary)}</p>
          <div class="grid">
            <div>
              <strong>Key Insights</strong>
              <ul>${data.narration.keyInsights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
            <div>
              <strong>Risks & Recommendations</strong>
              <ul>
                ${data.narration.risksAndConcerns.map((item) => `<li class="risk">${escapeHtml(item)}</li>`).join("")}
                ${data.narration.recommendations.map((item) => `<li class="recommendation">${escapeHtml(item)}</li>`).join("")}
              </ul>
            </div>
          </div>
        </div>
      </section>
    ` : ""}

    ${data.tables
      .map(
        (table) => `
      <section class="section">
        <h2>${escapeHtml(table.name)}</h2>
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
                        return `<td class="${typeof cell === "number" ? "num" : ""}">${escapeHtml(rendered)}</td>`;
                      })
                      .join("")}
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </section>
    `,
      )
      .join("")}
  `;

  return renderBrandedPdf({
    title: data.title,
    subtitle: `${data.organization} | Reporting Period: ${data.period}`,
    documentNumber: "FINANCIAL REPORT",
    footerNote: "Confidential financial document generated via governed pipeline.",
    accentHex: "#0f5fc5",
    marginTop: "20mm",
    marginRight: "14mm",
    marginBottom: "26mm",
    marginLeft: "14mm",
    additionalCss: `
      .section {
        margin-bottom: 28px;
      }
      h2 {
        border-left: 4px solid #0f5fc5;
        padding-left: 10px;
        font-size: 18px;
        margin-bottom: 15px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 12px;
      }
      th {
        background: #f4f7f9;
        text-align: left;
        padding: 10px;
        border-bottom: 2px solid #d7dde7;
      }
      td {
        padding: 8px 10px;
        border-bottom: 1px solid #e5e7eb;
      }
      .num {
        text-align: right;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }
      .narration-box {
        background: #fdfefe;
        border: 1px solid #d7dde7;
        border-radius: 8px;
        padding: 16px;
      }
      .summary {
        font-style: italic;
        line-height: 1.6;
        margin-bottom: 20px;
        border-bottom: 1px dashed #cbd5e1;
        padding-bottom: 15px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      ul {
        margin: 6px 0 0;
        padding-left: 20px;
      }
      li {
        margin-bottom: 8px;
        line-height: 1.4;
      }
      .risk {
        color: #c53030;
      }
      .recommendation {
        color: #2c5282;
      }
    `,
    contentHtml,
  });
}
