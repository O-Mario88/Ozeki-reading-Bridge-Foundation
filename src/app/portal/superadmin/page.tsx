import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PortalUserAdminManager } from "@/components/portal/PortalUserAdminManager";
import { DataManagementPanel } from "@/components/portal/DataManagementPanel";
import { GeoSyncPanel } from "@/components/portal/GeoSyncPanel";
import { PortalGraduationSettingsManager } from "@/components/portal/PortalGraduationSettingsManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { getGraduationSettings, listPortalUsersForAdmin } from "@/services/dataService";
import { requirePortalSuperAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Super Admin",
  description: "Manage portal users, permissions, and account access.",
};

export default async function PortalSuperAdminPage() {
  const user = await requirePortalSuperAdminUser();
  const users = await listPortalUsersForAdmin(user) as unknown as import("@/lib/types").PortalUserAdminRecord[];
  const graduationSettings = (await getGraduationSettings()) ?? {} as unknown as import("@/lib/types").GraduationSettingsRecord;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/superadmin"
      title="Super Admin Dashboard"
      description="Manage staff and volunteer access, role flags, and permission levels."
    >
      <div className="rounded-2xl bg-white border border-gray-100 p-5 mb-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#066a67]/10 p-2.5 text-[#066a67]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Third-party audit access</p>
            <p className="text-xs text-gray-500 mt-0.5">Issue read-only audit-portal sessions to outside reviewers.</p>
          </div>
        </div>
        <Link href="/portal/superadmin/audit-invites" className="px-4 py-2 rounded-xl bg-[#066a67] text-white text-xs font-bold hover:bg-[#066a67]/90">
          Manage invites
        </Link>
      </div>

      <PortalUserAdminManager initialUsers={users} />
      <PortalGraduationSettingsManager initialSettings={graduationSettings} />
      <GeoSyncPanel />
      <DataManagementPanel />
    </PortalShell>
  );
}
