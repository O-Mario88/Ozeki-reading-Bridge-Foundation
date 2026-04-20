import Link from "next/link";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  listPendingApprovalsForUserPostgres,
  listPeriodLocksPostgres,
  getLatestAuditCheckpointPostgres,
  verifyAuditChainPostgres,
} from "@/lib/server/postgres/repositories/finance-controls";
import { FinanceControlsPanel } from "@/components/portal/FinanceControlsPanel";
import { ShieldCheck, ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Internal Controls | Ozeki Finance" };

function userApprovalRoles(user: { isAdmin: boolean; isSuperAdmin: boolean }): string[] {
  if (user.isSuperAdmin) return ["executive_director", "finance_manager", "programme_lead"];
  if (user.isAdmin) return ["finance_manager", "programme_lead"];
  return ["programme_lead"];
}

export default async function FinanceControlsPage() {
  const user = await requirePortalUser();
  const roles = userApprovalRoles(user);

  const [approvals, locks, checkpoint, liveVerify] = await Promise.all([
    listPendingApprovalsForUserPostgres(user.id, roles),
    listPeriodLocksPostgres(),
    getLatestAuditCheckpointPostgres(),
    verifyAuditChainPostgres(),
  ]);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/finance"
      title="Internal Controls"
      description="Approval queue, period locks, and tamper-evident audit chain."
    >
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" />
          Finance overview
        </Link>

        <div className="rounded-2xl bg-gradient-to-br from-[#006b61] to-[#004d46] text-white p-6">
          <div className="flex items-start gap-4">
            <ShieldCheck className="w-10 h-10 text-white/40 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">Segregation of Duties + Audit Chain</p>
              <h2 className="text-xl font-bold mt-1">Institutional-grade finance controls</h2>
              <p className="text-sm text-white/80 mt-2">
                This page is the operational surface for three donor-critical controls:
                multi-tier approval of every expense, period locks that prevent retroactive
                edits, and a tamper-evident audit chain that external auditors can verify
                without database access.
              </p>
            </div>
          </div>
        </div>

        <FinanceControlsPanel
          approvals={approvals}
          locks={locks}
          checkpoint={checkpoint}
          liveVerify={liveVerify}
          userRoles={roles}
          canLockPeriods={user.isSuperAdmin}
        />
      </div>
    </PortalShell>
  );
}
