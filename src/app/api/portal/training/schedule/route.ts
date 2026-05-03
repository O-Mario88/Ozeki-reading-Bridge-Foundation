import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { getUpcomingTrainingsPostgres } from "@/lib/server/postgres/repositories/training-intelligence";
import { clampLimit } from "@/lib/server/http/pagination";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const district = searchParams.get("district") ?? undefined;
    const limit = clampLimit(searchParams.get("limit"), 100, 500);
    const data = await getUpcomingTrainingsPostgres({ fromDate: from, toDate: to, district, limit });
    return NextResponse.json({ data, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("[api/portal/training/schedule GET]", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}

const createSchema = z.object({
  topic: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  scheduledDate: z.string(),
  scheduledStartTime: z.string().optional(),
  scheduledEndTime: z.string().optional(),
  venue: z.string().max(200).optional(),
  district: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  facilitatorUserId: z.number().int().positive().optional(),
  capacity: z.number().int().positive().optional(),
  audience: z.string().max(200).optional(),
  status: z.enum(["scheduled", "open_registration"]).optional().default("scheduled"),
});

export async function POST(request: Request) {
  try {
    const user = await requirePortalUser();
    const body = await request.json();
    const parsed = createSchema.parse(body);

    const result = await queryPostgres(
      `INSERT INTO training_schedule (
         topic, description, scheduled_date, scheduled_start_time, scheduled_end_time,
         venue, district, region, facilitator_user_id, capacity, audience, status,
         created_by_user_id
       ) VALUES (
         $1, $2, $3::date, $4, $5,
         $6, $7, $8, $9, $10, $11, $12, $13
       ) RETURNING id`,
      [
        parsed.topic,
        parsed.description ?? null,
        parsed.scheduledDate,
        parsed.scheduledStartTime ?? null,
        parsed.scheduledEndTime ?? null,
        parsed.venue ?? null,
        parsed.district ?? null,
        parsed.region ?? null,
        parsed.facilitatorUserId ?? null,
        parsed.capacity ?? null,
        parsed.audience ?? null,
        parsed.status,
        user.id,
      ],
    );
    return NextResponse.json({ ok: true, id: Number(result.rows[0]?.id) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/portal/training/schedule POST]", error);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}
