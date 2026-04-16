import { NextResponse } from "next/server";
import { getPortalUserFromSession } from "@/services/dataService";
import { cookies } from "next/headers";
import { PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { makeDriveFilePublicWithLink } from "@/lib/google-workspace";
import { uploadVideoToVimeoByPull } from "@/lib/vimeo";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
     // 1. Fetch lesson
     const lessonRes = await queryPostgres(
        `SELECT * FROM recorded_lessons WHERE id = $1`, [lessonId]
     );
     const lesson = lessonRes.rows[0];
     if (!lesson || !lesson.google_drive_file_id) {
        return NextResponse.json({ error: "Lesson not found or missing Drive File" }, { status: 404 });
     }

     // 2. Mark DB Status -> Uploading
     await queryPostgres(
        `UPDATE recorded_lessons SET status = 'Uploading to Vimeo' WHERE id = $1`,
        [lessonId]
     );

     // 3. Make Drive file temporarily accessible via UC Export Download link
     const driveDownloadLink = await makeDriveFilePublicWithLink(lesson.google_drive_file_id);

     // 4. Hit Vimeo Pull API
     const vimeoMeta = await uploadVideoToVimeoByPull(
        lesson.title, 
        lesson.description || '', 
        driveDownloadLink
     );

     // 5. Update DB Status -> Vimeo Processing
     await queryPostgres(
        `UPDATE recorded_lessons 
         SET vimeo_video_id = $2,
             vimeo_embed_url = $3,
             vimeo_url = $4,
             status = 'Vimeo Processing'
         WHERE id = $1`,
        [
          lessonId, 
          vimeoMeta.videoId, 
          vimeoMeta.embedUrl, 
          `https://vimeo.com/${vimeoMeta.videoId}`
        ]
     );

     return NextResponse.json({ ok: true, status: "Vimeo Processing" });
  } catch (error) {
     console.error("[vimeo-pull] Failed to sync to vimeo:", error);
     // Fallback to error status
     await queryPostgres(`UPDATE recorded_lessons SET status = 'Failed' WHERE id = $1`, [lessonId]);
     return NextResponse.json({ error: "Failed to upload to Vimeo." }, { status: 500 });
  }
}
