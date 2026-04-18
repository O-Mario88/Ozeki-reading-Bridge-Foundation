import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";
import crypto from "crypto";

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

    await queryPostgres('BEGIN');

    // 1. Google Scheduler Execution (Unified Route)
    let googleMeetUrl = null;
    let googleCalendarEventId = null;

    if (deliveryType === "Online Live Session") {
      console.log(">> Initiating Google Meet Auto-Generation...");
      
      const eventStart = new Date(`${eventDate}T${startTime}:00+03:00`);
      const eventEnd = new Date(`${eventDate}T${endTime}:00+03:00`);
      
      const meetTitle = `[OzekiRead] ${title} - Live Session`;
      const meetDescription = `Welcome to the OzekiRead Online Training Portal.\n\n${description}\n\nCategory: ${category}\nLevel: ${level}\n\nPlease join promptly at ${startTime}. This session may be recorded for the OzekiRead Library.`;

      // Utilize existing Google Calendar lib
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
        throw new Error("Failed to generate Google Meet URL from integration layer.");
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

    await queryPostgres('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: "Event Scheduled and Provisioned",
      event: result.rows[0]
    });

  } catch (error) {
    await queryPostgres('ROLLBACK');
    console.error("Scheduler Creation Error:", error);
    return NextResponse.json({ message: "Scheduler Pipeline Failure" }, { status: 500 });
  }
}
