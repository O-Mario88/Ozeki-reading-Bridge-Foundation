import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  getWorkflowByIdPostgres,
  updateWorkflowPostgres,
  getWorkflowExecutionStatsPostgres,
  type WorkflowCondition,
  type WorkflowAction,
} from "@/lib/server/postgres/repositories/workflows";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await params;
    const wf = await getWorkflowByIdPostgres(Number(id));
    if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const stats = await getWorkflowExecutionStatsPostgres(wf.id);
    return NextResponse.json({ workflow: wf, stats });
  } catch (error) {
    console.error("[api/portal/workflows GET]", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}

const patchSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  triggerEvent: z.string().min(2).max(100).optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "contains", "exists"]),
    value: z.unknown().optional(),
  })).optional(),
  actions: z.array(z.object({ type: z.string() }).passthrough()).optional(),
  isEnabled: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.parse(body);
    await updateWorkflowPostgres(Number(id), {
      ...parsed,
      description: parsed.description === undefined ? undefined : parsed.description ?? null,
      conditions: parsed.conditions as WorkflowCondition[] | undefined,
      actions: parsed.actions as WorkflowAction[] | undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/portal/workflows PATCH]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
