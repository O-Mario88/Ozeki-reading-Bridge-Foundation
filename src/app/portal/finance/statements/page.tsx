import { PortalShell } from "@/components/portal/PortalShell";
import FinanceReportsView from "@/components/portal/finance/FinanceReportsView";
import { requirePortalFinanceReceiptEditorUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Financial Statements & Analytics",
  description: "Generate professional financial reports with automated AI narration and variance analysis.",
};

export default async function PortalFinanceStatementsPage() {
  const user = await requirePortalFinanceReceiptEditorUser();

  return (
    <PortalShell 
      user={user} 
      activeHref="/portal/finance/statements" 
      title="Financial Statements & AI Analytics"
      description="Select a report type to generate a governed PDF export including automated narration."
    >
      <FinanceReportsView user={user} />
    </PortalShell>
  );
}
