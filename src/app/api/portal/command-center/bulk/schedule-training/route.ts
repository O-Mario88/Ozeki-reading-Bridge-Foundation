import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { bulkScheduleTrainingPostgres } from "@/lib/server/postgres/repositories/command-center";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const schema = z.object({
  schoolIds: z.array(z.number().int().positive()).min(1).max(200),
  topic: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  scheduledDate: z.string(),
  scheduledStartTime: z.string().optional(),
  venue: z.string().max(200).optional(),
  facilitatorUserId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requirePortalUser();
    const body = await request.json();
    const parsed = schema.parse(body);

    const result = await bulkScheduleTrainingPostgres({
      ...parsed,
      createdByUserId: user.id,
    });

    await auditLog({
      actor: user,
      action: "bulk_create",
      targetTable: "training_records",
      after: { topic: parsed.topic, scheduledDate: parsed.scheduledDate, schoolIds: parsed.schoolIds },
      detail: `Bulk-scheduled "${parsed.topic}" across ${parsed.schoolIds.length} schools on ${parsed.scheduledDate}`,
      request,
    });
    return NextResponse.json({
      ok: true,
      ...result,
      schoolCount: parsed.schoolIds.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/portal/command-center/bulk/schedule-training]", error);
    return NextResponse.json({ error: "Bulk scheduling failed" }, { status: 500 });
  }
}
