import { PortalNationalIntelligenceManager } from "@/components/portal/PortalNationalIntelligenceManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "National Insights",
  description: "National trend movement and early warning dashboard.",
};

export default async function NationalInsightsPage() {
  const user = await requirePortalStaffUser();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/insights"
      title="National Insights"
      description="Aggregated national movement indicators and early warning queue for Uganda."
    >
      <PortalNationalIntelligenceManager
        currentUser={user}
        defaultTab="insights"
        defaultScopeType="country"
        defaultScopeId="Uganda"
      />
    </PortalShell>
  );
}
