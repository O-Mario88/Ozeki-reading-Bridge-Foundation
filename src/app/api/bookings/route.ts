import { NextResponse } from "next/server";
import { z } from "zod";
import { saveBooking } from "@/lib/db";
import { workspaceCalendarRecipients } from "@/lib/contact";
import {
  buildDateRangeFromDateAndTime,
  createGoogleCalendarEvent,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";

export const runtime = "nodejs";

const bookingSchema = z.object({
  service: z.string().min(2),
  schoolName: z.string().min(2),
  contactName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  teachers: z.coerce.number().int().positive(),
  grades: z.string().min(2),
  challenges: z.string().min(10),
  location: z.string().min(2),
  preferredDate: z.string().min(6),
  preferredTime: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const payload = bookingSchema.parse(await request.json());
    saveBooking(payload);

    let calendar:
      | {
          eventLink: string | null;
          meetLink: string | null;
        }
      | null = null;
    let calendarWarning: string | undefined;

    if (isGoogleCalendarConfigured()) {
      try {
        const durationMinutes = Number(
          process.env.BOOKING_CALENDAR_DURATION_MINUTES ?? 60,
        );
        const isOnlineSession = payload.service.toLowerCase().includes("online");
        const dateRange = buildDateRangeFromDateAndTime(
          payload.preferredDate,
          payload.preferredTime,
          durationMinutes,
        );
        const attendeeEmails = [...workspaceCalendarRecipients, payload.email]
          .map((email) => email.trim().toLowerCase())
          .filter((email, index, list) => email && list.indexOf(email) === index);

        const event = await createGoogleCalendarEvent({
          summary: `${payload.service} - ${payload.schoolName}`,
          description: `School: ${payload.schoolName}
Contact: ${payload.contactName}
Email: ${payload.email}
Phone: ${payload.phone}
Teachers: ${payload.teachers}
Grades: ${payload.grades}
Challenges: ${payload.challenges}
Location details: ${payload.location}`,
          location: payload.location,
          startDateTime: dateRange.startDateTime,
          endDateTime: dateRange.endDateTime,
          attendeeEmails,
          createMeet: isOnlineSession,
        });

        calendar = {
          eventLink: event.htmlLink,
          meetLink: event.meetLink,
        };
      } catch {
        calendarWarning =
          "Booking saved, but Google Calendar invite could not be created.";
      }
    } else {
      calendarWarning =
        "Booking saved, but Google Calendar integration is not configured yet.";
    }

    return NextResponse.json({
      ok: true,
      message: "Booking request submitted.",
      calendar,
      calendarWarning,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid booking payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
