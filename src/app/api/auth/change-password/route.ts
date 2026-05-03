import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getAuthenticatedPortalUser, PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import {
  findPortalUserAuthByIdPostgres,
  verifyPassword,
  hashPassword,
  revokeAllPortalSessionsForUserPostgres,
} from "@/lib/server/postgres/repositories/auth";
import { logger } from "@/lib/logger";
import { firstPasswordPolicyError } from "@/lib/server/auth/password-policy";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(1, "New password is required."),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = changePasswordSchema.parse(await request.json());

    // Verify current password
    const authRow = await findPortalUserAuthByIdPostgres(user.id);
    if (!authRow) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const currentValid = await verifyPassword(payload.currentPassword, authRow.passwordHash);
    if (!currentValid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    // Enforce centralised password policy (length, complexity, block-list,
    // self-reference). Doing this AFTER current-password verification keeps
    // the policy errors hidden from unauthenticated probes.
    const policyError = firstPasswordPolicyError(payload.newPassword, {
      fullName: authRow.fullName,
      email: authRow.email,
    });
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    // Prevent reusing the same password
    const sameAsOld = await verifyPassword(payload.newPassword, authRow.passwordHash);
    if (sameAsOld) {
      return NextResponse.json({ error: "New password must be different from the current password." }, { status: 400 });
    }

    const newHash = await hashPassword(payload.newPassword);

    await queryPostgres(
      `UPDATE portal_users
       SET password_hash = $1,
           must_change_password = FALSE,
           status = CASE WHEN status = 'invited' THEN 'active' ELSE status END
       WHERE id = $2`,
      [newHash, user.id],
    );

    // Defence-in-depth: revoke every OTHER active session for this user so
    // any attacker who held a stolen cookie is kicked out immediately. The
    // current session (the one performing the change) is preserved so the
    // user doesn't have to re-login mid-flow.
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(PORTAL_SESSION_COOKIE)?.value ?? null;
    const revoked = await revokeAllPortalSessionsForUserPostgres(user.id, {
      exceptToken: currentToken ?? undefined,
    });

    await auditLog({
      actor: user,
      action: "password_reset",
      targetTable: "portal_users",
      targetId: user.id,
      detail: `Self-service password change. ${revoked} other session(s) revoked.`,
      request,
    });

    return NextResponse.json({ ok: true, redirectTo: "/portal/dashboard", revokedSessions: revoked });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payload." },
        { status: 400 },
      );
    }
    logger.error("[change-password] Unhandled error", { error: String(error) });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
