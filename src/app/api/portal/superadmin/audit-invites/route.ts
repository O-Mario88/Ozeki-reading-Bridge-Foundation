import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/server/audit/log";
import {
  createAuditInvitePostgres,
  listAuditInvitesPostgres,
} from "@/lib/server/postgres/repositories/audit-invites";

export const runtime = "nodejs";

const postSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2).max(120),
  organization: z.string().trim().max(160).optional(),
  scopeNote: z.string().trim().max(800).optional(),
  inviteValidHours: z.coerce.number().int().min(1).max(168).default(48),
  accountValidDays: z.coerce.number().int().min(1).max(60).default(7),
});

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const invites = await listAuditInvitesPostgres(200);
  return NextResponse.json({ invites });
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = postSchema.parse(await request.json());

    const token = crypto.randomBytes(24).toString("hex");
    const now = Date.now();
    const expiresAt = new Date(now + parsed.inviteValidHours * 60 * 60 * 1000);
    const accountExpiresAt = new Date(now + parsed.accountValidDays * 24 * 60 * 60 * 1000);

    const invite = await createAuditInvitePostgres({
      token,
      invitedEmail: parsed.email,
      invitedFullName: parsed.fullName,
      invitedOrganization: parsed.organization ?? null,
      scopeNote: parsed.scopeNote ?? null,
      expiresAt,
      accountExpiresAt,
      createdByUserId: user.id,
    });

    const origin = new URL(request.url).origin;
    const claimUrl = `${origin}/portal/auditor-claim?token=${token}`;

    await auditLog({
      actor: user,
      action: "create",
      targetTable: "audit_invite_tokens",
      targetId: invite.id,
      after: {
        invitedEmail: invite.invitedEmail,
        organization: invite.invitedOrganization,
        accountExpiresAt: invite.accountExpiresAt,
        inviteExpiresAt: invite.expiresAt,
      },
      detail: `Issued audit invite for ${invite.invitedEmail} (account valid until ${invite.accountExpiresAt})`,
      request,
    });

    return NextResponse.json({ ok: true, invite, claimUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid invite payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
