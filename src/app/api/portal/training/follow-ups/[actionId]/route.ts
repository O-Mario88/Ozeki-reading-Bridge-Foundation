import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["planned", "in_progress", "completed", "paused"]).optional(),
  outcomeNotes: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
  visitId: z.number().int().positive().optional(),
});

type RouteContext = { params: Promise<{ actionId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await requirePortalUser();
    const { actionId } = await params;
    const id = Number(actionId);
    if (!id) {
      return NextResponse.json({ error: "Invalid action id" }, { status: 400 });
    }
    const body = await request.json();
    const parsed = patchSchema.parse(body);

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (parsed.status) {
      updates.push(`status = $${i++}`);
      values.push(parsed.status);
    }
    if (parsed.outcomeNotes !== undefined) {
      updates.push(`outcome_notes = $${i++}`);
      values.push(parsed.outcomeNotes);
    }
    if (parsed.dueDate) {
      updates.push(`due_date = $${i++}`);
      values.push(parsed.dueDate);
    }
    if (parsed.visitId) {
      updates.push(`visit_id = $${i++}`);
      values.push(parsed.visitId);
    }
    updates.push(`updated_at = NOW()`);
    values.push(id);

    if (updates.length === 1) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    await queryPostgres(
      `UPDATE intervention_actions SET ${updates.join(", ")} WHERE action_id = $${i}`,
      values,
    );
    return NextResponse.json({ ok: true, actionId: id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/portal/training/follow-ups PATCH]", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
