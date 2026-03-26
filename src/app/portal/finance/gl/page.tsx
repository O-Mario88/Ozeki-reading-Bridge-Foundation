import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalUserOrRedirect } from "@/lib/auth";
import { getTrialBalance } from "@/lib/server/postgres/repositories/finance-reports";
import { initializeChartOfAccounts } from "@/lib/server/postgres/repositories/finance-v2";

async function TrialBalanceTable() {
  const fy = new Date().getFullYear();
  const trialBalance = await getTrialBalance(fy);

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="p-3 font-bold text-sm">Code</th>
            <th className="p-3 font-bold text-sm">Account Name</th>
            <th className="p-3 font-bold text-sm text-right">Debit</th>
            <th className="p-3 font-bold text-sm text-right">Credit</th>
            <th className="p-3 font-bold text-sm text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {trialBalance.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                No posted transactions found for FY {fy}.
              </td>
            </tr>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            trialBalance.map((row: any) => (
              <tr key={row.account_code} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-mono">{row.account_code}</td>
                <td className="p-3 text-sm">
                  <a href={`/portal/finance/gl/account/${row.id}`} className="text-blue-600 hover:underline">
                    {row.account_name}
                  </a>
                </td>
                <td className="p-3 text-sm text-right">{Number(row.total_debit).toLocaleString()}</td>
                <td className="p-3 text-sm text-right">{Number(row.total_credit).toLocaleString()}</td>
                <td className="p-3 text-sm text-right font-bold">
                  {Number(row.balance).toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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
