import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalOperationalReportsData } from "@/lib/db";
import { requirePortalUser, getPortalHomePath } from "@/lib/portal-auth";
import { redirect } from "next/navigation";
import { PortalOperationsReportsWorkspace } from "@/components/portal/PortalOperationsReportsWorkspace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reports",
  description:
    "School operations reporting workspace for schools, contacts, trainings, visits, and assessments.",
};

export default async function PortalReportsPage() {
  const user = await requirePortalUser();
  const hasAccess =
    user.role === "Volunteer" ||
    user.role === "Staff" ||
    user.role === "Admin" ||
    user.isAdmin ||
    user.isSuperAdmin;

  if (!hasAccess) {
    redirect(getPortalHomePath(user));
  }

  const reportsData = getPortalOperationalReportsData(user);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/reports"
      title="Reports"
      description="Operational reporting workspace for schools, contacts, trainings, visits, and teacher + learner assessments."
    >
      <div className="portal-grid">
        <PortalOperationsReportsWorkspace data={reportsData} user={user} />
      </div>
    </PortalShell>
  );
}
