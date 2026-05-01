import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalStaffUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  visitType: z.string().trim().max(50).optional(),
  coachingCycleNumber: z.coerce.number().int().min(1).max(20).optional(),
  visitReason: z.string().trim().max(200).optional(),
  focusAreas: z.array(z.string()).optional(),
  implementationStatus: z.string().trim().max(50).optional(),
  visitPathway: z.string().trim().max(50).optional(),
  classesImplementing: z.array(z.string()).optional(),
  classesNotImplementing: z.array(z.string()).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  sponsorshipType: z.string().nullable().optional(),
  sponsoredByContactId: z.coerce.number().int().positive().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalStaffUser();
    const { id } = await params;
    const res = await queryPostgres(
      `SELECT cv.*, s.name AS school_name, s.district, u.full_name AS coach_name
       FROM coaching_visits cv
       LEFT JOIN schools_directory s ON s.id = cv.school_id
       LEFT JOIN portal_users u ON u.id = cv.coach_user_id
       WHERE cv.id = $1`,
      [Number(id)],
    );
    if (res.rows.length === 0) return NextResponse.json({ error: "Visit not found." }, { status: 404 });
    return NextResponse.json({ visit: res.rows[0] });
  } catch (error) {
    logger.error("[visits/id] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalStaffUser();
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload." },
        { status: 400 },
      );
    }
    const v = parsed.data;
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    const map: Array<[keyof typeof v, string, (x: unknown) => unknown]> = [
      ["visitDate", "visit_date", (x) => x],
      ["visitType", "visit_type", (x) => x],
      ["coachingCycleNumber", "coaching_cycle_number", (x) => x],
      ["visitReason", "visit_reason", (x) => x],
      ["focusAreas", "focus_areas_json", (x) => JSON.stringify(x)],
      ["implementationStatus", "implementation_status", (x) => x],
      ["visitPathway", "visit_pathway", (x) => x],
      ["classesImplementing", "classes_implementing_json", (x) => JSON.stringify(x)],
      ["classesNotImplementing", "classes_not_implementing_json", (x) => JSON.stringify(x)],
      ["startTime", "time_from", (x) => x],
      ["endTime", "time_to", (x) => x],
      ["sponsorshipType", "sponsorship_type", (x) => x],
      ["sponsoredByContactId", "sponsored_by_contact_id", (x) => x],
    ];
    for (const [field, col, transform] of map) {
      if (v[field] !== undefined) {
        sets.push(`${col} = $${idx++}`);
        vals.push(transform(v[field]));
      }
    }
    if (sets.length === 0) return NextResponse.json({ ok: true, noChanges: true });
    sets.push(`updated_at = NOW()`);
    vals.push(Number(id));
    await queryPostgres(
      `UPDATE coaching_visits SET ${sets.join(", ")} WHERE id = $${idx}`,
      vals,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[visits/id] PATCH failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
