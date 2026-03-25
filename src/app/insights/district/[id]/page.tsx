import { PortalNationalIntelligenceManager } from "@/components/portal/PortalNationalIntelligenceManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";

export const revalidate = 300;

export default async function DistrictInsightsPage(
  context: { params: Promise<{ id: string }> },
) {
  const user = await requirePortalStaffUser();
  const params = await context.params;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/insights"
      title={`District Insights: ${params.id}`}
      description="District-level movement and early warning queue with intervention routing."
    >
      <PortalNationalIntelligenceManager
        currentUser={user}
        defaultTab="insights"
        defaultScopeType="district"
        defaultScopeId={params.id}
      />
    </PortalShell>
  );
}
