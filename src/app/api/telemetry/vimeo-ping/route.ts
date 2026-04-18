import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lessonId, teacherId, sessionId, watchTimeSeconds, completed, eventType } = body;

    if (!lessonId) return NextResponse.json({ error: "Missing lessonId" }, { status: 400 });

    const safeTeacherId = typeof teacherId === 'number' && teacherId > 0 ? teacherId : null;

    if (!sessionId) {
      // Create new session via PLAY event
      const result = await queryPostgres(
        `INSERT INTO lesson_view_sessions 
         (lesson_id, teacher_id, watch_time_seconds, completed, device_type) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [lessonId, safeTeacherId, watchTimeSeconds || 0, completed || false, 'Web Browser']
      );
      
      // Update Total Views Counter if this is a fresh play
      if (eventType === "play") {
         await queryPostgres(
           `UPDATE recorded_lessons SET total_views = total_views + 1 WHERE id = $1`,
           [lessonId]
         );
      }
      
      return NextResponse.json({ success: true, sessionId: result.rows[0].id });
    } else {
      // Update existing session
      await queryPostgres(
        `UPDATE lesson_view_sessions
         SET watch_time_seconds = GREATEST(watch_time_seconds, $1),
             max_position_seconds = GREATEST(max_position_seconds, $1),
             completed = completed OR $2,
             session_end = NOW()
         WHERE id = $3`,
        [watchTimeSeconds, completed, sessionId]
      );
      return NextResponse.json({ success: true, sessionId });
    }
  } catch (error) {
    console.error("Telemetry Pipeline Error:", error);
    return NextResponse.json({ error: "Telemetry failed" }, { status: 500 });
  }
}
