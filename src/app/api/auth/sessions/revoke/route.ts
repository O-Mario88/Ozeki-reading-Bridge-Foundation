import { NextResponse } from "next/server";
import { getCurrentPortalUser, PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { queryPostgres } from "@/lib/server/postgres/client";
import { logAuditEventPostgres } from "@/lib/server/postgres/repositories/audit";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentPortalUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const cookieStore = await cookies();
    const currentToken = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (!currentToken) {
      return NextResponse.json({ error: "No active session to preserve." }, { status: 400 });
    }

    // Revoke all other sessions for this user globally
    const result = await queryPostgres(
      `
        DELETE FROM portal_sessions 
        WHERE user_id = $1 AND token != $2
      `,
      [user.id, currentToken]
    );

    const revokedCount = result.rowCount ?? 0;

    if (revokedCount > 0) {
      try {
        await logAuditEventPostgres(
          user.id,
          user.fullName,
          "REVOKE_ALL_SESSIONS",
          "portal_sessions",
          null,
          null,
          null,
          `Revoked ${revokedCount} alternative active session(s)`,
          ipAddress
        );
      } catch (_e) { /* ignore */ }
    }

    return NextResponse.json({ ok: true, count: revokedCount });
  } catch (error) {
    logger.error("[sessions/revoke] Unhandled error", { error: String(error) });
    return NextResponse.json({ error: "Server error during session revocation." }, { status: 500 });
  }
}
