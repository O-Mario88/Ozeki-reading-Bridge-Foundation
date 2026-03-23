import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { generateFinancialReportPdf } from "@/lib/server/pdf/finance-pdf-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'summary' or 'audit'
    const yearParam = searchParams.get("year");
    
    if (!type || !yearParam) {
      return new NextResponse("Missing type or year parameter", { status: 400 });
    }

    const year = parseInt(yearParam, 10);
    if (isNaN(year)) {
      return new NextResponse("Invalid year format", { status: 400 });
    }

    let reportTitle = "";
    let dataQuery = "";
    let queryParams: (string | number)[] = [];

    if (type === "summary") {
      reportTitle = `Financial Summary Report - FY ${year}`;
      // For summary, we pull Income and Expenses
      dataQuery = `
        SELECT 
          coa.account_code, 
          coa.account_name, 
          SUM(jl.credit - jl.debit) as balance,
          coa.account_type
        FROM finance_journal_lines jl
        JOIN finance_journal_entries je ON jl.journal_id = je.id
        JOIN finance_chart_of_accounts coa ON jl.account_id = coa.id
        WHERE je.status = 'posted' 
          AND EXTRACT(YEAR FROM je.entry_date) = $1
          AND coa.account_type IN ('income', 'expense')
        GROUP BY coa.account_code, coa.account_name, coa.account_type
        ORDER BY coa.account_type DESC, coa.account_code ASC
      `;
      queryParams = [year];
    } else if (type === "audit") {
      reportTitle = `Audited Financial Statement - FY ${year}`;
      // For audit, we pull Assets, Liabilities, Equity, Income, Expenses (Full Trial Balance)
      dataQuery = `
        SELECT 
          coa.account_code, 
          coa.account_name, 
          SUM(jl.debit - jl.credit) as balance,
          coa.account_type
        FROM finance_journal_lines jl
        JOIN finance_journal_entries je ON jl.journal_id = je.id
        JOIN finance_chart_of_accounts coa ON jl.account_id = coa.id
        WHERE je.status = 'posted' 
          AND EXTRACT(YEAR FROM je.entry_date) = $1
        GROUP BY coa.account_code, coa.account_name, coa.account_type
        ORDER BY coa.account_type ASC, coa.account_code ASC
      `;
      queryParams = [year];
    } else {
      return new NextResponse("Unknown report type", { status: 400 });
    }

    // Execute aggregation directly from the operational ledger
    const dbRes = await queryPostgres(dataQuery, queryParams);

    // Format for the internal Ozeki PDF engine
    // Note: PDF library generateFinancialReportPdf expects `data` array with `account_code`, `account_name`, `balance`
    const formattedData = dbRes.rows.map(row => {
      // Income and liabilities are naturally credit balances. Expenses and assets are naturally debit balances.
      // We force 'balance' to be an absolute display number for standard readable P&L or Statements.
      return {
        account_code: row.account_code,
        account_name: row.account_name,
        balance: Math.abs(Number(row.balance))
      };
    });

    // If zero records found for the entire fiscal year, we'll indicate an empty ledger
    if (formattedData.length === 0) {
      formattedData.push({
        account_code: "N/A",
        account_name: "No financial activity recorded for this period.",
        balance: 0
      });
    }

    // Generate PDF stream using standard Ozeki templates
    const pdfBuffer = await generateFinancialReportPdf(reportTitle, formattedData);

    const filename = `Ozeki_${type === "summary" ? "Financial_Summary" : "Audited_Statement"}_${year}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    console.error("PDF generation failed:", err);
    return new NextResponse("Internal Server Error generating PDF", { status: 500 });
  }
}
