import { NextResponse } from "next/server";
import { z } from "zod";
import { updateInterventionActionAsync } from "@/lib/national-intelligence-async";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { canManageNationalInterventions } from "@/lib/national-intelligence-auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  ownerUserId: z.coerce.number().int().positive().optional(),
  dueDate: z.string().trim().nullable().optional(),
  status: z.enum(["planned", "in_progress", "completed", "paused"]).optional(),
  visitId: z.coerce.number().int().positive().nullable().optional(),
  trainingId: z.coerce.number().int().positive().nullable().optional(),
  assessmentId: z.coerce.number().int().positive().nullable().optional(),
  storyActivityId: z.coerce.number().int().positive().nullable().optional(),
  outcomeNotes: z.string().trim().max(4000).nullable().optional(),
});

function toActionId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid action id.");
  }
  return id;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ actionId: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageNationalInterventions(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await context.params;
    const actionId = toActionId(params.actionId);
    const payload = patchSchema.parse(await request.json());

    await updateInterventionActionAsync({
      user,
      actionId,
      input: {
        ownerUserId: payload.ownerUserId,
        dueDate: payload.dueDate,
        status: payload.status,
        visitId: payload.visitId,
        trainingId: payload.trainingId,
        assessmentId: payload.assessmentId,
        storyActivityId: payload.storyActivityId,
        outcomeNotes: payload.outcomeNotes,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid intervention action patch payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      const status = error.message.toLowerCase().includes("not found") ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
