import { FinancialNarrationResult } from "../ai/finance-narration";
import { generateAcademicReportPdf, AcademicReportData } from "./academic-report-template";

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

  const combinedFindings = data.narration 
    ? `${data.narration.findings}\n\n${tableHtml}`
    : `No AI narration generated.\n\n${tableHtml}`;

  const academicData: AcademicReportData = {
    title: data.title,
    subtitle: `Ledger Reporting Period: ${data.period}`,
    author: "Oracle Finance AI Engine",
    date: new Date().toLocaleDateString(),
    recipient: "Board of Directors, Ozeki Reading Bridge Foundation",
    sections: {
      executiveSummary: data.narration?.executiveSummary ?? "No summary provided.",
      introduction: data.narration?.introduction ?? "This report presents the financial activities and fund health for the specified period.",
      methodology: data.narration?.methodology ?? "Data is sourced directly from the internal ledger.",
      findings: combinedFindings,
      conclusion: data.narration?.conclusion ?? "Report concluded.",
      recommendations: data.narration?.recommendations ?? "No recommendations.",
      references: data.narration?.references ?? "Internal Ledger System.",
    }
  };

  return generateAcademicReportPdf(academicData, {
    documentNumber: "FINANCIAL REPORT - AI GENERATED",
    accentHex: "#0f5fc5",
  });
}
