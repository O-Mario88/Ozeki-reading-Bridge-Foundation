"use server";

import { requirePortalStaffUser } from "@/lib/auth";
import { 
  getStatementOfFinancialPosition, 
  getStatementOfActivities, 
  getCashFlowStatement, 
  getBudgetVsActual, 
  getGrantAndDonorReport 
} from "@/lib/server/postgres/repositories/finance-reports";
import { generateFinancialNarration } from "@/lib/server/ai/finance-narration";
import { generateFinancialPdf, FinancialReportData } from "@/lib/server/pdf/financial-report-puppeteer";

export async function generateFinancialReport(reportType: string, options: { 
  startDate?: string; 
  endDate?: string; 
  asOfDate?: string; 
  fiscalYear?: number;
  budgetPlanId?: number;
  grantId?: number;
}) {
  const user = await requirePortalStaffUser();
  if (!user) throw new Error("Unauthorized");

  const orgName = "Ozeki Reading Bridge Foundation";
  let title = "Financial Report";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataRows: any[] = [];
  let headers: string[] = [];
  let period = "";

  // 1. Fetch Data based on report type
  if (reportType === "BalanceSheet") {
    const date = options.asOfDate || new Date().toISOString().split("T")[0];
    title = "Statement of Financial Position (Balance Sheet)";
    period = `As of ${date}`;
    dataRows = await getStatementOfFinancialPosition(date);
    headers = ["Category", "Account Name", "Balance"];
  } else if (reportType === "PnL") {
    const start = options.startDate || "2024-01-01";
    const end = options.endDate || "2024-12-31";
    title = "Statement of Activities (Income & Expenditure)";
    period = `${start} to ${end}`;
    dataRows = await getStatementOfActivities(start, end);
    headers = ["Type", "Account Name", "Net Amount"];
  } else if (reportType === "CashFlow") {
    const start = options.startDate || "2024-01-01";
    const end = options.endDate || "2024-12-31";
    title = "Cash Flow Statement";
    period = `${start} to ${end}`;
    dataRows = await getCashFlowStatement(start, end);
    headers = ["Activity Category", "Account Name", "Net Cash Impact"];
  } else if (reportType === "BudgetActual") {
    const year = options.fiscalYear || new Date().getFullYear();
    const planId = options.budgetPlanId || 1;
    title = "Budget vs. Actual (Variance Analysis)";
    period = `Fiscal Year ${year}`;
    dataRows = await getBudgetVsActual(year, planId);
    headers = ["Code", "Account Name", "Budget", "Actual", "Variance", "%"];
  } else if (reportType === "Grants") {
    title = "Grant and Donor Utilization Report";
    period = "Life-to-date";
    dataRows = await getGrantAndDonorReport(options.grantId);
    headers = ["Grant", "Fund", "Type", "Account", "Debit", "Credit", "Net Available"];
  }

  // 2. Generate AI Narration
  const narration = await generateFinancialNarration(title, dataRows, { 
    period, 
    organization: orgName 
  });

  // 3. Prepare PDF Data
  const reportData: FinancialReportData = {
    title,
    organization: orgName,
    period,
    narration,
    tables: [
      {
        name: "Main Ledger Summary",
        headers,
        rows: dataRows.map(row => Object.values(row))
      }
    ]
  };

  // 4. Generate PDF
  const pdfBuffer = await generateFinancialPdf(reportData);
  return {
    pdfBase64: pdfBuffer.toString("base64"),
    fileName: `${reportType}_Report_${new Date().getTime()}.pdf`
  };
}
