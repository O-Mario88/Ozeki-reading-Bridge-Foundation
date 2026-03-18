import { PortalFinanceReconciliationManager } from "@/components/portal/finance/PortalFinanceReconciliationManager";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { listStatementLines, listFinanceLedgerTransactions } from "@/services/financeService";
import { requirePortalFinanceReceiptEditorUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Reconciliation",
    description: "Match bank, cash, and mobile money statements to ledger transactions.",
};

export default async function PortalFinanceReconciliationPage() {
    const user = await requirePortalFinanceReceiptEditorUser();
    const lines = await listStatementLines();
    const ledger = await listFinanceLedgerTransactions({});

    return (
        <FinanceShell user={user} activeHref="/portal/finance/reconciliation" title="Reconciliation">
            <PortalFinanceReconciliationManager initialLines={lines} initialLedger={ledger} />
        </FinanceShell>
    );
}
