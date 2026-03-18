import { PortalFinanceLedgerManager } from "@/components/portal/finance/PortalFinanceLedgerManager";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { listFinanceLedgerTransactions } from "@/services/financeService";
import { requirePortalFinanceReceiptEditorUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Money In",
  description: "All posted money-in ledger transactions from receipts and invoice payments.",
};

export default async function PortalFinanceMoneyInPage() {
  const user = await requirePortalFinanceReceiptEditorUser();
  const transactions = await listFinanceLedgerTransactions({ txnType: "money_in" });

  return (
    <FinanceShell user={user} activeHref="/portal/finance/money-in" title="Money In">
      <PortalFinanceLedgerManager
        title="Money In Ledger"
        transactions={transactions}
        txnType="money_in"
      />
    </FinanceShell>
  );
}
