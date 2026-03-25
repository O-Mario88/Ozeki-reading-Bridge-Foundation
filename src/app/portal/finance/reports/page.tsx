import { getPortalUserOrRedirect } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalFinanceNav } from "@/components/portal/finance/PortalFinanceNav";
import { PortalFinanceReportsHub } from "@/components/portal/finance/PortalFinanceReportsHub";

export default async function FinanceReportsPage() {
  const user = await getPortalUserOrRedirect();

  return (
    <PortalShell user={user} activeHref="/portal/finance" title="Financial Reports (NGO Core)">
      <div className="mb-6">
        <PortalFinanceNav activeHref="/portal/finance/reports" />
      </div>

      <PortalFinanceReportsHub />
    </PortalShell>
  );
}
