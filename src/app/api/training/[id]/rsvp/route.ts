import { NextResponse } from "next/server";
import { z } from "zod";
import { addAttendeeToOnlineTrainingSessionPostgres } from "@/lib/server/postgres/repositories/training";
import { addAttendeeToCalendarEvent } from "@/lib/google-calendar";

export const runtime = "nodejs";

const rsvpSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = rsvpSchema.parse(body);

    const sessionId = Number(id);
    if (Number.isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID." }, { status: 400 });
    }

    // 1. Save to database attendee JSON array
    const calendarEventId = await addAttendeeToOnlineTrainingSessionPostgres(sessionId, payload.email);

    if (calendarEventId) {
      // 2. Patch Google Calendar
      await addAttendeeToCalendarEvent(calendarEventId, payload.email);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid RSVP payload." },
        { status: 400 }
      );
    }
    console.error("[rsvp] Failed to process attendance confirmation:", error);
    return NextResponse.json({ error: "Server error during RSVP" }, { status: 500 });
  }
}
