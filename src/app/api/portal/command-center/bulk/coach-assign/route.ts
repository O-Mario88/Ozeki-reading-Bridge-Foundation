import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { bulkAssignCoachPostgres } from "@/lib/server/postgres/repositories/command-center";

export const runtime = "nodejs";

const schema = z.object({
  schoolIds: z.array(z.number().int().positive()).min(1).max(500),
  coachUserId: z.number().int().positive(),
  notes: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const parsed = schema.parse(body);

    const result = await bulkAssignCoachPostgres({
      schoolIds: parsed.schoolIds,
      coachUserId: parsed.coachUserId,
      notes: parsed.notes,
      assignedByUserId: user.id,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      coachUserId: parsed.coachUserId,
      schoolCount: parsed.schoolIds.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/portal/command-center/bulk/coach-assign]", error);
    return NextResponse.json({ error: "Bulk assignment failed" }, { status: 500 });
  }
}
