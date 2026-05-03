import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import {
  getTrainingFollowUpsPostgres,
  seedTrainingFollowUpsPostgres,
} from "@/lib/server/postgres/repositories/training-intelligence";
import { clampLimit } from "@/lib/server/http/pagination";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const overdue = searchParams.get("overdue") === "1";
    const status = searchParams.get("status") || undefined;
    const mine = searchParams.get("mine") === "1";
    const limit = clampLimit(searchParams.get("limit"), 100, 500);

    const rows = await getTrainingFollowUpsPostgres({
      ownerUserId: mine ? user.id : undefined,
      status,
      overdue,
      limit,
    });
    return NextResponse.json({ data: rows, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("[api/portal/training/follow-ups GET]", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}

const seedSchema = z.object({
  trainingId: z.number().int().positive(),
  schoolId: z.number().int().positive(),
  ownerUserId: z.number().int().positive(),
  trainingDate: z.string(),
  planId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    await requirePortalUser();
    const body = await request.json();
    const parsed = seedSchema.parse(body);

    // Ensure a plan exists; reuse or create a lightweight default plan
    let planId = parsed.planId;
    if (!planId) {
      const existing = await queryPostgres(
        `SELECT plan_id FROM intervention_plan
         WHERE school_id = $1 AND status IN ('planned', 'in_progress')
         ORDER BY created_at DESC LIMIT 1`,
        [parsed.schoolId],
      ).catch(() => ({ rows: [] as Array<{ plan_id: number }> }));
      if (existing.rows.length > 0) {
        planId = Number(existing.rows[0].plan_id);
      } else {
        const created = await queryPostgres(
          `INSERT INTO intervention_plan (scope_type, scope_id, school_id, title, created_by, status)
           VALUES ('school', $1::text, $1, 'Training Follow-Up Protocol', $2, 'in_progress')
           RETURNING plan_id`,
          [parsed.schoolId, parsed.ownerUserId],
        ).catch(() => ({ rows: [] as Array<{ plan_id: number }> }));
        planId = created.rows.length > 0 ? Number(created.rows[0].plan_id) : 0;
      }
    }

    if (!planId) {
      return NextResponse.json({ error: "Could not resolve intervention plan" }, { status: 500 });
    }

    const result = await seedTrainingFollowUpsPostgres({
      trainingId: parsed.trainingId,
      schoolId: parsed.schoolId,
      planId,
      ownerUserId: parsed.ownerUserId,
      trainingDate: parsed.trainingDate,
    });
    return NextResponse.json({ ok: true, ...result, planId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/portal/training/follow-ups POST]", error);
    return NextResponse.json({ error: "Failed to seed follow-ups" }, { status: 500 });
  }
}
