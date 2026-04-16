import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { cookies, headers } from "next/headers";
import { PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { getPortalUserFromSession } from "@/services/dataService";
import crypto from 'crypto';

export const runtime = "nodejs";

// Used for heartbeat updates mapping session tracking
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { 
      lessonId, 
      sessionId, 
      videoPositionSeconds, 
      eventType, 
      deviceType 
    } = payload;

    if (!lessonId || !sessionId) {
      return NextResponse.json({ error: "Missing required tracking tokens." }, { status: 400 });
    }

    // Attempt to identify user
    const cookieStore = await cookies();
    const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
    let userId = null;
    let userRole = 'Guest';
    let userName = 'Anonymous';
    let userEmail = null;

    if (token) {
       const user = await getPortalUserFromSession(token);
       if (user) {
          userId = user.id;
          userRole = user.role;
          userName = user.fullName;
          userEmail = user.email;
       }
    }

    // IP Hashing to keep compliance
    const reqHeaders = await headers();
    const rawIp = reqHeaders.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = reqHeaders.get('user-agent') || 'Unknown Browser';
    const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');
    const uaHash = crypto.createHash('sha256').update(userAgent).digest('hex');

    // UPSERT session logic
    // We check if session_id exists. If not, insert. If yes, update.
    const sessionCheck = await queryPostgres(
       `SELECT * FROM lesson_view_sessions WHERE session_id = $1`, [sessionId]
    );

    let dbSessionId = null;
    let totalSeconds = 0;
    
    if (sessionCheck.rowCount === 0) {
       const newSessionRes = await queryPostgres(
          `INSERT INTO lesson_view_sessions (
             recorded_lesson_id, user_id, session_id, viewer_name, viewer_email, 
             ip_hash, user_agent_hash, device_type, user_role, current_position_seconds, max_position_seconds
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
          [
            lessonId, userId, sessionId, userName, userEmail, 
            ipHash, uaHash, deviceType || 'Unknown', userRole, 
            videoPositionSeconds, videoPositionSeconds
          ]
       );
       dbSessionId = newSessionRes.rows[0].id;
    } else {
       const existingSession = sessionCheck.rows[0];
       dbSessionId = existingSession.id;
       totalSeconds = existingSession.watch_seconds + (eventType === 'timeupdate' ? 15 : 0); // Approx 15 sec delta heartbeats
       const maxPos = Math.max(existingSession.max_position_seconds, videoPositionSeconds);
       
       await queryPostgres(
          `UPDATE lesson_view_sessions 
           SET last_event_at = NOW(), 
               watch_seconds = $2, 
               current_position_seconds = $3,
               max_position_seconds = $4
           WHERE session_id = $1`,
          [sessionId, totalSeconds, videoPositionSeconds, maxPos]
       );
    }

    // Record Event Trace in lesson_view_events
    if (eventType !== 'ping') {
       await queryPostgres(
          `INSERT INTO lesson_view_events (
            view_session_id, recorded_lesson_id, user_id, event_type, video_position_seconds
           ) VALUES ($1, $2, $3, $4, $5)`,
          [dbSessionId, lessonId, userId, eventType, videoPositionSeconds]
       );
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[telemetry] Lesson View Error:", err);
    return NextResponse.json({ error: "Telemetry crash." }, { status: 500 });
  }
}
