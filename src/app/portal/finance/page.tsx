import { Suspense } from "react";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { getPortalUserOrRedirect } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { 
  getFinanceDashboardSummaryPostgres,
  listFinanceInvoicesPostgres,
  listFinanceReceiptsPostgres,
  listFinanceExpensesPostgres
} from "@/lib/server/postgres/repositories/finance";
import { PortalFinanceDashboard } from "@/components/portal/finance/PortalFinanceDashboard";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

async function FinanceDashboardContent({ period }: { period: string }) {
  const todayDate = new Date();
  const today = todayDate.toISOString().split("T")[0];
  
  let startDate = "1970-01-01";
  
  if (period === "week") {
    const past = new Date(todayDate);
    past.setDate(past.getDate() - 7);
    startDate = past.toISOString().split("T")[0];
  } else if (period === "month") {
    startDate = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-01`;
  } else if (period === "fy") {
    startDate = `${todayDate.getFullYear()}-01-01`;
  } else if (period === "all") {
    startDate = "1970-01-01";
  } else {
    // Default to FY
    period = "fy";
    startDate = `${todayDate.getFullYear()}-01-01`;
  }

  // Fetch everything concurrently
  const [
    dbSummary,
    ytdTotals,
    recentInvoices,
    recentReceipts,
    recentExpenses,
    budgetStats
  ] = await Promise.all([
    getFinanceDashboardSummaryPostgres(new Date().toISOString().slice(0, 7), "UGX"),

    // Income & expenses from the actual ledger governed by the selected period
    queryPostgres(
      `SELECT
        COALESCE(SUM(CASE WHEN txn_type = 'money_in' THEN amount ELSE 0 END), 0) AS "incomeYtd",
        COALESCE(SUM(CASE WHEN txn_type = 'money_out' THEN amount ELSE 0 END), 0) AS "expensesYtd"
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND currency = 'UGX'
        AND date >= $1
        AND date <= $2`,
      [startDate, today],
    ),

    listFinanceInvoicesPostgres(),
    listFinanceReceiptsPostgres(),
    listFinanceExpensesPostgres(),
    
    // Aggregation for the new budget metrics
    queryPostgres(
      `SELECT 
         COALESCE(SUM(CASE WHEN status IN ('submitted', 'under_review') THEN requested_amount ELSE 0 END), 0) as pending,
         COALESCE(SUM(approved_amount - spent_amount), 0) as committed
       FROM finance_operation_budgets
       WHERE status NOT IN ('draft', 'closed', 'rejected')`
    )
  ]);

  const ytdRow = ytdTotals.rows[0] as Record<string, unknown> | undefined;
  const incomeYtd = Number(ytdRow?.incomeYtd ?? 0);
  const expensesYtd = Number(ytdRow?.expensesYtd ?? 0);

  // Total Assets = all-time net cash position (total money in - total money out)
  let totalAssets = 0;
  try {
    const assetsResult = await queryPostgres(
      `SELECT
        COALESCE(SUM(CASE WHEN txn_type = 'money_in' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN txn_type = 'money_out' THEN amount ELSE 0 END), 0) AS "netAssets"
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND currency = 'UGX'`,
    );
    totalAssets = Number((assetsResult.rows[0] as Record<string, unknown>)?.netAssets ?? 0);
  } catch { /* fallback to 0 */ }

  const pendingFunds = Number(budgetStats.rows[0]?.pending || 0);
  const committedFunds = Number(budgetStats.rows[0]?.committed || 0);
  const availableBalance = totalAssets - committedFunds;

  // Inject the period's numbers so the dashboard shows period data natively
  const injectedSummary = {
    ...dbSummary,
    moneyIn: incomeYtd,
    moneyOut: expensesYtd,
    net: incomeYtd - expensesYtd,
    pendingFunds,
    committedFunds,
    availableBalance
  };

  return (
    <PortalFinanceDashboard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      summary={injectedSummary as any}
      totalAssets={totalAssets}
      recentInvoices={recentInvoices.slice(0, 10)}
      recentReceipts={recentReceipts.slice(0, 10)}
      recentExpenses={recentExpenses.slice(0, 10)}
      period={period}
      startDate={startDate}
    />
  );
}

export default async function FinancePage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const user = await getPortalUserOrRedirect();
  const period = typeof searchParams.period === "string" ? searchParams.period : "fy";
  
  return (
    <FinanceShell 
      user={user} 
      activeHref="/portal/finance" 
      title="Finance Workspace"
    >
      <Suspense key={period} fallback={<div className="p-8 text-center text-gray-500">Loading accurate financial metrics...</div>}>
        <FinanceDashboardContent period={period} />
      </Suspense>
    </FinanceShell>
  );
}
