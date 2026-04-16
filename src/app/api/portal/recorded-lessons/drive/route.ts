import { NextResponse } from "next/server";
import { getPortalUserFromSession } from "@/services/dataService";
import { cookies } from "next/headers";
import { PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { listRecordingFilesFromDrive } from "@/lib/google-workspace";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getPortalUserFromSession(token);
  if (!user || user.role === "Volunteer") {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId") || undefined;

  try {
     const files = await listRecordingFilesFromDrive(folderId);
     return NextResponse.json({ files });
  } catch (error) {
     console.error("[drive-import] Failed to list drive files:", error);
     return NextResponse.json({ error: "Failed to list Google Drive recordings." }, { status: 500 });
  }
}
