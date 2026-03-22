import { NextRequest, NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getPortalUserOrRedirect } from "@/lib/auth-server";
import { 
  getStatementOfFinancialPosition, 
  getStatementOfActivities, 
  getCashFlowStatement, 
  getBudgetVsActual, 
  getGrantAndDonorReport 
} from "@/lib/server/postgres/repositories/finance-reports";
import { generateFinancialNarration } from "@/lib/server/ai/finance-narration";
import { generateFinancialPdf, FinancialReportData } from "@/lib/server/pdf/financial-report-puppeteer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ type: string }> }) {
  try {
    await getPortalUserOrRedirect();
    const params = await props.params;

    const searchParams = request.nextUrl.searchParams;
    const reportType = params.type;
    
    // Parse common options
    const startDate = searchParams.get("startDate") || "2024-01-01";
    const endDate = searchParams.get("endDate") || "2024-12-31";
    const asOfDate = searchParams.get("asOfDate") || new Date().toISOString().split("T")[0];
    const fiscalYear = Number(searchParams.get("fiscalYear")) || new Date().getFullYear();
    const budgetPlanId = Number(searchParams.get("budgetPlanId")) || 1;
    const grantId = searchParams.get("grantId") ? Number(searchParams.get("grantId")) : undefined;

    const orgName = "Ozeki Reading Bridge Foundation";
    let title = "Financial Report";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dataRows: any[] = [];
    let headers: string[] = [];
    let period = "";

    // 1. Fetch Data based on report type
    if (reportType === "BalanceSheet") {
      title = "Statement of Financial Position (Balance Sheet)";
      period = `As of ${asOfDate}`;
      dataRows = await getStatementOfFinancialPosition(asOfDate);
      headers = ["Category", "Account Name", "Balance"];
    } else if (reportType === "PnL") {
      title = "Statement of Activities (Income & Expenditure)";
      period = `${startDate} to ${endDate}`;
      dataRows = await getStatementOfActivities(startDate, endDate);
      headers = ["Type", "Account Name", "Net Amount"];
    } else if (reportType === "CashFlow") {
      title = "Cash Flow Statement";
      period = `${startDate} to ${endDate}`;
      dataRows = await getCashFlowStatement(startDate, endDate);
      headers = ["Activity Category", "Account Name", "Net Cash Impact"];
    } else if (reportType === "BudgetActual") {
      title = "Budget vs. Actual (Variance Analysis)";
      period = `Fiscal Year ${fiscalYear}`;
      dataRows = await getBudgetVsActual(fiscalYear, budgetPlanId);
      headers = ["Code", "Account Name", "Budget", "Actual", "Variance", "%"];
    } else if (reportType === "Grants") {
      title = "Grant and Donor Utilization Report";
      period = "Life-to-date";
      dataRows = await getGrantAndDonorReport(grantId);
      headers = ["Grant", "Fund", "Type", "Account", "Debit", "Credit", "Net Available"];
    } else {
      return new NextResponse("Unknown AI Report Type", { status: 404 });
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
    const filename = `${reportType}_Report_${new Date().getTime()}.pdf`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error generating AI financial report:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}
