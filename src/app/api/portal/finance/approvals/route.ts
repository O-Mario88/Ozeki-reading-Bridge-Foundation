import { NextRequest, NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { listPendingApprovalsForUserPostgres } from "@/lib/server/postgres/repositories/finance-controls";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** User's effective approval roles derived from PortalUser flags. */
function userApprovalRoles(user: { isAdmin: boolean; isSuperAdmin: boolean }): string[] {
  const roles: string[] = [];
  if (user.isSuperAdmin) roles.push("executive_director", "finance_manager", "programme_lead");
  else if (user.isAdmin) roles.push("finance_manager", "programme_lead");
  else roles.push("programme_lead"); // default for staff
  return roles;
}

export async function GET(_req: NextRequest) {
  try {
    const user = await requirePortalUser();
    const roles = userApprovalRoles(user);
    const approvals = await listPendingApprovalsForUserPostgres(user.id, roles);
    return NextResponse.json({ approvals, userRoles: roles });
  } catch (error) {
    logger.error("[finance/approvals] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
