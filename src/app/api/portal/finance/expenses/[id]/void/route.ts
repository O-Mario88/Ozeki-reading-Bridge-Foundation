import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceSuperAdmin } from "@/app/api/portal/finance/_utils";
import { voidFinanceExpense } from "@/lib/finance-db";

export const runtime = "nodejs";

const bodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinanceSuperAdmin();
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
    const expense = voidFinanceExpense(expenseId, parsed.reason, auth.actor);
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

