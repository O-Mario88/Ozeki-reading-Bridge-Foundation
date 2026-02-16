import { PortalDashboardClient } from "@/components/portal/PortalDashboardClient";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalDashboardData } from "@/lib/db";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff Dashboard",
  description:
    "Operations and M&E dashboard for trainings, visits, assessments, and 1001 Story follow-ups.",
};

export default async function PortalDashboardPage() {
  const user = await requirePortalStaffUser();
  const dashboard = getPortalDashboardData(user);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/dashboard"
      title="Staff Dashboard"
      description="Track weekly operations, pending follow-ups, and recent submissions."
      shellClassName="portal-dashboard-shell"
    >
      <PortalDashboardClient dashboard={dashboard} />
    </PortalShell>
  );
}
