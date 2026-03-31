import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deletePortalSessionPostgres as deletePortalSession } from "@/lib/server/postgres/repositories/auth";
import { PORTAL_SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;

  if (token) {
    const { findPortalUserBySessionTokenPostgres } = await import("@/lib/server/postgres/repositories/auth");
    const { logAuditEventPostgres } = await import("@/lib/server/postgres/repositories/audit");
    
    try {
      const user = await findPortalUserBySessionTokenPostgres(token);
      if (user) {
        await logAuditEventPostgres(user.id, user.fullName, "LOGOUT_SUCCESS", "portal_sessions", token.substring(0, 8), null, null, "Explicit session termination");
      }
    } catch (_e) { /* ignore */ }
    
    await deletePortalSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: PORTAL_SESSION_COOKIE,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
