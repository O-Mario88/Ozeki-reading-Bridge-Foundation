import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { syncCrmContactFromSource, logInteraction } from "@/lib/server/postgres/repositories/crm";

export const runtime = "nodejs";

const bodySchema = z.object({
  subject: z.string().trim().max(280).optional(),
  notes: z.string().trim().max(4000).nullish(),
  callDate: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(0).max(600).nullish(),
  outcome: z.string().trim().max(80).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> },
) {
  const { contactId: rawContactId } = await params;
  const contactId = Number(rawContactId);
  if (!Number.isInteger(contactId) || contactId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid contact id." }, { status: 400 });
  }

  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    body = bodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof z.ZodError ? err.issues[0]?.message ?? "Invalid request." : "Invalid request." },
      { status: 400 },
    );
  }

  // Look up the contact to get name + type for the bridge upsert.
  const contactRes = await queryPostgres<{
    full_name: string;
    email: string | null;
    contact_record_type: string | null;
  }>(
    `SELECT full_name, email, contact_record_type
     FROM school_contacts WHERE contact_id = $1 LIMIT 1`,
    [contactId],
  );
  const contact = contactRes.rows[0];
  if (!contact) {
    return NextResponse.json({ success: false, error: "Contact not found." }, { status: 404 });
  }

  // Upsert the bridge crm_contacts row, then log the interaction.
  const bridgeId = await syncCrmContactFromSource(
    "school_contacts",
    contactId,
    contact.full_name,
    contact.contact_record_type ?? "School Contact",
    contact.email ?? undefined,
  );

  const summarySegments = [body.outcome, body.durationMinutes ? `${body.durationMinutes} min` : null]
    .filter((s): s is string => Boolean(s))
    .join(" · ");

  const interactionId = await logInteraction({
    contactId: bridgeId,
    type: "Call",
    subject: body.subject || "Phone Call",
    notes: [body.notes, summarySegments].filter(Boolean).join("\n\n") || undefined,
    date: body.callDate,
    userId: user.id,
    sourceTable: "school_contacts",
    sourceId: contactId,
  });

  return NextResponse.json({ success: true, interactionId });
}
