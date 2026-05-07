import { NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { createTrainingEventPostgres } from "@/lib/server/postgres/repositories/training-events";
import { createGoogleCalendarEvent, isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { logger } from "@/lib/logger";

/**
 * Provision a Calendar event + Meet link via the real Google API. Falls back
 * to null artifacts when Google is not configured or the API call fails so
 * the training event still saves — operators can paste a Meet link manually
 * after creation. Replaced the previous mock that fabricated unusable
 * `https://meet.google.com/ozk-XXXX-abc` URLs.
 */
async function provisionGoogleArtifacts(input: {
  deliveryType: string;
  title: string;
  description: string | undefined;
  startDatetime: string;
  endDatetime: string;
}): Promise<{
  googleCalendarEventId: string | null;
  googleMeetLink: string | null;
  recordingConsentNotice: boolean;
  warning: string | null;
}> {
  const recordingConsentNotice = input.deliveryType === "online";
  if (input.deliveryType !== "online") {
    return { googleCalendarEventId: null, googleMeetLink: null, recordingConsentNotice, warning: null };
  }
  if (!isGoogleCalendarConfigured()) {
    logger.warn("[events/schedule] Google not configured — saving without Meet link");
    return {
      googleCalendarEventId: null,
      googleMeetLink: null,
      recordingConsentNotice,
      warning: "Google Calendar not configured — event saved without an auto-generated Meet link. Set GOOGLE_* env vars in Railway, or paste a Meet link manually after creation.",
    };
  }
  try {
    const gcal = await createGoogleCalendarEvent({
      summary: `[OzekiRead] ${input.title}`,
      description: input.description ?? "",
      startDateTime: input.startDatetime,
      endDateTime: input.endDatetime,
      createMeet: true,
    });
    return {
      googleCalendarEventId: gcal.eventId ?? null,
      googleMeetLink: gcal.meetLink ?? null,
      recordingConsentNotice,
      warning: gcal.meetLink ? null : "Calendar event created but Google did not return a Meet link. Paste one manually.",
    };
  } catch (err) {
    logger.error("[events/schedule] Google API failed; degrading", { error: err instanceof Error ? err.message : String(err) });
    return {
      googleCalendarEventId: null,
      googleMeetLink: null,
      recordingConsentNotice,
      warning: `Google Calendar API failed: ${err instanceof Error ? err.message : String(err)}. Event saved without a Meet link.`,
    };
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePortalStaffUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = await request.json();
    
    // Explicit Validation Check
    if (!payload.title || !payload.date || !payload.startTime || !payload.endTime) {
       return NextResponse.json({ message: "Missing core required fields." }, { status: 400 });
    }

    if (payload.deliveryType === 'in_person' && (!payload.venueName || !payload.district || !payload.fundingType)) {
       return NextResponse.json({ message: "Missing offline required fields." }, { status: 400 });
    }

    const eventCode = `OZEKI-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
    const slug = `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${eventCode.toLowerCase()}`;

    // Calculate dates securely
    const startDatetime = new Date(`${payload.date}T${payload.startTime}`).toISOString();
    const endDatetime = new Date(`${payload.date}T${payload.endTime}`).toISOString();

    const googleArtifacts = await provisionGoogleArtifacts({
      deliveryType: payload.deliveryType,
      title: payload.title,
      description: payload.description,
      startDatetime,
      endDatetime,
    });

    const newId = await createTrainingEventPostgres({
      eventCode,
      deliveryType: payload.deliveryType,
      title: payload.title,
      slug,
      description: payload.description,
      startDatetime,
      endDatetime,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      contactEmail: payload.contactEmail,
      
      // Google Telemetry Application
      googleCalendarEventId: googleArtifacts.googleCalendarEventId,
      googleMeetLink: googleArtifacts.googleMeetLink,

      // Dependent Injection
      ...(payload.deliveryType === 'in_person' && {
        venueName: payload.venueName,
        venueAddress: payload.venueAddress,
        district: payload.district,
        maxSchools: payload.maxSchools,
        fundingType: payload.fundingType,
        trainingFeeAmount: payload.trainingFeeAmount,
        currency: payload.currency,
        sponsoringPartnerName: payload.sponsoringPartnerName
      })
    });

    return NextResponse.json({
      success: true,
      id: newId,
      artifacts: {
        googleCalendarEventId: googleArtifacts.googleCalendarEventId,
        googleMeetLink: googleArtifacts.googleMeetLink,
        recordingConsentNotice: googleArtifacts.recordingConsentNotice,
      },
      googleMeetWarning: googleArtifacts.warning,
      message: googleArtifacts.warning
        ? `Event ${eventCode} scheduled (Google integration degraded).`
        : `Event ${eventCode} Scheduled via unified system.`,
    });

  } catch (error: unknown) {
    logger.error("[Schedule Unified Event Error]", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
