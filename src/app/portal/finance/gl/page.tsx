import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import { getPortalUserOrRedirect } from "@/lib/auth";
import { getTrialBalance } from "@/lib/server/postgres/repositories/finance-reports";
import { initializeChartOfAccounts } from "@/lib/server/postgres/repositories/finance-v2";

async function TrialBalanceTable() {
  const fy = new Date().getFullYear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trialBalance = await getTrialBalance(fy) as any;

  return (
    <div className="card overflow-hidden p-3">
      <DashboardListHeader template="120px minmax(0,2fr) 140px 140px 140px">
        <span>Code</span>
        <span>Account Name</span>
        <span className="text-right">Debit</span>
        <span className="text-right">Credit</span>
        <span className="text-right">Balance</span>
      </DashboardListHeader>
      {trialBalance.length === 0 ? (
        <div className="p-8 text-center text-gray-500 italic">
          No posted transactions found for FY {fy}.
        </div>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trialBalance.map((row: any) => (
          <DashboardListRow
            key={row.account_code}
            template="120px minmax(0,2fr) 140px 140px 140px"
          >
            <span className="text-sm font-mono">{row.account_code}</span>
            <span className="text-sm truncate">
              <a href={`/portal/finance/gl/account/${row.id}`} className="text-blue-600 hover:underline">
                {row.account_name}
              </a>
            </span>
            <span className="text-sm text-right">{Number(row.total_debit).toLocaleString()}</span>
            <span className="text-sm text-right">{Number(row.total_credit).toLocaleString()}</span>
            <span className="text-sm text-right font-bold">
              {Number(row.balance).toLocaleString()}
            </span>
          </DashboardListRow>
        ))
      )}
    </div>
  );
}

export default async function GeneralLedgerPage() {
  const user = await getPortalUserOrRedirect();
  
  // Ensure we have a COA
  await initializeChartOfAccounts(user.id);

  return (
    <PortalShell 
      user={user} 
      activeHref="/portal/finance" 
      title="General Ledger"
      description="View Chart of Accounts and Trial Balance."
    >
      <div className="mb-6 flex gap-3">
        <button className="button button-outline">Journal Entries</button>
        <button className="button button-outline">Chart of Accounts</button>
        <button className="button button-primary">New Manual Entry</button>
      </div>

      <Suspense fallback={<div>Loading Trial Balance...</div>}>
        <TrialBalanceTable />
      </Suspense>
    </PortalShell>
  );
}
