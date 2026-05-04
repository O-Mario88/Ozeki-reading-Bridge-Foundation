import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCurrentPortalUser, isPortalVolunteer } from "@/lib/auth";
import { getCurrentExternalUser } from "@/lib/external-auth";
import { auditLog } from "@/lib/server/audit/log";
import {
  getLearnerPassportProfile,
  listLearnerAssessments,
  type AssessmentEntry,
} from "@/lib/server/postgres/repositories/learner-passport";

export const runtime = "nodejs";

const STAGE_RECOMMENDATIONS: Record<string, string[]> = {
  pre_reader: [
    "Start with sound-rich picture books — point to letters as you say their sound.",
    "Sing the alphabet song daily.",
    "Make letter shapes from sand, beans, or sticks.",
  ],
  emergent: [
    "Decodable readers with simple consonant-vowel-consonant words.",
    "Read aloud to your child for 10 minutes a day, then have them repeat short sentences.",
    "Practise blending sounds: /c/-/a/-/t/ → cat.",
  ],
  minimum: [
    "Easy chapter books with repetition.",
    "Ask your child to retell the story in their own words.",
    "Hunt for words that start with the same letter on shop signs walking home.",
  ],
  competent: [
    "Stories with chapters and rich vocabulary.",
    "Discuss a new word a day at supper.",
    "Take turns reading a paragraph each.",
  ],
  strong: [
    "Newspapers, longer fiction, and non-fiction.",
    "Encourage your child to write short summaries of what they read.",
    "Visit the library together once a week.",
  ],
};

async function authoriseDownload(uid: string): Promise<{ allowed: boolean; actorName: string }> {
  const portal = await getCurrentPortalUser();
  if (portal && !isPortalVolunteer(portal)) {
    return { allowed: true, actorName: portal.fullName };
  }
  const external = await getCurrentExternalUser();
  if (external && (external.role === "teacher" || external.role === "parent" || external.role === "district_officer")) {
    // For v1 we trust the role; in the future this should verify
    // teacher → school link, parent → learner link.
    void uid;
    return { allowed: true, actorName: `${external.fullName} (${external.role})` };
  }
  return { allowed: false, actorName: "anonymous" };
}

function rankFromAssessments(entries: AssessmentEntry[]): number | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i]!.readingStageOrder !== null) return entries[i]!.readingStageOrder!;
  }
  return null;
}

function stageLabel(order: number | null): string {
  switch (order) {
    case 0: return "Pre-reader";
    case 1: return "Emergent";
    case 2: return "Minimum";
    case 3: return "Competent";
    case 4: return "Strong";
    default: return "—";
  }
}

