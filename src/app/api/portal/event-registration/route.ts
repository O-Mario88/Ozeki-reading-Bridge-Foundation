import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getPortalUserFromSession } from "@/services/dataService";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { createSchoolContactInSchoolPostgres } from "@/lib/server/postgres/repositories/schools";
import { addEventParticipants, getTrainingSession } from "@/lib/training-db";
import { createOrUpdateSchool } from "@/lib/server/services/schools/write-service";

export const runtime = "nodejs";

const contactSchema = z.object({
  fullName: z.string().min(2),
  role: z.string().min(1),
  gender: z.enum(["Male", "Female", ""]).optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
});

const registrationSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  schoolName: z.string().min(2),
  district: z.string().min(2),
  region: z.string().optional().default(""),
  subRegion: z.string().optional().default(""),
  subCounty: z.string().optional().default(""),
  parish: z.string().optional().default(""),
  contacts: z.array(contactSchema).min(1, "At least one contact is required."),
});

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!token) return null;
  return getPortalUserFromSession(token);
}

export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = registrationSchema.parse(await request.json());

    // 1. Verify the event exists
    const session = await getTrainingSession(payload.eventId);
    if (!session) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    // 2. Create or find the school
    const schoolResult = await createOrUpdateSchool({
      actor: user,
      input: {
        name: payload.schoolName,
        district: payload.district,
        region: payload.region || null,
        subRegion: payload.subRegion || null,
        subCounty: payload.subCounty || null,
        parish: payload.parish || null,
        country: "Uganda",
      },
    });
    const schoolId = schoolResult.school.id;

    // 3. Create contacts and collect their IDs
    const contactIds: number[] = [];
    for (const contact of payload.contacts) {
      const categoryMap: Record<string, string> = {
        "School Leader": "Head Teacher",
        "Head Teacher": "Head Teacher",
        "Deputy Head": "Deputy Head Teacher",
      };
      const created = await createSchoolContactInSchoolPostgres({
        schoolId,
        fullName: contact.fullName,
        gender: (contact.gender || "Other") as "Male" | "Female" | "Other",
        phone: contact.phone || undefined,
        email: contact.email || undefined,
        category: (categoryMap[contact.role] ?? "Teacher") as "Teacher" | "Head Teacher" | "Deputy Head Teacher",
        roleTitle: contact.role || undefined,
        isPrimaryContact: false,
      });
      contactIds.push(created.contactId);
    }

    // 4. Register as event participants
    const { inserted } = await addEventParticipants(
      payload.eventId,
      schoolId,
      contactIds,
    );

    // 5. Update attendee count on the session
    await queryPostgres(
      `UPDATE online_training_sessions
       SET attendee_count = COALESCE(attendee_count, 0) + $2, updated_at = NOW()
       WHERE id = $1`,
      [payload.eventId, inserted],
    );

    return NextResponse.json({
      ok: true,
      registration: {
        id: contactIds[0] ?? 0,
        sessionId: payload.eventId,
        schoolId,
        schoolName: payload.schoolName,
        contactsRegistered: inserted,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid registration payload." },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
