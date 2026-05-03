import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { postFinanceExpenseAsync } from "@/services/financeService";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { readOptionalJsonBody, JsonBodyError } from "@/lib/server/http/json-body";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

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
    await readOptionalJsonBody(request); // body is optional but must be valid JSON if present
    const updatedExpense = await postFinanceExpenseAsync(Number(id), auth.actor);
    await auditLog({
      actor: { id: auth.actor.id, name: auth.actor.userName },
      action: "post",
      targetTable: "finance_expenses",
      targetId: expenseId,
      after: updatedExpense,
      detail: "Expense posted to ledger",
      request,
    });
    return NextResponse.json({ expense: updatedExpense });
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    console.error("[api/portal/finance/expenses/post]", error);
    return NextResponse.json({ error: "Failed to post expense." }, { status: 400 });
  }
}
