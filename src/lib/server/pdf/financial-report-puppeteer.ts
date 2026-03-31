import { FinancialNarrationResult } from "../ai/finance-narration";
import { renderBrandedPdf } from "./render";

export interface FinancialReportData {
  title: string;
  organization: string;
  period: string;
  sections: Array<{
    title?: string;
    headers: string[];
    rows: Array<{
      label: string;
      value: number | string;
      isSubtotal?: boolean;
      isGrandTotal?: boolean;
    }>;
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

function formatVal(val: number | string) {
  if (typeof val === "number") {
    // Uganda Shillings format but handles generic numbers too
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(val);
  }
  return escapeHtml(String(val ?? ""));
}

export async function generateFinancialPdf(data: FinancialReportData): Promise<Buffer> {
  const sectionsHtml = data.sections
    .map(
      (section) => `
    <div style="margin-top: 24px; page-break-inside: avoid;">
      ${section.title ? `<h3 style="font-size: 1.1rem; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">${escapeHtml(section.title)}</h3>` : ''}
      <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
        <thead>
          <tr>
            ${section.headers.map((h, i) => `
              <th style="text-align: ${i === 0 ? 'left' : 'right'}; padding: 8px 4px; color: #64748b; font-weight: 600; border-bottom: 1px solid #cbd5e1;">
                ${escapeHtml(h)}
              </th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${section.rows
            .map(
              (row) => {
                let rowStyle = "padding: 8px 4px; border-bottom: 1px solid #f8fafc;";
                let tdLabelStyle = "";
                let tdValStyle = "text-align: right; font-family: monospace; font-size: 1.05rem;";
                
                if (row.isSubtotal) {
                  rowStyle = "padding: 10px 4px; font-weight: 700; background-color: #f1f5f9; border-top: 1px solid #94a3b8; border-bottom: 1px solid #cbd5e1;";
                } else if (row.isGrandTotal) {
                  rowStyle = "padding: 12px 4px; font-weight: 800; font-size: 1.1rem; background-color: #f8fafc; border-top: 2px solid #475569; border-bottom: 4px double #0f172a;";
                }

                return `
                <tr>
                  <td style="${rowStyle} ${tdLabelStyle}">${escapeHtml(row.label)}</td>
                  <td style="${rowStyle} ${tdValStyle}">${formatVal(row.value)}</td>
                </tr>
              `;
              }
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
    )
    .join("");

  // Clean Typography standard explicitly matching A4 proportions without bloated whitespace.
  const contentHtml = `
    <style>
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #0f172a;
        line-height: 1.5;
      }
      .fp-header-grid {
        display: flex;
        justify-content: space-between;
        margin-bottom: 25px;
        background: #f8fafc;
        padding: 15px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      .fp-header-col p { margin: 4px 0; font-size: 0.9rem; }
      .fp-header-col strong { color: #475569; display: inline-block; width: 140px; }
    </style>

    <div class="fp-header-grid">
      <div class="fp-header-col">
        <p><strong>Entity:</strong> ${escapeHtml(data.organization)}</p>
        <p><strong>Statement Type:</strong> ${escapeHtml(data.title)}</p>
      </div>
      <div class="fp-header-col">
        <p><strong>Reporting Period:</strong> ${escapeHtml(data.period)}</p>
        <p><strong>Generated Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
    </div>
    
    ${data.narration ? `
      <div style="background-color: #fff; padding: 15px; border-left: 4px solid #00155F; margin-bottom: 25px; font-size: 0.95rem;">
        <h3 style="margin-top: 0; color: #00155F; font-size: 1.05rem;">Executive Summary</h3>
        <p style="margin-bottom: 10px;">${escapeHtml(data.narration.executiveSummary)}</p>
        <h3 style="margin-top: 15px; margin-bottom: 5px; color: #00155F; font-size: 1.05rem;">Financial Findings & Analysis</h3>
        <p style="margin: 0;">${escapeHtml(data.narration.findings)}</p>
      </div>
    ` : ""}

    ${sectionsHtml}
  `;

  return renderBrandedPdf({
    title: data.title,
    subtitle: data.period,
    documentNumber: "OZEKI FINANCIAL RECORD",
    contentHtml,
    accentHex: "#00155F",
  });
}
