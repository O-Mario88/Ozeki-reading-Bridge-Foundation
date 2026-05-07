import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { createGoogleCalendarEvent, isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { logger } from "@/lib/logger";


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      category, 
      level, 
      targetAudience, 
      deliveryType, 
      fundingType,
      sponsoringPartner,
      trainingFee,
      currency,
      eventDate, 
      startTime, 
      endTime, 
      registrationDeadline,
      maxParticipants,
      certificateEligible,
      feedbackRequired,
      assessmentRequired,
      venueName,
      venueAddress,
      district,
      subCounty,
      parish,
      maxSchools,
      maxTeachersPerSchool
    } = body;

    // Generate Unique Internal OzekiRead Code
    const eventCode = `EV-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${new Date().getTime().toString().slice(-4)}`;

    // NOTE: Previously wrapped this whole handler in BEGIN/COMMIT via separate
    // queryPostgres calls — but those run on different pooled clients, so the
    // transaction was illusory. The remaining work is one INSERT (atomic at
    // the statement level) so the wrapper added no real protection.

    // 1. Google Scheduler Execution (Unified Route).
    //
    // Google integration is optional. If credentials are missing OR the
    // Calendar/Meet API call fails, the event is still created — just without
    // a real Meet link. The portal surfaces this clearly so the operator
    // knows to add the link manually. Hard-failing here meant trainings
    // could not be scheduled at all in fresh deploys without Google creds.
    let googleMeetUrl: string | null = null;
    let googleCalendarEventId: string | null = null;
    let googleMeetWarning: string | null = null;

    if (deliveryType === "Online Live Session") {
      if (!isGoogleCalendarConfigured()) {
        googleMeetWarning = "Google Calendar not configured — event saved without an auto-generated Meet link. Set GOOGLE_* env vars in Railway, or paste a Meet link manually after creation.";
        logger.warn("[scheduler/create] Google not configured — saving event without Meet link", { eventCode });
      } else {
        logger.info("[scheduler/create] generating Google Meet link", { eventCode });
        const eventStart = new Date(`${eventDate}T${startTime}:00+03:00`);
        const eventEnd = new Date(`${eventDate}T${endTime}:00+03:00`);
        const meetTitle = `[OzekiRead] ${title} - Live Session`;
        const meetDescription = `Welcome to the OzekiRead Online Training Portal.\n\n${description}\n\nCategory: ${category}\nLevel: ${level}\n\nPlease join promptly at ${startTime}. This session may be recorded for the OzekiRead Library.`;

        try {
          const gcal = await createGoogleCalendarEvent({
            summary: meetTitle,
            description: meetDescription,
            startDateTime: eventStart.toISOString(),
            endDateTime: eventEnd.toISOString(),
            createMeet: true,
          });
          if (gcal.meetLink) {
            googleMeetUrl = gcal.meetLink;
            googleCalendarEventId = gcal.eventId;
          } else {
            googleMeetWarning = "Google Calendar accepted the event but did not return a Meet link — the create-meet flag may not be honoured by the calendar. Paste a Meet link manually.";
            logger.warn("[scheduler/create] Calendar event created without Meet link", { eventCode, eventId: gcal.eventId });
          }
        } catch (gcalErr) {
          googleMeetWarning = `Google Calendar API failed; event saved without a Meet link. Operator action required: ${gcalErr instanceof Error ? gcalErr.message : String(gcalErr)}`;
          logger.error("[scheduler/create] Google Calendar API failed; degrading", { error: gcalErr instanceof Error ? gcalErr.message : String(gcalErr) });
        }
      }
    }

    // 2. Database Insertion directly into Phase 6 Unified Schema
    const result = await queryPostgres(
      `INSERT INTO training_events (
        event_code, title, description, category, level, target_audience, delivery_type, funding_type,
        sponsoring_partner, training_fee, currency, event_date, start_time, end_time, registration_deadline,
        max_participants, certificate_eligible, feedback_required, assessment_required,
        google_meet_url, google_calendar_event_id,
        venue_name, venue_address, district, sub_county, parish, max_schools, max_teachers_per_school,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, 'Active'
      ) RETURNING id, event_code, google_meet_url`,
      [
        eventCode, title, description, category, level, targetAudience, deliveryType, fundingType,
        sponsoringPartner || null, trainingFee || 0, currency || 'UGX', eventDate, startTime, endTime, registrationDeadline || null,
        maxParticipants, certificateEligible || false, feedbackRequired || false, assessmentRequired || false,
        googleMeetUrl, googleCalendarEventId,
        venueName || null, venueAddress || null, district || null, subCounty || null, parish || null, maxSchools || null, maxTeachersPerSchool || null
      ]
    );

    return NextResponse.json({
      success: true,
      message: googleMeetWarning ? "Event scheduled (Google integration degraded)" : "Event Scheduled and Provisioned",
      event: result.rows[0],
      googleMeetWarning,
    });

  } catch (_err) {
    logger.error("Scheduler Creation Error", { error: _err instanceof Error ? _err.message : String(_err) });
    return NextResponse.json({ message: "Scheduler Pipeline Failure" }, { status: 500 });
  }
}
