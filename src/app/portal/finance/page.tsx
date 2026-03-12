import { PortalFinanceDashboard } from "@/components/portal/finance/PortalFinanceDashboard";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import {
  getFinanceDashboardSummary,
  listFinanceExpenses,
  listFinanceInvoices,
  listFinanceReceipts,
} from "@/lib/finance-db";
import { requirePortalFinanceReceiptEditorUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finance Dashboard",
  description: "Super Admin financial overview (money in, money out, outstanding invoices).",
};

export default async function PortalFinanceDashboardPage() {
  const user = await requirePortalFinanceReceiptEditorUser();
  const summary = await getFinanceDashboardSummary();
  const recentInvoices = (await listFinanceInvoices()).slice(0, 8);
  const recentReceipts = (await listFinanceReceipts()).slice(0, 8);
  const recentExpenses = (await listFinanceExpenses()).slice(0, 8);

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
