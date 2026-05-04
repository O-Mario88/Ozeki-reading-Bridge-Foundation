import { redirect } from "next/navigation";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { AuditTrailViewer } from "@/components/portal/admin/AuditTrailViewer";

/**
 * Audit-trail viewer at /portal/auditor/audit-trail.
 *
 * Mirrors the existing /portal/admin/audit-trail page so auditor-role
 * users (anyone with isAdmin or isSuperAdmin) reach the same viewer at
 * the path the Plan calls out. Same component, same role gate, same
 * data — different URL.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Trail | Ozeki Auditor" };

export default async function AuditorAuditTrailPage() {
  const user = await requirePortalUser();
  if (!user.isAdmin && !user.isSuperAdmin) {
    redirect("/portal/dashboard");
  }

  return (
    <PortalShell
      user={user}
      activeHref="/portal/auditor/audit-trail"
      title="Audit Trail"
      description="Every privileged action recorded — who, what, when, and from where."
    >
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AuditTrailViewer />
      </div>
    </PortalShell>
  );
}
