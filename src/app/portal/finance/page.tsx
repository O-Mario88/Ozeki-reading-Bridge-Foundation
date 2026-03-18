import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalUserOrRedirect } from "@/lib/auth-server";
import { 
  getStatementOfFinancialPosition, 
  getStatementOfActivities 
} from "@/lib/server/postgres/repositories/finance-reports";
import { 
  getFinanceDashboardSummaryPostgres,
  listFinanceInvoicesPostgres,
  listFinanceReceiptsPostgres,
  listFinanceExpensesPostgres
} from "@/lib/server/postgres/repositories/finance";
import { PortalFinanceDashboard } from "@/components/portal/finance/PortalFinanceDashboard";

async function FinanceDashboardContent() {
  const fy = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];
  const firstDayOfYear = `${fy}-01-01`;
  
  // Fetch high-level stats AND layout tables concurrently
  const [
    balanceSheet, 
    pnl,
    dbSummary,
    recentInvoices,
    recentReceipts,
    recentExpenses
  ] = await Promise.all([
    getStatementOfFinancialPosition(today),
    getStatementOfActivities(firstDayOfYear, today),
    getFinanceDashboardSummaryPostgres(new Date().toISOString().slice(0, 7), "UGX"),
    listFinanceInvoicesPostgres(),
    listFinanceReceiptsPostgres(),
    listFinanceExpensesPostgres()
  ]);

  const totalAssets = balanceSheet
    .filter(r => r.account_type === 'asset')
    .reduce((sum, r) => sum + Number(r.balance), 0);
    
  const totalIncome = pnl
    .filter(r => r.account_type === 'income')
    .reduce((sum, r) => sum + Number(r.net_amount), 0);
    
  const totalExpenses = pnl
    .filter(r => r.account_type === 'expense')
    .reduce((sum, r) => sum + Math.abs(Number(r.net_amount)), 0);

  // Rebuild the summary injecting the live strict YTD numbers from the GL
  const injectedSummary = {
    ...dbSummary,
    moneyIn: totalIncome,
    moneyOut: totalExpenses,
    net: totalIncome - totalExpenses
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
    <PortalShell 
      user={user} 
      activeHref="/portal/finance" 
      title="Financial Management"
      description="Fund accounting, budgeting, and financial reporting center."
    >
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading accurate financial metrics...</div>}>
        <FinanceDashboardContent />
      </Suspense>
    </PortalShell>
  );
}
