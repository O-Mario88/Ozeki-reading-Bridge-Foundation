import { NextResponse } from "next/server";
import { getPortalUserFromSession } from "@/services/dataService";
import { cookies } from "next/headers";
import { PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getPortalUserFromSession(token);
  if (!user || user.role === "Volunteer") {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const lessonId = Number(id);

  if (Number.isNaN(lessonId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
     const payload = await request.json();
     
     // Set Google Drive File bindings
     if (payload.googleDriveFileId) {
        await queryPostgres(
          `UPDATE recorded_lessons 
           SET google_drive_file_id = $2, 
               google_drive_file_name = $3, 
               status = 'Ready for Import',
               updated_at = NOW() 
           WHERE id = $1`,
          [lessonId, payload.googleDriveFileId, payload.googleDriveFileName || null]
        );
     }
     
     // Set Publish Toggle / Status changes
     if (payload.isPublished !== undefined) {
         await queryPostgres(
           `UPDATE recorded_lessons
            SET is_published = $2,
                status = $3,
                published_at = CASE WHEN $2 = true THEN NOW() ELSE NULL END,
                updated_at = NOW()
            WHERE id = $1`,
            [lessonId, payload.isPublished, payload.status || 'Ready for Review']
         );
     }

     return NextResponse.json({ ok: true });
  } catch (error) {
     logger.error("[portal/recorded-lessons/:id] failed to patch drive bind", { error: error instanceof Error ? error.message : String(error) });
     return NextResponse.json({ error: "Failed to bind recording." }, { status: 500 });
  }
}
