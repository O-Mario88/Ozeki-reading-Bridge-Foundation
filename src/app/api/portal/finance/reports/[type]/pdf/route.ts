import { NextRequest, NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getPortalUserOrRedirect } from "@/lib/auth-server";
import {
  getIncomeVsExpenseSummary,
  getBudgetVsActual,
  getProjectFundFinancialReport,
  getExpenseByCategoryReport,
  getCashFlowStatement,
  getReceiptsReport,
  listFinanceAssetsPostgres,
} from "@/services/financeService";
import { buildFinancialReportHtml } from "@/lib/server/pdf/finance-pdf-templates";
import { renderBrandedPdf } from "@/lib/server/pdf/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ type: string }> }) {
  try {
    await getPortalUserOrRedirect();
    const params = await props.params;

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || "2020-01-01";
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0];
    const fiscalYear = Number(searchParams.get("fiscalYear")) || new Date().getFullYear();

    let rawData: unknown[] = [];
    let title = "FINANCIAL REPORT";
    let columns: Array<{ key: string; label: string; format: "money" | "text" | "number" }> = [];

    const type = params.type;
    switch (type) {
      case "income-expense":
        rawData = await getIncomeVsExpenseSummary(startDate, endDate);
        title = "INCOME VS EXPENSE SUMMARY";
        columns = [
          { key: "month", label: "Month", format: "text" },
          { key: "account_type", label: "Account Type", format: "text" },
          { key: "total_income", label: "Total Income", format: "money" },
          { key: "total_expense", label: "Total Expense", format: "money" },
        ];
        break;
      case "budget-vs-actual":
        rawData = await getBudgetVsActual(fiscalYear, 1);
        title = `BUDGET VS ACTUAL (${fiscalYear})`;
        columns = [
          { key: "account_code", label: "Account Code", format: "text" },
          { key: "account_name", label: "Account Name", format: "text" },
          { key: "budget_amount", label: "Budget Amount", format: "money" },
          { key: "actual_amount", label: "Actual Amount", format: "money" },
          { key: "variance", label: "Variance", format: "money" },
          { key: "variance_percentage", label: "Variance %", format: "number" },
        ];
        break;
      case "project-fund":
        rawData = await getProjectFundFinancialReport(startDate, endDate);
        title = "PROJECT / FUND FINANCIAL REPORT";
        columns = [
          { key: "project_or_fund", label: "Project/Fund", format: "text" },
          { key: "total_income", label: "Total Income", format: "money" },
          { key: "total_expense", label: "Total Expense", format: "money" },
          { key: "net_surplus", label: "Net Surplus", format: "money" },
        ];
        break;
      case "expense-category":
        rawData = await getExpenseByCategoryReport(startDate, endDate);
        title = "EXPENSE BY CATEGORY";
        columns = [
          { key: "account_code", label: "Code", format: "text" },
          { key: "category", label: "Category", format: "text" },
          { key: "total_expense", label: "Total Expense", format: "money" },
        ];
        break;
      case "cash-flow":
        rawData = await getCashFlowStatement(startDate, endDate);
        title = "CASH FLOW STATEMENT (SUMMARY)";
        columns = [
          { key: "activity_category", label: "Activity Category", format: "text" },
          { key: "account_name", label: "Account Name", format: "text" },
          { key: "net_cash_impact", label: "Net Cash Impact", format: "money" },
        ];
        break;
      case "receipts":
        rawData = await getReceiptsReport(startDate, endDate);
        title = "RECEIPTS REGISTER";
        columns = [
          { key: "receipt_number", label: "Receipt No.", format: "text" },
          { key: "issue_date", label: "Issue Date", format: "text" },
          { key: "client_name", label: "Received From", format: "text" },
          { key: "payment_method", label: "Payment Method", format: "text" },
          { key: "status", label: "Status", format: "text" },
          { key: "amount", label: "Amount", format: "money" },
        ];
        break;
      case "fixed-assets":
        rawData = await listFinanceAssetsPostgres();
        title = "FIXED ASSETS REGISTER";
        columns = [
          { key: "assetCode", label: "Asset Code", format: "text" },
          { key: "name", label: "Asset Name", format: "text" },
          { key: "acquisitionDate", label: "Acq. Date", format: "text" },
          { key: "status", label: "Status", format: "text" },
          { key: "usefulLifeMonths", label: "Useful Life (Mo)", format: "number" },
          { key: "purchaseValue", label: "Purchase Value", format: "money" },
        ];
        break;
      default:
        return NextResponse.json({ error: "Unknown report type." }, { status: 404 });
    }

    const { html, css } = buildFinancialReportHtml(rawData as Record<string, unknown>[], columns, "UGX");

    const pdfBuffer = await renderBrandedPdf({
      title: title,
      subtitle: `Reporting Period: ${startDate} to ${endDate}`,
      documentNumber: `REP-${type.toUpperCase()}`,
      footerNote: "Ozeki Financial Systems - Official Document Export",
      accentHex: "#1f2a44",
      contentHtml: html,
      additionalCss: css,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Report_${title.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error generating report PDF:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}
