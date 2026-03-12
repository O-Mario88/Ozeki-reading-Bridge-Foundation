import { PortalUserAdminManager } from "@/components/portal/PortalUserAdminManager";
import { DataManagementPanel } from "@/components/portal/DataManagementPanel";
import { GeoSyncPanel } from "@/components/portal/GeoSyncPanel";
import { PortalGraduationSettingsManager } from "@/components/portal/PortalGraduationSettingsManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { getGraduationSettings, listPortalUsersForAdmin } from "@/lib/db";
import { requirePortalSuperAdminUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Super Admin",
  description: "Manage portal users, permissions, and account access.",
};

export default async function PortalSuperAdminPage() {
  const user = await requirePortalSuperAdminUser();
  const users = listPortalUsersForAdmin(user);
  const graduationSettings = getGraduationSettings();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/superadmin"
      title="Super Admin Dashboard"
      description="Manage staff and volunteer access, role flags, and permission levels."
    >
      <PortalUserAdminManager initialUsers={users} />
      <PortalGraduationSettingsManager initialSettings={graduationSettings} />
      <GeoSyncPanel />
      <DataManagementPanel />
    </PortalShell>
  );
}
