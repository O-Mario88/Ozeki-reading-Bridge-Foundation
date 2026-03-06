import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { PortalFinanceAuditCenterManager } from "@/components/portal/finance/PortalFinanceAuditCenterManager";
import {
  listFinanceAuditComplianceChecks,
  listFinanceAuditExceptions,
  listFinanceHighRiskTransactions,
  listFinanceReceiptRegistry,
} from "@/lib/finance-db";
import { requirePortalFinanceReceiptEditorUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finance Audit Center",
  description: "Internal rule-based finance checks, exception workflow, and receipt registry.",
};

export default async function PortalFinanceAuditCenterPage() {
  const user = await requirePortalFinanceReceiptEditorUser();
  const exceptions = listFinanceAuditExceptions({ status: "open" });
  const receiptRegistry = listFinanceReceiptRegistry();
  const riskItems = listFinanceHighRiskTransactions(30);
  const complianceChecks = listFinanceAuditComplianceChecks();

  return (
    <FinanceShell user={user} activeHref="/portal/finance/audit-center" title="Audit Center">
      <PortalFinanceAuditCenterManager
        initialExceptions={exceptions}
        initialReceiptRegistry={receiptRegistry}
        initialRiskItems={riskItems}
        initialComplianceChecks={complianceChecks}
        canOverride={Boolean(user.isSuperAdmin)}
      />
    </FinanceShell>
  );
}
