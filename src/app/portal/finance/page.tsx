import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalUserOrRedirect } from "@/lib/auth-server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { 
  getStatementOfFinancialPosition, 
  getStatementOfActivities 
} from "@/lib/server/postgres/repositories/finance-reports";
import { LucideWallet, LucideTrendingUp, LucideFileText, LucideShield } from "lucide-react";

async function FinanceDashboardContent() {
  const fy = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];
  
  // Fetch high-level stats
  const [balanceSheet, pnl] = await Promise.all([
    getStatementOfFinancialPosition(today),
    getStatementOfActivities(`${fy}-01-01`, today)
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card p-4 flex flex-col items-center text-center">
        <LucideWallet className="w-8 h-8 text-blue-600 mb-2" />
        <p className="text-sm font-medium text-gray-500">Total Assets</p>
        <h2 className="text-2xl font-bold">UGX {totalAssets.toLocaleString()}</h2>
      </div>
      
      <div className="card p-4 flex flex-col items-center text-center">
        <LucideTrendingUp className="w-8 h-8 text-green-600 mb-2" />
        <p className="text-sm font-medium text-gray-500">Income (YTD)</p>
        <h2 className="text-2xl font-bold">UGX {totalIncome.toLocaleString()}</h2>
      </div>

      <div className="card p-4 flex flex-col items-center text-center">
        <LucideFileText className="w-8 h-8 text-red-600 mb-2" />
        <p className="text-sm font-medium text-gray-500">Expenses (YTD)</p>
        <h2 className="text-2xl font-bold">UGX {totalExpenses.toLocaleString()}</h2>
      </div>

      <div className="card p-4 flex flex-col items-center text-center">
        <LucideShield className="w-8 h-8 text-indigo-600 mb-2" />
        <p className="text-sm font-medium text-gray-500">Surplus/Deficit</p>
        <h2 className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          UGX {(totalIncome - totalExpenses).toLocaleString()}
        </h2>
      </div>

      <div className="md:col-span-2 card p-6">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="button button-primary">New Donation</button>
          <button className="button button-outline">New Expense</button>
          <button className="button button-outline">Post Payroll</button>
          <button className="button button-outline">Generate Monthly Report</button>
        </div>
      </div>

      <div className="md:col-span-2 card p-6">
        <h3 className="text-lg font-bold mb-4">Module Navigation</h3>
        <ul className="space-y-2">
          <li><a href="/portal/finance/gl" className="text-blue-600 hover:underline">General Ledger & Journal Entries</a></li>
          <li><a href="/portal/finance/grants" className="text-blue-600 hover:underline">Grant Tracking & Utilization</a></li>
          <li><a href="/portal/finance/budgets" className="text-blue-600 hover:underline">Budget Control (Actual vs Budget)</a></li>
          <li><a href="/portal/finance/assets" className="text-blue-600 hover:underline">Fixed Asset Register</a></li>
        </ul>
      </div>
    </div>
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
      <Suspense fallback={<div>Loading financial data...</div>}>
        <FinanceDashboardContent />
      </Suspense>
    </PortalShell>
  );
}
