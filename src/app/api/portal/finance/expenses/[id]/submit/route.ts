import { NextRequest, NextResponse } from "next/server";
import { submitFinanceExpenseAsync } from "@/services/financeService";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
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
    const expense = await submitFinanceExpenseAsync(expenseId, auth.actor);
    return NextResponse.json({ expense });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit expense." },
      { status: 400 },
    );
  }
}
