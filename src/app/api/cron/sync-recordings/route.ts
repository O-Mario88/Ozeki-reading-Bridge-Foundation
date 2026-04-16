import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { listRecordingFilesFromDrive, makeDriveFilePublicWithLink } from "@/lib/google-workspace";
import { uploadVideoToVimeoByPull } from "@/lib/vimeo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // 1. Authenticate CRON Token
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET_TOKEN?.trim() || "local_dev_bypass";
  
  if (
     (authHeader !== `Bearer ${cronSecret}`) && 
     process.env.NODE_ENV === "production"
  ) {
     return NextResponse.json({ error: "Unauthorized Cron Connection" }, { status: 401 });
  }

  try {
     console.log("[cron-sync] Starting Automated Google Drive -> Vimeo Synchronization cycle...");

     // 2. Fetch Scheduled Lessons
     const unsyncedLessonsRes = await queryPostgres(
        `SELECT * FROM recorded_lessons WHERE status = 'Scheduled' AND is_published = false`
     );
     const scheduledLessons = unsyncedLessonsRes.rows;

     if (scheduledLessons.length === 0) {
        return NextResponse.json({ ok: true, message: "No active scheduled sessions require synchronization." });
     }

     // 3. Fetch Google Drive Recordings pool
     const driveFiles = await listRecordingFilesFromDrive();
     if (!driveFiles || driveFiles.length === 0) {
        return NextResponse.json({ ok: true, message: "No MP4 files detected within the Drive environment." });
     }

     const logs: string[] = [];
     let syncCount = 0;

     // 4. Heuristic Loop Matching
     for (const lesson of scheduledLessons) {
        const lessonTitleRaw = (lesson.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        
        // Let's attempt a naive text match against the drive file names
        const matchedDriveFile = driveFiles.find((file: any) => {
           const driveNameRaw = (file.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
           // Checking if the lesson title substring is inside the google meet raw output title.
           return lessonTitleRaw.length > 5 && driveNameRaw.includes(lessonTitleRaw);
        });

        if (matchedDriveFile) {
           console.log(`[cron-sync] Match identified! Lesson ID: ${lesson.id} -> Drive File Name: ${matchedDriveFile.name}`);
           try {
              // 4a. Update Postgres to Lock the status
              await queryPostgres(
                 `UPDATE recorded_lessons 
                  SET status = 'Uploading to Vimeo', 
                      google_drive_file_id = $2, 
                      google_drive_file_name = $3 
                  WHERE id = $1`,
                 [lesson.id, matchedDriveFile.id, matchedDriveFile.name]
              );

              // 4b. Temporarily Expose URL
              const driveDownloadLink = await makeDriveFilePublicWithLink(matchedDriveFile.id);

              // 4c. Trigger Vimeo Push Serverlessly
              const vimeoMeta = await uploadVideoToVimeoByPull(
                 lesson.title, 
                 lesson.description || '', 
                 driveDownloadLink
              );

              // 4d. Complete Loop Transaction
              await queryPostgres(
                 `UPDATE recorded_lessons 
                  SET vimeo_video_id = $2,
                      vimeo_embed_url = $3,
                      vimeo_url = $4,
                      status = 'Vimeo Processing',
                      updated_at = NOW()
                  WHERE id = $1`,
                 [
                   lesson.id, 
                   vimeoMeta.videoId, 
                   vimeoMeta.embedUrl, 
                   `https://vimeo.com/${vimeoMeta.videoId}`
                 ]
              );

              syncCount++;
              logs.push(`Successfully synced: ${lesson.title}`);
           } catch (error) {
              console.error(`[cron-sync] Automation failed for lesson ${lesson.id}:`, error);
              logs.push(`Failed to sync: ${lesson.title}`);
              // Reset status gracefully back to scheduled or failed
              await queryPostgres(
                 `UPDATE recorded_lessons SET status = 'Failed' WHERE id = $1`, 
                 [lesson.id]
              );
           }
        }
     }

     return NextResponse.json({
        ok: true,
        message: `Cron automation cycle complete. Evaluated ${scheduledLessons.length} lessons. Correctly matched and transferred ${syncCount} Google Drive videos to Vimeo.`,
        logs
     });

  } catch (error) {
     console.error("[cron-sync] Critical failure in background syncer:", error);
     return NextResponse.json({ error: "Cron Job Failed internally." }, { status: 500 });
  }
}
