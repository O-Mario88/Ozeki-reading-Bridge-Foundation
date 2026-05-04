import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { voidFinanceExpenseAsync } from "@/services/financeService";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const bodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }
  const { id } = await context.params;
  const expenseId = Number(id);
  if (!Number.isFinite(expenseId)) {
    return NextResponse.json({ error: "Invalid expense id." }, { status: 400 });
  }

  try {
    const parsed = bodySchema.parse(await request.json());
    const expense = await voidFinanceExpenseAsync(expenseId, parsed.reason, auth.actor);
    await auditLog({
      actor: { id: auth.actor.id, name: auth.actor.userName },
      action: "void",
      targetTable: "finance_expenses",
      targetId: expenseId,
      after: expense,
      detail: parsed.reason,
      request,
    });
    return NextResponse.json({ expense });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to void expense." },
      { status: 400 },
    );
  }
}
