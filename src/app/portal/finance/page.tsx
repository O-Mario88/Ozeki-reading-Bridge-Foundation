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

async function FinanceDashboardContent() {
  const fy = new Date().getFullYear();
  const firstDayOfYear = `${fy}-01-01`;
  const today = new Date().toISOString().split("T")[0];
  
  // Fetch everything concurrently
  const [
    dbSummary,
    ytdTotals,
    recentInvoices,
    recentReceipts,
    recentExpenses
  ] = await Promise.all([
    getFinanceDashboardSummaryPostgres(new Date().toISOString().slice(0, 7), "UGX"),

    // YTD income & expenses from the actual ledger
    queryPostgres(
      `SELECT
        COALESCE(SUM(CASE WHEN txn_type = 'money_in' THEN amount ELSE 0 END), 0) AS "incomeYtd",
        COALESCE(SUM(CASE WHEN txn_type = 'money_out' THEN amount ELSE 0 END), 0) AS "expensesYtd"
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND currency = 'UGX'
        AND date >= $1
        AND date <= $2`,
      [firstDayOfYear, today],
    ),

    listFinanceInvoicesPostgres(),
    listFinanceReceiptsPostgres(),
    listFinanceExpensesPostgres()
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

  // Inject the YTD numbers so the dashboard shows real data
  const injectedSummary = {
    ...dbSummary,
    moneyIn: incomeYtd,
    moneyOut: expensesYtd,
    net: incomeYtd - expensesYtd
  };

  return (
    <PortalFinanceDashboard
      summary={injectedSummary}
      totalAssets={totalAssets}
      recentInvoices={recentInvoices.slice(0, 10)}
      recentReceipts={recentReceipts.slice(0, 10)}
      recentExpenses={recentExpenses.slice(0, 10)}
    />
  );
}

export default async function FinancePage() {
  const user = await getPortalUserOrRedirect();
  
  return (
    <FinanceShell 
      user={user} 
      activeHref="/portal/finance" 
      title="Finance Workspace"
    >
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading accurate financial metrics...</div>}>
        <FinanceDashboardContent />
      </Suspense>
    </FinanceShell>
  );
}
