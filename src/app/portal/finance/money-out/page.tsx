import { PortalFinanceExpensesManager } from "@/components/portal/finance/PortalFinanceExpensesManager";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { listFinanceExpenses } from "@/services/financeService";
import { requirePortalFinanceReceiptEditorUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Money Out (Expenses)",
  description: "Draft, evidence, and post operational expenses.",
};

export default async function PortalFinanceMoneyOutPage() {
  const user = await requirePortalFinanceReceiptEditorUser();
  const expenses = await listFinanceExpenses();

  return (
    <FinanceShell user={user} activeHref="/portal/finance/money-out" title="Money Out">
      <PortalFinanceExpensesManager initialExpenses={expenses} />
    </FinanceShell>
  );
}
