import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSessionCookie } from "@/lib/auth";
import {
  findAuditInviteByTokenPostgres,
  markAuditInviteConsumedPostgres,
} from "@/lib/server/postgres/repositories/audit-invites";
import {
  createPortalSessionPostgres,
  hashPassword,
} from "@/lib/server/postgres/repositories/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const postSchema = z.object({
  token: z.string().trim().min(20).max(200),
});

export async function POST(request: Request) {
  try {
    const parsed = postSchema.parse(await request.json());

    const invite = await findAuditInviteByTokenPostgres(parsed.token);
    if (!invite) {
      return NextResponse.json({ error: "Invite token not recognised." }, { status: 404 });
    }
    if (invite.consumedAt) {
      return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
    }
    if (new Date(invite.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This invite has expired. Ask the issuer for a new one." }, { status: 410 });
    }

    // Generate a random password the auditor never sees — they sign in via
    // the magic link only. The password column has a NOT NULL constraint.
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await hashPassword(randomPassword);

    const insertResult = await queryPostgres(
      `
      INSERT INTO portal_users (
        full_name, email, role, password_hash, phone,
        is_supervisor, is_me, is_admin, is_superadmin,
        expires_at, status
      ) VALUES ($1, $2, 'Auditor', $3, NULL, FALSE, FALSE, FALSE, FALSE, $4, 'active')
      ON CONFLICT (email) DO UPDATE SET
        role = 'Auditor',
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        is_supervisor = FALSE,
        is_me = FALSE,
        is_admin = FALSE,
        is_superadmin = FALSE,
        expires_at = EXCLUDED.expires_at,
        status = 'active'
      RETURNING id
      `,
      [
        invite.invitedFullName,
        invite.invitedEmail,
        passwordHash,
        invite.accountExpiresAt,
      ],
    );
    const userId = Number(insertResult.rows[0]?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Could not provision auditor account.");
    }

    await markAuditInviteConsumedPostgres(invite.id, userId);

    const session = await createPortalSessionPostgres(userId);

    await auditLog({
      actor: { id: userId, name: invite.invitedFullName },
      action: "claim",
      targetTable: "audit_invite_tokens",
      targetId: invite.id,
      after: { userId, accountExpiresAt: invite.accountExpiresAt },
      detail: `Auditor ${invite.invitedEmail} claimed invite — account valid until ${invite.accountExpiresAt}`,
      request,
    });

    const response = NextResponse.json({
      ok: true,
      redirectTo: "/portal/auditor",
      accountExpiresAt: invite.accountExpiresAt,
    });
    response.cookies.set(buildSessionCookie(session.token));
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid token payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
