import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { postFinanceExpenseAsync } from "@/lib/finance-db";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

const bodySchema = z.object({
  overrideReason: z.string().trim().max(500).optional(),
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
    const parsed = bodySchema.parse(await request.json().catch(() => ({})));
    const expense = await postFinanceExpenseAsync(expenseId, auth.actor, {
      overrideReason: parsed.overrideReason,
    });
    return NextResponse.json({ expense });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to post expense." },
      { status: 400 },
    );
  }
}
