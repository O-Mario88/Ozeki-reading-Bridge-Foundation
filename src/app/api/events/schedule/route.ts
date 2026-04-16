import { NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { createTrainingEventPostgres } from "@/lib/server/postgres/repositories/training-events";

// Helper specifically to mock the complex Google integrations that will be done via actual Google APIs later, 
// ensuring we adhere to the exact safety rules stipulated.
function generateGoogleWorkflowHashes(deliveryType: string, eventCode: string) {
  if (deliveryType === "online") {
    return {
      googleCalendarEventId: \`gcal_evt_\${eventCode}_\${Date.now()}\`,
      googleMeetLink: \`https://meet.google.com/ozk-\${eventCode.toLowerCase()}-abc\`,
      recordingConsentNotice: true
    };
  } else {
    return {
      googleCalendarEventId: \`gcal_evt_physical_\${eventCode}_\${Date.now()}\`,
      googleMeetLink: null,
      recordingConsentNotice: false
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

    const eventCode = \`OZEKI-\${Math.random().toString(36).substring(2,6).toUpperCase()}\`;
    const slug = \`\${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-\${eventCode.toLowerCase()}\`;

    // Calculate dates securely
    const startDatetime = new Date(\`\${payload.date}T\${payload.startTime}\`).toISOString();
    const endDatetime = new Date(\`\${payload.date}T\${payload.endTime}\`).toISOString();

    // EXPLICIT AUTOMATION SAFETY RULE
    const googleArtifacts = generateGoogleWorkflowHashes(payload.deliveryType, eventCode);

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
      artifacts: googleArtifacts,
      message: \`Event \${eventCode} Scheduled via unified system.\`
    });

  } catch (error: any) {
    console.error("[Schedule Unified Event Error]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
