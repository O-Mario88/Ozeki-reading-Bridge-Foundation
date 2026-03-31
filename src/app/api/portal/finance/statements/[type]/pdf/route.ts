import { NextRequest, NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getPortalUserOrRedirect } from "@/lib/auth";
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
    const grantId = searchParams.get("grantId") ? Number(searchParams.get("grantId")) : undefined;

    const orgName = "Ozeki Reading Bridge Foundation";
    let title = "Financial Report";
    let period = "";

    // The new structural sections that Puppeteer will consume
    const sections: FinancialReportData["sections"] = [];

    // 1. Map Data specifically per report type
    if (reportType === "BalanceSheet") {
      title = "Statement of Financial Position";
      period = `As of ${asOfDate}`;
      const dataRows = await getStatementOfFinancialPosition(asOfDate);
      
      const assetRows = dataRows.filter(r => r.group_name === "Assets");
      const liabilityRows = dataRows.filter(r => r.group_name === "Liabilities");
      
      const totalAssets = assetRows.reduce((sum, r) => sum + r.balance, 0);
      const totalLiabilities = liabilityRows.reduce((sum, r) => sum + r.balance, 0);

      sections.push({
        title: "Assets",
        headers: ["Account", "Balance (UGX)"],
        rows: [
          ...assetRows.map(r => ({ label: r.account_name, value: r.balance })),
          { label: "Total Assets", value: totalAssets, isGrandTotal: true }
        ]
      });

      sections.push({
        title: "Liabilities & Net Assets",
        headers: ["Account", "Balance (UGX)"],
        rows: [
          ...liabilityRows.map(r => ({ label: r.account_name, value: r.balance })),
          { label: "Total Liabilities", value: totalLiabilities, isSubtotal: true },
          { label: "Net Assets (Fund Balance)", value: totalAssets - totalLiabilities, isGrandTotal: true }
        ]
      });

    } else if (reportType === "PnL") {
      title = "Statement of Activities";
      period = `${startDate} to ${endDate}`;
      const dataRows = await getStatementOfActivities(startDate, endDate);
      
      const revRows = dataRows.filter((r: any) => r.group_name === "Revenue");
      const expRows = dataRows.filter((r: any) => r.group_name === "Operating Expenses");

      const totalRev = revRows.reduce((sum: number, r: any) => sum + Number(r.net_amount), 0);
      const totalExp = expRows.reduce((sum: number, r: any) => sum + Number(r.net_amount), 0);

      sections.push({
        title: "Support & Revenue",
        headers: ["Revenue Core", "Amount (UGX)"],
        rows: [
          ...revRows.map(r => ({ label: r.account_name, value: Number(r.net_amount) })),
          { label: "Total Revenue", value: totalRev, isSubtotal: true }
        ]
      });

      sections.push({
        title: "Operating Expenses",
        headers: ["Expense Category", "Amount (UGX)"],
        rows: [
          ...expRows.map(r => ({ label: r.account_name, value: Number(r.net_amount) })),
          { label: "Total Expenses", value: totalExp, isSubtotal: true }
        ]
      });

      sections.push({
        headers: ["Change in Net Assets"],
        rows: [{ label: "Net Surplus / (Deficit) for Period", value: totalRev - totalExp, isGrandTotal: true }]
      });

    } else if (reportType === "CashFlow") {
      title = "Cash Flow Statement";
      period = `${startDate} to ${endDate}`;
      const data = await getCashFlowStatement(startDate, endDate);
      
      const inflows = data.lines.filter((r: any) => r.category === "Cash Inflows");
      const outflows = data.lines.filter((r: any) => r.category === "Cash Outflows");

      const totalIn = inflows.reduce((s: number, r: any) => s + Number(r.net_cash_impact), 0);
      const totalOut = outflows.reduce((s: number, r: any) => s + Number(r.net_cash_impact), 0);

      sections.push({
        headers: ["Cash Movements", "Amount (UGX)"],
        rows: [
          { label: "Opening Cash Balance", value: data.openingBalance, isSubtotal: true },
          // Inflows
          ...inflows.map(r => ({ label: `Inflow: ${r.account_name}`, value: Number(r.net_cash_impact) })),
          { label: "Total Cash Provided", value: totalIn, isSubtotal: true },
          // Outflows
          ...outflows.map(r => ({ label: `Outflow: ${r.account_name}`, value: -Number(r.net_cash_impact) })),
          { label: "Total Cash Administered", value: -totalOut, isSubtotal: true },
          // Closing
          { label: "Net Increase / (Decrease)", value: totalIn - totalOut, isSubtotal: true },
          { label: "Closing Cash Balance", value: data.closingBalance, isGrandTotal: true }
        ]
      });

    } else if (reportType === "BudgetActual") {
      title = "Budget vs. Actual Variance Analysis";
      period = `${startDate} to ${endDate}`;
      const dataRows = await getBudgetVsActual(startDate, endDate);

      const totalBudget = dataRows.reduce((s: number, r: any) => s + r.budget_amount, 0);
      const totalActual = dataRows.reduce((s: number, r: any) => s + r.actual_amount, 0);
      const totalVariance = dataRows.reduce((s: number, r: any) => s + r.variance, 0);

      sections.push({
        headers: ["Category", "Budget", "Actual", "Variance", "%"],
        rows: [
          ...dataRows.map(r => ({ 
            label: r.account_name, 
            value: `${r.budget_amount.toLocaleString()} | ${r.actual_amount.toLocaleString()} | ${r.variance.toLocaleString()} | ${r.variance_percentage.toFixed(1)}%` 
          })),
          { 
            label: "OVERALL TOTALS", 
            value: `${totalBudget.toLocaleString()} | ${totalActual.toLocaleString()} | ${totalVariance.toLocaleString()}`, 
            isGrandTotal: true 
          }
        ]
      });

    } else if (reportType === "Grants") {
      title = "Grant & Donor Utilization";
      period = "Life-to-date";
      const dataRows = await getGrantAndDonorReport(grantId);

      const totals = dataRows.reduce((acc: any, r: any) => {
        acc.recv += Number(r.total_received);
        acc.spent += Number(r.total_spent);
        acc.avail += Number(r.net_available);
        return acc;
      }, { recv: 0, spent: 0, avail: 0 });

      sections.push({
        headers: ["Fund Context", "Received", "Utilized", "Available"],
        rows: [
          ...dataRows.map(r => ({
            label: `${r.grant_name} — ${r.fund_name}`,
            value: `${Number(r.total_received).toLocaleString()} | ${Number(r.total_spent).toLocaleString()} | ${Number(r.net_available).toLocaleString()}`
          })),
          {
            label: "TOTAL FUNDS",
            value: `${totals.recv.toLocaleString()} | ${totals.spent.toLocaleString()} | ${totals.avail.toLocaleString()}`,
            isGrandTotal: true
          }
        ]
      });

    } else {
      return new NextResponse("Unknown AI Report Type", { status: 404 });
    }

    // Since we formatted them cleanly ourselves natively via DB, the AI execution is extraneous.
    // If narration is desired by standard Ozeki flow we will generate it, but we can just skip it if it times out
    let narration = undefined;
    try {
        const flatRows = sections.flatMap(s => s.rows.map(r => ({ item: r.label, val: r.value })));
        narration = await generateFinancialNarration(title, flatRows, { period, organization: orgName });
    } catch { 
        // Fallback gracefully without narration 
    }

    // 3. Prepare explicit structured data
    const reportData: FinancialReportData = {
      title,
      organization: orgName,
      period,
      narration,
      sections
    };

    // 4. Generate PDF natively
    const pdfBuffer = await generateFinancialPdf(reportData);
    const filename = `${reportType}_Report_${new Date().getTime()}.pdf`;

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
