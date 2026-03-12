import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { updateFinanceAuditExceptionStatusAsync } from "@/lib/finance-db";

export const runtime = "nodejs";

const bodySchema = z.object({
  status: z.enum(["acknowledged", "resolved", "overridden"]),
  notes: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }
  const { id } = await context.params;
  const exceptionId = Number(id);
  if (!Number.isFinite(exceptionId)) {
    return NextResponse.json({ error: "Invalid exception id." }, { status: 400 });
  }

  try {
    const parsed = bodySchema.parse(await request.json());
    const exception = await updateFinanceAuditExceptionStatusAsync(
      exceptionId,
      {
        status: parsed.status,
        notes: parsed.notes,
      },
      auth.actor,
    );
    return NextResponse.json({ exception });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update audit exception." },
      { status: 400 },
    );
  }
}
