import { PortalDashboardClient } from "@/components/portal/PortalDashboardClient";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalDashboardData, listPortalRecords } from "@/lib/db";
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { buildPerformanceCascade } from "@/lib/performance-utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff Dashboard",
  description:
    "Operations and M&E dashboard for trainings, visits, assessments, and 1001 Story follow-ups.",
};

export default async function PortalDashboardPage() {
  const user = await requirePortalStaffUser();
  const dashboard = getPortalDashboardData(user);

  // Fetch all assessment records to build the performance scorecard
  const assessments = listPortalRecords({ module: "assessment" }, user);
  const performanceData = buildPerformanceCascade(assessments);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/dashboard"
      title="Staff Dashboard"
      description="Track weekly operations, pending follow-ups, and recent submissions."
      shellClassName="portal-dashboard-shell"
    >
      <PortalDashboardClient dashboard={dashboard} performanceData={performanceData} />
    </PortalShell>
  );
}
