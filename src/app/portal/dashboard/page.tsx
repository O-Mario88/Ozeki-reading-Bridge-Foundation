import { PortalDashboardClient } from "@/components/portal/PortalDashboardClient";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalDashboardData, getPerformanceCascadeData } from "@/services/dataService";
import { requirePortalStaffUser } from "@/lib/auth";
import { buildPerformanceCascadeFromRows } from "@/lib/performance-utils";
import { ObservationsDashboardWidget } from "@/components/portal/ObservationsDashboardWidget";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff Dashboard",
  description:
    "Operations and M&E dashboard for trainings, visits, assessments, and 1001 Story follow-ups.",
};

export default async function PortalDashboardPage() {
  const user = await requirePortalStaffUser();

  // Fetch dashboard KPIs and performance cascade data in parallel
  const [dashboard, cascadeRows] = await Promise.all([
    getPortalDashboardData(user),
    getPerformanceCascadeData(),
  ]);

  const performanceData = buildPerformanceCascadeFromRows(cascadeRows);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/dashboard"
      title="Staff Dashboard"
      description="Track weekly operations, pending follow-ups, and recent submissions."
      shellClassName="portal-dashboard-shell"
    >
      <PortalDashboardClient dashboard={dashboard} performanceData={performanceData} />
      <div className="px-4 pb-6 max-w-sm">
        <ObservationsDashboardWidget />
      </div>
    </PortalShell>
  );
}
