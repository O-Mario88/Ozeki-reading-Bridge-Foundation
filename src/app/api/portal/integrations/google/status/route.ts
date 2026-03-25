import { NextResponse } from "next/server";
import { getCurrentPortalUser } from "@/lib/auth";
import { getGoogleWorkspaceDiagnostics } from "@/lib/google-workspace";

export const runtime = "nodejs";



export async function GET() {
  try {
    const user = await getCurrentPortalUser();
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
