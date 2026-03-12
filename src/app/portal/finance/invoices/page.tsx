import { PortalFinanceInvoicesManager } from "@/components/portal/finance/PortalFinanceInvoicesManager";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { listFinanceContacts, listFinanceInvoices } from "@/lib/finance-db";
import { requirePortalFinanceReceiptEditorUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finance Invoices",
  description: "Create, send, and track invoice collections.",
};

export default async function PortalFinanceInvoicesPage() {
  const user = await requirePortalFinanceReceiptEditorUser();
  const invoices = await listFinanceInvoices();
  const contacts = await listFinanceContacts();

  return (
    <FinanceShell user={user} activeHref="/portal/finance/invoices" title="Invoices">
      <PortalFinanceInvoicesManager initialInvoices={invoices} initialContacts={contacts} />
    </FinanceShell>
  );
}
