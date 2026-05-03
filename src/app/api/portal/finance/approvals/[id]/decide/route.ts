import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import {
  decideApprovalPostgres,
  ApprovalSelfApprovalError,
  ApprovalOutOfOrderError,
  ApprovalNotAuthorizedError,
} from "@/lib/server/postgres/repositories/finance-controls";
import { logger } from "@/lib/logger";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(2000).nullable().optional(),
});

function userApprovalRoles(user: { isAdmin: boolean; isSuperAdmin: boolean }): string[] {
  const roles: string[] = [];
  if (user.isSuperAdmin) roles.push("executive_director", "finance_manager", "programme_lead");
  else if (user.isAdmin) roles.push("finance_manager", "programme_lead");
  else roles.push("programme_lead");
  return roles;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { id } = await params;
    const parsed = schema.parse(await req.json());

    const result = await decideApprovalPostgres({
      approvalId: Number(id),
      approverUserId: user.id,
      approverRoles: userApprovalRoles(user),
      decision: parsed.decision,
      notes: parsed.notes ?? null,
    });
    await auditLog({
      actor: user,
      action: parsed.decision === "approved" ? "approve" : "reject",
      targetTable: "finance_approvals",
      targetId: Number(id),
      detail: parsed.notes ?? `${parsed.decision} via approvals workflow`,
      after: { decision: parsed.decision },
      request: req,
    });
    return NextResponse.json({ ok: true, approval: result });
  } catch (error) {
    if (error instanceof ApprovalSelfApprovalError) {
      return NextResponse.json({ error: "sod_violation", message: error.message }, { status: 403 });
    }
    if (error instanceof ApprovalOutOfOrderError) {
      return NextResponse.json({ error: "out_of_order", message: error.message }, { status: 409 });
    }
    if (error instanceof ApprovalNotAuthorizedError) {
      return NextResponse.json({ error: "insufficient_role", message: error.message }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[finance/approvals/decide] POST failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
