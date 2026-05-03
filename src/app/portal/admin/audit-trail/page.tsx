import { redirect } from "next/navigation";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { AuditTrailViewer } from "@/components/portal/admin/AuditTrailViewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Trail | Ozeki Admin" };

export default async function AuditTrailAdminPage() {
  const user = await requirePortalUser();
  if (!user.isAdmin && !user.isSuperAdmin) {
    redirect("/portal/dashboard");
  }

  return (
    <PortalShell
      user={user}
      activeHref="/portal/admin/audit-trail"
      title="Audit Trail"
      description="Every privileged action recorded — who, what, when, from where"
    >
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AuditTrailViewer />
      </div>
    </PortalShell>
  );
}
