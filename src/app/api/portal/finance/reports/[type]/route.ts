import { NextRequest, NextResponse } from "next/server";
import { requireFinanceEditor, csvHeaders } from "@/app/api/portal/finance/_utils";
import {
  getIncomeVsExpenseSummary,
  getBudgetVsActual,
  getProjectFundFinancialReport,
  getExpenseByCategoryReport,
  getCashFlowStatement,
  getReceiptsReport,
  listFinanceAssetsPostgres,
  exportFinanceRowsToCsv
} from "@/services/financeService";

export const runtime = "nodejs";

export async function GET(request: NextRequest, props: { params: Promise<{ type: string }> }) {
  const params = await props.params;
  const auth = await requireFinanceEditor();
  if (auth.error) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate") || "2020-01-01";
  const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0];
  const format = searchParams.get("format");

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rawData: any[] = [];
    let fields: string[] = [];
    const type = params.type;

    switch (type) {
      case "income-expense":
        rawData = await getIncomeVsExpenseSummary(startDate, endDate);
        fields = ["month", "account_type", "total_income", "total_expense"];
        break;
      case "budget-vs-actual":
        rawData = await getBudgetVsActual(startDate, endDate) as any; 
        fields = ["account_code", "account_name", "budget_amount", "actual_amount", "variance", "variance_percentage"];
        break;
      case "project-fund":
        rawData = await getProjectFundFinancialReport(startDate, endDate);
        fields = ["project_or_fund", "total_income", "total_expense", "net_surplus"];
        break;
      case "expense-category":
        rawData = await getExpenseByCategoryReport(startDate, endDate);
        fields = ["account_code", "category", "total_expense"];
        break;
      case "cash-flow":
        rawData = await getCashFlowStatement(startDate, endDate) as any;
        fields = ["activity_category", "account_name", "net_cash_impact"];
        break;
      case "receipts":
        rawData = await getReceiptsReport(startDate, endDate);
        fields = ["receipt_number", "issue_date", "amount", "currency", "payment_method", "client_name", "invoice_number", "status"];
        break;
      case "fixed-assets":
        rawData = await listFinanceAssetsPostgres();
        fields = ["assetCode", "name", "acquisitionDate", "purchaseValue", "currency", "usefulLifeMonths", "status"];
        break;
      default:
        return NextResponse.json({ error: "Unknown report type." }, { status: 404 });
    }

    if (format === "csv") {
      const csv = exportFinanceRowsToCsv(rawData, fields);
      return new NextResponse(csv, { headers: csvHeaders(`finance-report-${type}-${Date.now()}.csv`) });
    }

    return NextResponse.json({ data: rawData, type, startDate, endDate });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load report." },
      { status: 500 }
    );
  }
}
