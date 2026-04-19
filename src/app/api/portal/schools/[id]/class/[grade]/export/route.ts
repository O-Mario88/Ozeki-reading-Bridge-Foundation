import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { getClassRosterPostgres } from "@/lib/server/postgres/repositories/assessment-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string; grade: string }> };

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalStaffUser();
    const { id, grade } = await params;
    const roster = await getClassRosterPostgres(Number(id), decodeURIComponent(grade));
    if (!roster) return NextResponse.json({ error: "Class not found." }, { status: 404 });

    const headers = ["Learner UID", "Name", "Gender", "Age", "Reading Stage", "Composite Score", "Cycle", "Last Assessed", "Flag Reason"];
    const rows = [headers.join(",")];
    for (const l of roster.learners) {
      rows.push([
        csvCell(l.learnerUid),
        csvCell(l.learnerName),
        csvCell(l.gender),
        csvCell(l.age),
        csvCell(l.latestReadingStage),
        csvCell(l.latestComposite),
        csvCell(l.cycleType),
        csvCell(l.latestAssessmentDate),
        csvCell(l.flagReason),
      ].join(","));
    }

    const csv = rows.join("\n");
    const filename = `class-roster-${roster.schoolId}-${roster.classGrade.replace(/[^A-Za-z0-9-]/g, "_")}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("[class/export] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
