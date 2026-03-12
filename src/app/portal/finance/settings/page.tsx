import { PortalFinanceSettingsManager } from "@/components/portal/finance/PortalFinanceSettingsManager";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { getFinanceSettings } from "@/lib/finance-db";
import { requirePortalSuperAdminUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finance Settings",
  description: "Configure finance prefixes and email templates.",
};

export default async function PortalFinanceSettingsPage() {
  const user = await requirePortalSuperAdminUser();
  const settings = await getFinanceSettings();

  return (
    <FinanceShell user={user} activeHref="/portal/finance/settings" title="Settings">
      <PortalFinanceSettingsManager initialSettings={settings} />
    </FinanceShell>
  );
}
