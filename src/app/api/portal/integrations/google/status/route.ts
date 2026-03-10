import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";
import { getPortalUserFromSession } from "@/lib/db";
import { getGoogleWorkspaceDiagnostics } from "@/lib/google-workspace";

export const runtime = "nodejs";

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return getPortalUserFromSession(token);
}

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const diagnostics = await getGoogleWorkspaceDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (error) {
    return NextResponse.json(
      {
        configured: false,
        googleConnected: false,
        error: error instanceof Error ? error.message : "Could not load Google integration status.",
      },
      { status: 500 },
    );
  }
}
