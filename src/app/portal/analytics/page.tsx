import { PortalAnalyticsDashboard } from "@/components/portal/PortalAnalyticsDashboard";
import { PortalShell } from "@/components/portal/PortalShell";
import { getImpactExplorerProfiles, getPortalAnalyticsData } from "@/lib/db";
import { requirePortalUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Data Dashboard",
  description:
    "Advanced operations and M&E dashboard tracking every portal submission and engagement stream.",
};

export default async function PortalAnalyticsPage() {
  const user = await requirePortalUser();
  const analytics = getPortalAnalyticsData(user);
  const explorer = getImpactExplorerProfiles();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/analytics"
      title="Data Dashboard"
      description="Unified staff, volunteer, and admin analytics workspace for school, district, region, and country data."
      shellClassName="portal-dashboard-shell"
    >
      <PortalAnalyticsDashboard data={analytics} explorer={explorer} user={user} />
    </PortalShell>
  );
}
