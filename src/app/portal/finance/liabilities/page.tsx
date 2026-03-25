import { getPortalUserOrRedirect } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalFinanceNav } from "@/components/portal/finance/PortalFinanceNav";
import { PortalFinanceLiabilitiesManager } from "@/components/portal/finance/PortalFinanceLiabilitiesManager";
import { listFinanceLiabilitiesPostgres } from "@/services/financeService";

export default async function FinanceLiabilitiesPage() {
  const user = await getPortalUserOrRedirect();
  const liabilities = await listFinanceLiabilitiesPostgres();

  return (
    <PortalShell user={user} activeHref="/portal/finance" title="Liabilities & Payables">
      <div className="mb-6">
        <PortalFinanceNav activeHref="/portal/finance/liabilities" />
      </div>

      <section className="card">
        <PortalFinanceLiabilitiesManager initialLiabilities={liabilities} />
      </section>
    </PortalShell>
  );
}
