import { PortalNationalIntelligenceManager } from "@/components/portal/PortalNationalIntelligenceManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export default async function RegionInsightsPage(
  context: { params: Promise<{ id: string }> },
) {
  const user = await requirePortalStaffUser();
  const params = await context.params;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/insights"
      title={`Region Insights: ${params.id}`}
      description="Region-level aggregated trends, drivers, and priority queue."
    >
      <PortalNationalIntelligenceManager
        currentUser={user}
        defaultTab="insights"
        defaultScopeType="region"
        defaultScopeId={params.id}
      />
    </PortalShell>
  );
}
