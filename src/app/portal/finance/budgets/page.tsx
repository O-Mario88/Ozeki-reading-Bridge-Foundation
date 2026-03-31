import { PortalFinanceBudgetManager } from "@/components/portal/finance/PortalFinanceBudgetManager";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { requirePortalFinanceReceiptEditorUser } from "@/lib/auth";
import { listFinanceOperationBudgetsPostgres } from "@/lib/server/postgres/repositories/finance-budgets";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Budgets & Planning",
    description: "Operational budgets and fund requests workspace.",
};

export default async function PortalFinanceBudgetsPage() {
    const user = await requirePortalFinanceReceiptEditorUser();
    // Default fetch everything. In production, we might filter by owner or status.
    const budgets = await listFinanceOperationBudgetsPostgres();

    return (
        <FinanceShell user={user} activeHref="/portal/finance/budgets" title="Budgets & Planning">
            <PortalFinanceBudgetManager initialBudgets={budgets} currentUser={user} />
        </FinanceShell>
    );
}
