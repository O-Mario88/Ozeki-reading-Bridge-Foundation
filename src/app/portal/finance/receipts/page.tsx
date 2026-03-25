import { PortalFinanceReceiptsManager } from "@/components/portal/finance/PortalFinanceReceiptsManager";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { listFinanceContacts, listFinanceReceipts, listFinanceInvoices } from "@/services/financeService";
import { requirePortalFinanceReceiptEditorUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finance Receipts",
  description: "Issue and manage official receipts for received payments.",
};

export default async function PortalFinanceReceiptsPage() {
  const user = await requirePortalFinanceReceiptEditorUser();
  const receipts = await listFinanceReceipts();
  const contacts = await listFinanceContacts();
  const invoices = await listFinanceInvoices();

  return (
    <FinanceShell user={user} activeHref="/portal/finance/receipts" title="Receipts">
      <PortalFinanceReceiptsManager
        initialReceipts={receipts}
        contacts={contacts}
        invoices={invoices}
      />
    </FinanceShell>
  );
}
