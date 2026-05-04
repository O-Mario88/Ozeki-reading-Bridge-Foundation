import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalSuperAdminUser } from "@/lib/auth";
import { listAuditInvitesPostgres } from "@/lib/server/postgres/repositories/audit-invites";
import { AuditInviteManager } from "@/components/portal/superadmin/AuditInviteManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit Invites · Super Admin",
  description: "Issue time-limited invite tokens to third-party auditors.",
};

export default async function PortalAuditInvitesPage() {
  const user = await requirePortalSuperAdminUser();
  const invites = await listAuditInvitesPostgres(200);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/superadmin"
      title="Audit Invites"
      description="Issue read-only audit-portal access to a third-party reviewer. Each invite is single-use and time-bounded."
    >
      <AuditInviteManager initialInvites={invites} />
    </PortalShell>
  );
}
