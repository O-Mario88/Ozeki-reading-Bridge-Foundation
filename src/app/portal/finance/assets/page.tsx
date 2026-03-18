import { getPortalUserOrRedirect } from "@/lib/auth-server";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalFinanceNav } from "@/components/portal/finance/PortalFinanceNav";
import { PortalFinanceAssetsManager } from "@/components/portal/finance/PortalFinanceAssetsManager";
import { listFinanceAssetsPostgres } from "@/services/financeService";

export default async function FinanceAssetsPage() {
  const user = await getPortalUserOrRedirect();
  const assets = await listFinanceAssetsPostgres();

  return (
    <PortalShell user={user} activeHref="/portal/finance" title="Fixed Assets">
      <div className="mb-6">
        <PortalFinanceNav activeHref="/portal/finance/assets" />
      </div>

      <section className="card">
        <PortalFinanceAssetsManager initialAssets={assets} />
      </section>
    </PortalShell>
  );
}
