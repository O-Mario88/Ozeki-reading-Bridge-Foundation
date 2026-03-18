import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addInterventionActionAsync,
  listInterventionActionsAsync,
  listInterventionActionTypes,
} from "@/lib/national-intelligence-async";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { canManageNationalInterventions } from "@/lib/national-intelligence-auth";

export const runtime = "nodejs";

const actionTypeSchema = z.enum([
  "Remedial & Catch-up program",
  "Teacher coaching cycle",
  "Teacher catch-up training",
  "Leadership mentoring",
  "Assessment support",
  "1001 Story activation/publishing support",
]);

const postSchema = z.object({
  actionType: actionTypeSchema,
  ownerUserId: z.coerce.number().int().positive(),
  dueDate: z.string().trim().optional(),
  status: z.enum(["planned", "in_progress", "completed", "paused"]).optional(),
  visitId: z.coerce.number().int().positive().nullable().optional(),
  trainingId: z.coerce.number().int().positive().nullable().optional(),
  assessmentId: z.coerce.number().int().positive().nullable().optional(),
  storyActivityId: z.coerce.number().int().positive().nullable().optional(),
  outcomeNotes: z.string().trim().max(4000).optional(),
});

function toPlanId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid plan id.");
  }
  return id;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ planId: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageNationalInterventions(user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await context.params;
    const planId = toPlanId(params.planId);

    return NextResponse.json({
      actionTypes: listInterventionActionTypes(),
      actions: await listInterventionActionsAsync(planId),
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ planId: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageNationalInterventions(user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await context.params;
    const planId = toPlanId(params.planId);
    const payload = postSchema.parse(await request.json());

    const actionId = await addInterventionActionAsync({
      user,
      input: {
        planId,
        actionType: payload.actionType,
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

    return NextResponse.json({
      ok: true,
      actionId,
      actions: await listInterventionActionsAsync(planId),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid intervention action payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
