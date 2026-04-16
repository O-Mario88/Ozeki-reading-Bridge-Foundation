import { NextResponse } from "next/server";
import { z } from "zod";
import { getPortalUserFromSession } from "@/services/dataService";
import { cookies } from "next/headers";
import { PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { createRecordedLessonPostgres, listRecordedLessonsPostgres } from "@/lib/server/postgres/repositories/recorded-lessons";
import { createOzekiCalendarEventWithMeet } from "@/lib/google-workspace";

export const runtime = "nodejs";

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() + "-" + Math.floor(Math.random() * 10000).toString();
}

const recordedLessonSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  teacherName: z.string().optional(),
  classLevel: z.string().optional(),
  phonicsLevel: z.string().optional(),
  category: z.string().optional(),
  googleMeetLink: z.string().optional(),
  vimeoEmbedUrl: z.string().optional(), // for manual phase 1 fallback
  scheduledStartTime: z.string().optional(),
  scheduledEndTime: z.string().optional(),
  accessLevel: z.string().optional(),
  isPublished: z.boolean().optional(),
});

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!token) return null;
  return await getPortalUserFromSession(token);
}

export async function GET() {
  const user = await requireAuth();
  if (!user || user.role === "Volunteer") {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
     const lessons = await listRecordedLessonsPostgres();
     return NextResponse.json({ lessons });
  } catch (error) {
     console.error("[recorded-lessons] Failed to list lessons:", error);
     return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAuth();

  if (!user || user.role === "Volunteer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = recordedLessonSchema.parse(await request.json());
    
    // Default manual paste URL handling to status
    const status = payload.vimeoEmbedUrl ? 'Published' : 'Scheduled';
    const isPublished = payload.isPublished ?? (status === 'Published');
    const slug = generateSlug(payload.title);

    // Generate Unique Lesson Code
    const levelCode = (payload.classLevel || 'GEN').substring(0, 2).toUpperCase();
    const dateStr = payload.scheduledStartTime ? new Date(payload.scheduledStartTime).toISOString().split('T')[0].replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = payload.scheduledStartTime ? new Date(payload.scheduledStartTime).toISOString().split('T')[1].substring(0, 5).replace(':', '') : '0000';
    const lessonCode = `OZK-${levelCode}-${dateStr}-${timeStr}`;

    let googleCalendarEventId = null;
    let googleMeetLink = payload.googleMeetLink;
    let googleMeetConferenceId = null;

    // Trigger Google Calendar API if scheduled
    if (payload.scheduledStartTime && payload.scheduledEndTime && status !== 'Published') {
      try {
         const calRes = await createOzekiCalendarEventWithMeet({
            title: payload.title,
            lessonCode,
            description: payload.description || '',
            startTime: payload.scheduledStartTime,
            endTime: payload.scheduledEndTime,
            teacherEmail: user.email // Maps the staff member implicitly
         });
         googleCalendarEventId = calRes.eventId;
         googleMeetLink = calRes.meetLink || undefined;
         googleMeetConferenceId = calRes.conferenceId;
      } catch (calErr) {
         console.warn("[recorded-lessons] Failed to create Google Calendar Block:", calErr);
      }
    }

    const lessonId = await createRecordedLessonPostgres({
      lessonCode,
      title: payload.title,
      slug,
      description: payload.description,
      teacherName: payload.teacherName,
      classLevel: payload.classLevel,
      phonicsLevel: payload.phonicsLevel,
      category: payload.category,
      googleCalendarEventId,
      googleMeetLink,
      googleMeetConferenceId,
      vimeoEmbedUrl: payload.vimeoEmbedUrl,
      scheduledStartTime: payload.scheduledStartTime,
      scheduledEndTime: payload.scheduledEndTime,
      accessLevel: payload.accessLevel || 'Registered Users Only',
      status,
      isPublished,
      createdBy: user.id
    });

    return NextResponse.json({
      ok: true,
      lessonId,
      lessonCode,
      slug
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error("[recorded-lessons] Failed to create lesson:", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
