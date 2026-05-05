import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { getContactProfileSnapshot } from "@/lib/server/postgres/repositories/contact-profile";

export const runtime = "nodejs";

/**
 * GET /api/portal/contacts/:contactId/profile-pdf
 *
 * Single-page summary PDF for the contact: identity block, contact methods,
 * snapshot, and headline counters. Kept intentionally lean — the dashboard
 * itself is the rich view; this is the file you attach to an email or
 * print for a meeting briefing.
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> },
) {
  const { contactId: rawContactId } = await params;
  const contactId = Number(rawContactId);
  if (!Number.isInteger(contactId) || contactId <= 0) {
    return NextResponse.json({ error: "Invalid contact id." }, { status: 400 });
  }

  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const snapshot = await getContactProfileSnapshot(contactId);
  if (!snapshot) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 portrait, points
  const { width, height } = page.getSize();

  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.067, 0.094, 0.153);
  const muted = rgb(0.4, 0.45, 0.55);
  const accent = rgb(0.024, 0.416, 0.404);
  const margin = 48;

  // Header strip
  page.drawRectangle({ x: 0, y: height - 64, width, height: 64, color: accent });
  page.drawText("Contact Profile", {
    x: margin, y: height - 40, size: 18, font: fontBold, color: rgb(1, 1, 1),
  });
  page.drawText(`Generated ${new Date().toLocaleString("en-US")}`, {
    x: margin, y: height - 56, size: 9, font: fontRegular, color: rgb(0.85, 0.92, 0.91),
  });
  page.drawText("Ozeki Reading Bridge Foundation", {
    x: width - margin - 220, y: height - 40, size: 11, font: fontBold, color: rgb(1, 1, 1),
  });

  let cursorY = height - 90;

  // Identity block
  page.drawText(snapshot.identity.fullName, {
    x: margin, y: cursorY, size: 22, font: fontBold, color: ink,
  });
  cursorY -= 18;
  page.drawText(`${snapshot.identity.role}  ·  ${snapshot.identity.roleType}`, {
    x: margin, y: cursorY, size: 11, font: fontRegular, color: muted,
  });
  cursorY -= 14;
  if (snapshot.identity.primarySchoolName) {
    page.drawText(snapshot.identity.primarySchoolName, {
      x: margin, y: cursorY, size: 11, font: fontBold, color: ink,
    });
    cursorY -= 12;
  }
  page.drawText(
    [snapshot.identity.district, snapshot.identity.subCounty, snapshot.identity.parish, snapshot.identity.village]
      .filter((s) => s && s !== "—").join(" · "),
    { x: margin, y: cursorY, size: 10, font: fontRegular, color: muted },
  );

  cursorY -= 30;

  // Contact methods
  const cmTitle = "Contact Methods";
  page.drawText(cmTitle, { x: margin, y: cursorY, size: 12, font: fontBold, color: ink });
  cursorY -= 14;
  const cm = snapshot.contactMethods;
  const cmRows: Array<[string, string]> = [
    ["Primary Phone", cm.primaryPhone ?? "—"],
    ["WhatsApp", cm.whatsapp ?? "—"],
    ["Email", cm.email ?? "—"],
    ["Last Engagement", cm.lastEngagementAt ? new Date(cm.lastEngagementAt).toLocaleDateString("en-US") : "—"],
  ];
  for (const [label, value] of cmRows) {
    page.drawText(label, { x: margin, y: cursorY, size: 10, font: fontRegular, color: muted });
    page.drawText(value, { x: margin + 130, y: cursorY, size: 10, font: fontBold, color: ink });
    cursorY -= 13;
  }

  cursorY -= 14;

  // Snapshot
  page.drawText("Contact Snapshot", { x: margin, y: cursorY, size: 12, font: fontBold, color: ink });
  cursorY -= 14;
  const snap = snapshot.snapshot;
  const snapRows: Array<[string, string]> = [
    ["First Added", snap.firstAddedAt ? new Date(snap.firstAddedAt).toLocaleDateString("en-US") : "—"],
    ["Created By", snap.createdByName ?? "—"],
    ["Source", snap.source ?? "—"],
    ["Engagement Score", `${snap.engagementScore}%`],
    ["Data Completeness", `${snap.dataCompleteness}%`],
    ["Consent & Privacy", snap.consentStatus],
  ];
  for (const [label, value] of snapRows) {
    page.drawText(label, { x: margin, y: cursorY, size: 10, font: fontRegular, color: muted });
    page.drawText(value, { x: margin + 130, y: cursorY, size: 10, font: fontBold, color: ink });
    cursorY -= 13;
  }

  cursorY -= 14;

  // Headline counters
  page.drawText("Engagement Summary", { x: margin, y: cursorY, size: 12, font: fontBold, color: ink });
  cursorY -= 14;
  const counters: Array<[string, string]> = [
    ["Trainings", String(snapshot.trainingParticipation.total)],
    ["Coaching Visits", String(snapshot.coachingEvaluations.coachingVisits)],
    ["Observations", String(snapshot.coachingEvaluations.observations)],
    ["Action Plans", String(snapshot.coachingEvaluations.actionPlans)],
    ["Calls Logged", String(snapshot.meetingsEngagements.callsLogged)],
    ["Emails Sent", String(snapshot.meetingsEngagements.emailsSent)],
    ["Meetings", String(snapshot.meetingsEngagements.meetings)],
    ["School Visits", String(snapshot.meetingsEngagements.schoolVisits)],
  ];
  // Two-column layout
  let col = 0;
  let rowY = cursorY;
  for (const [label, value] of counters) {
    const x = margin + col * 240;
    page.drawText(label, { x, y: rowY, size: 10, font: fontRegular, color: muted });
    page.drawText(value, { x: x + 110, y: rowY, size: 10, font: fontBold, color: ink });
    col += 1;
    if (col >= 2) {
      col = 0;
      rowY -= 13;
    }
  }
  cursorY = rowY - 14;

  // Health
  page.drawText("Health Score", { x: margin, y: cursorY, size: 12, font: fontBold, color: ink });
  cursorY -= 14;
  page.drawText(`${snapshot.health.score}% — ${snapshot.health.label}`, {
    x: margin, y: cursorY, size: 14, font: fontBold, color: accent,
  });
  cursorY -= 14;
  page.drawText(snapshot.health.explanation, { x: margin, y: cursorY, size: 10, font: fontRegular, color: muted });

  // Footer
  page.drawText(
    "All activities and data are securely recorded and aligned with Ozeki Reading Bridge Foundation standards.",
    { x: margin, y: 40, size: 8, font: fontRegular, color: muted },
  );

  const bytes = await pdf.save();

  // Make a clean ASCII filename for the contact
  const safeName = snapshot.identity.fullName.replace(/[^A-Za-z0-9._-]+/g, "_");
  const filename = `Contact_Profile_${safeName}_${contactId}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
