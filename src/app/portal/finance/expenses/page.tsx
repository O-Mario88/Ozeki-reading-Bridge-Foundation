import { PortalFinanceExpensesManager } from "@/components/portal/finance/PortalFinanceExpensesManager";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { listFinanceExpenses } from "@/services/financeService";
import { requirePortalFinanceReceiptEditorUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Expenses",
  description: "Draft, evidence, and post operational expenses.",
};

export default async function PortalFinanceExpensesPage() {
  const user = await requirePortalFinanceReceiptEditorUser();
  const expenses = await listFinanceExpenses();

  return (
    <FinanceShell user={user} activeHref="/portal/finance/expenses" title="Expenses">
      <PortalFinanceExpensesManager initialExpenses={expenses} />
    </FinanceShell>
  );
}
