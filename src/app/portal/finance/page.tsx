import { PortalFinanceDashboard } from "@/components/portal/finance/PortalFinanceDashboard";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import {
  getFinanceDashboardSummary,
  listFinanceExpenses,
  listFinanceInvoices,
  listFinanceReceipts,
} from "@/lib/finance-db";
import { requirePortalSuperAdminUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finance Dashboard",
  description: "Super Admin financial overview (money in, money out, outstanding invoices).",
};

export default async function PortalFinanceDashboardPage() {
  const user = await requirePortalSuperAdminUser();
  const summary = getFinanceDashboardSummary();
  const recentInvoices = listFinanceInvoices().slice(0, 8);
  const recentReceipts = listFinanceReceipts().slice(0, 8);
  const recentExpenses = listFinanceExpenses().slice(0, 8);

  return (
    <FinanceShell user={user} activeHref="/portal/finance" title="Dashboard">
      <PortalFinanceDashboard
        summary={summary}
        recentInvoices={recentInvoices}
        recentReceipts={recentReceipts}
        recentExpenses={recentExpenses}
      />
    </FinanceShell>
  );
}
