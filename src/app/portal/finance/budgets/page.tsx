import { PortalFinanceBudgetManager } from "@/components/portal/finance/PortalFinanceBudgetManager";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { listMonthlyBudgets } from "@/lib/finance-db";
import { requirePortalSuperAdminUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Budgets",
    description: "Expense budgets by subcategory and Budget vs Actual variance analysis.",
};

export default async function PortalFinanceBudgetsPage() {
    const user = await requirePortalSuperAdminUser();
    const month = new Date().toISOString().slice(0, 7);
    const budgets = listMonthlyBudgets(month, "UGX");

    return (
        <FinanceShell user={user} activeHref="/portal/finance/budgets" title="Budgets">
            <PortalFinanceBudgetManager initialBudgets={budgets} />
        </FinanceShell>
    );
}
