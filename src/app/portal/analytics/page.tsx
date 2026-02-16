import { PortalAnalyticsDashboard } from "@/components/portal/PortalAnalyticsDashboard";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalAnalyticsData } from "@/lib/db";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Data Dashboard",
  description:
    "Advanced operations and M&E dashboard tracking every portal submission and engagement stream.",
};

export default async function PortalAnalyticsPage() {
  const user = await requirePortalStaffUser();
  const analytics = getPortalAnalyticsData(user);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/analytics"
      title="Data Dashboard"
      description="A high-resolution view of all entered data: records, participants, evidence, testimonials, and engagement."
      shellClassName="portal-dashboard-shell"
    >
      <PortalAnalyticsDashboard data={analytics} />
    </PortalShell>
  );
}