function stageKey(order: number | null): keyof typeof STAGE_RECOMMENDATIONS {
  switch (order) {
    case 0: return "pre_reader";
    case 1: return "emergent";
    case 2: return "minimum";
    case 3: return "competent";
    case 4: return "strong";
    default: return "pre_reader";
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ uid: string }> },
) {
  const { uid } = await context.params;
  const auth = await authoriseDownload(uid);
  if (!auth.allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getLearnerPassportProfile(uid);
  if (!profile) {
    return NextResponse.json({ error: "Learner not found." }, { status: 404 });
  }
  const assessments = await listLearnerAssessments(uid);
  const currentRank = rankFromAssessments(assessments);
  const recs = STAGE_RECOMMENDATIONS[stageKey(currentRank)];

  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();

  const teal = rgb(0.024, 0.416, 0.404);
  const orange = rgb(1, 0.447, 0.207);
  const dark = rgb(0.12, 0.12, 0.15);
  const muted = rgb(0.42, 0.45, 0.5);

  page.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: teal });
  page.drawText("OZEKI READING BRIDGE FOUNDATION", { x: 40, y: height - 38, size: 11, font: helvBold, color: rgb(1, 1, 1) });
  page.drawText("Reading Passport", { x: 40, y: height - 64, size: 24, font: helvBold, color: rgb(1, 1, 1) });
  page.drawText(`Issued ${new Date().toISOString().slice(0, 10)}`, { x: 40, y: height - 88, size: 10, font: helv, color: rgb(0.85, 0.93, 0.93) });

  let y = height - 145;
  page.drawText(profile.learnerName ?? `Learner ${profile.learnerUid}`, { x: 40, y, size: 22, font: helvBold, color: dark });
  y -= 18;
  const subtitleParts = [profile.schoolName ?? "School unknown", profile.district, profile.region].filter(Boolean);
  page.drawText(subtitleParts.join(" · "), { x: 40, y, size: 11, font: helv, color: muted });
  y -= 14;
  const meta = [profile.classGrade && `Class ${profile.classGrade}`, profile.gender, profile.age && `Age ${profile.age}`].filter(Boolean).join(" · ");
  if (meta) {
    page.drawText(meta, { x: 40, y, size: 10, font: helv, color: muted });
    y -= 12;
  }

  // Current stage block
  y -= 18;
  page.drawRectangle({ x: 40, y: y - 70, width: width - 80, height: 70, color: rgb(0.97, 0.99, 0.99), borderColor: teal, borderWidth: 1 });
  page.drawText("Current reading stage", { x: 56, y: y - 22, size: 9, font: helvBold, color: muted });
  page.drawText(stageLabel(currentRank), { x: 56, y: y - 44, size: 22, font: helvBold, color: orange });
  page.drawText(`${assessments.length} assessment${assessments.length === 1 ? "" : "s"} on record`, { x: 56, y: y - 60, size: 9, font: helv, color: muted });
  y -= 90;

  // Journey
  page.drawText("Reading journey", { x: 40, y, size: 12, font: helvBold, color: dark });
  y -= 14;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, color: muted, thickness: 0.5 });
  y -= 10;
  if (assessments.length === 0) {
    page.drawText("No assessments on file yet.", { x: 40, y, size: 10, font: helv, color: muted });
    y -= 14;
  } else {
    for (const a of assessments.slice(-12)) {
      if (y < 240) break;
      const stage = a.readingStageLabel ?? stageLabel(a.readingStageOrder);
      page.drawCircle({ x: 50, y: y + 2, size: 3, color: teal });
      page.drawText(`${a.assessmentDate}`, { x: 60, y, size: 9, font: helvBold, color: dark });
      page.drawText(`${a.assessmentType ?? "—"} · stage: ${stage}`, { x: 160, y, size: 9, font: helv, color: dark });
      if (a.storyReadingScore !== null) {
        page.drawText(`Story: ${a.storyReadingScore}`, { x: width - 130, y, size: 9, font: helv, color: muted });
      }
      y -= 14;
    }
  }

  // Recommendations
  y -= 6;
  page.drawText("What to do at home", { x: 40, y, size: 12, font: helvBold, color: dark });
  y -= 14;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, color: muted, thickness: 0.5 });
  y -= 12;
  for (const rec of recs) {
    if (y < 100) break;
    page.drawText("•", { x: 44, y, size: 10, font: helvBold, color: orange });
    page.drawText(rec, { x: 60, y, size: 10, font: helv, color: dark, maxWidth: width - 100 });
    y -= 16;
  }

  // Footer
  page.drawText(
    "This Reading Passport is generated from the Ozeki Reading Bridge Foundation database. " +
      "Show it to your child's teacher at the start of each term to plan together.",
    { x: 40, y: 60, size: 8, font: helv, color: muted, maxWidth: width - 80 },
  );
  page.drawText(`Learner reference: ${profile.learnerUid}`, { x: 40, y: 40, size: 8, font: helv, color: muted });

  const bytes = await pdf.save();

  await auditLog({
    actor: { id: 0, name: auth.actorName },
    action: "download",
    targetTable: "school_learners",
    detail: `Reading passport generated for learner ${profile.learnerUid} (${profile.schoolName ?? "school unknown"})`,
    request,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reading-passport-${profile.learnerUid}.pdf"`,
    },
  });
}
