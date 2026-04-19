import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  listWorkflowsPostgres,
  createWorkflowPostgres,
  type WorkflowCondition,
  type WorkflowAction,
} from "@/lib/server/postgres/repositories/workflows";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const data = await listWorkflowsPostgres({});
    return NextResponse.json({ data, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("[api/portal/workflows GET]", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "contains", "exists"]),
  value: z.unknown().optional(),
});
const actionSchema = z.object({
  type: z.enum(["email_admins", "seed_intervention", "issue_lesson_certificate", "issue_training_certificate", "publish_event", "log"]),
}).passthrough();
const createSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  triggerEvent: z.string().min(2).max(100),
  conditions: z.array(conditionSchema).max(20),
  actions: z.array(actionSchema).min(1).max(10),
  isEnabled: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const parsed = createSchema.parse(body);
    const id = await createWorkflowPostgres({
      name: parsed.name,
      description: parsed.description,
      triggerEvent: parsed.triggerEvent,
      conditions: parsed.conditions as WorkflowCondition[],
      actions: parsed.actions as WorkflowAction[],
      createdByUserId: user.id,
      isEnabled: parsed.isEnabled,
    });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/portal/workflows POST]", error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
