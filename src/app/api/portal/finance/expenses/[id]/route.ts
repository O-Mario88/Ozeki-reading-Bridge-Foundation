import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteFinanceExpenseDraftAsync,
  getFinanceExpenseById,
  listFinanceExpenseReceipts,
  voidFinanceExpenseAsync,
} from "@/services/financeService";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

const deleteSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }
  const { id } = await context.params;
  const expenseId = Number(id);
  if (!Number.isFinite(expenseId)) {
    return NextResponse.json({ error: "Invalid expense id." }, { status: 400 });
  }
  const expense = await getFinanceExpenseById(expenseId);
  if (!expense) {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  }
  const receipts = await listFinanceExpenseReceipts(expenseId);
  return NextResponse.json({ expense, receipts });
}

export async function DELETE(
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
    const parsed = deleteSchema.parse(await request.json());
    const current = await getFinanceExpenseById(expenseId);
    if (!current) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    if (current.status === "draft") {
      const deleted = await deleteFinanceExpenseDraftAsync(expenseId, parsed.reason, auth.actor);
      return NextResponse.json({ deleted, expense: null });
    }

    const expense = await voidFinanceExpenseAsync(expenseId, parsed.reason, auth.actor);
    return NextResponse.json({ deleted: null, expense });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete or void expense." },
      { status: 400 },
    );
  }
}
