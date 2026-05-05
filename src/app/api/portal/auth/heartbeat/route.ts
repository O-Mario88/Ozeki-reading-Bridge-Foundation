import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

/**
 * POST /api/portal/auth/heartbeat
 *
 * Slides the session's last_active_at timestamp on demand. The portal
 * mounts a small client that pings this endpoint while the user has any
 * recent keyboard / mouse / touch / scroll activity, so a long form-fill
 * or report-read no longer trips the idle timeout. Returns 204 on success
 * (no body needed) and 401 if the session cookie is missing.
 *
 * Cheap by design: a single UPDATE keyed on the indexed token column,
 * no payload parsing, no expensive joins. Safe to call as often as the
 * client's debounce allows.
 */
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  // Touch last_active_at only if the session is still alive — the WHERE
  // clause filters out hard-expired rows so a stale heartbeat from a
  // closed tab can't resurrect them.
  const result = await queryPostgres(
    `UPDATE portal_sessions
        SET last_active_at = NOW()
      WHERE token = $1
        AND expires_at > NOW()
      RETURNING 1`,
    [token],
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }

  return new NextResponse(null, { status: 204 });
}
