import { PortalFinanceStatementsManager } from "@/components/portal/finance/PortalFinanceStatementsManager";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { listFinanceMonthlyStatements } from "@/lib/finance-db";
import { requirePortalSuperAdminUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finance Statements",
  description: "Generate and export monthly, quarterly, and fiscal year finance statements.",
};

export default async function PortalFinanceStatementsPage() {
  const user = await requirePortalSuperAdminUser();
  const statements = listFinanceMonthlyStatements();

  return (
    <FinanceShell user={user} activeHref="/portal/finance/statements" title="Financial Statements">
      <PortalFinanceStatementsManager initialStatements={statements} />
    </FinanceShell>
  );
}
