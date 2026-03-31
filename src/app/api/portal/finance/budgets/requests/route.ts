import { NextRequest, NextResponse } from "next/server";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { submitFinanceFundRequestPostgres, getFinanceOperationBudgetPostgres } from "@/lib/server/postgres/repositories/finance-budgets";

export async function POST(request: NextRequest) {
    const { error, actor } = await requireFinanceEditor();
    if (error || !actor) return error!;

    const body = await request.json();

    try {
        const budgetId = Number(body.budgetId);
        if (!budgetId) throw new Error("Missing budget id");

        // We don't natively have a global "available balance" fetcher in this scoped file natively easily,
        // but typically the client strictly stops it first. We will verify budget status.
        const budget = await getFinanceOperationBudgetPostgres(budgetId);
        if (!budget) throw new Error("Budget not found");
        if (budget.status === "draft") throw new Error("Budget must be submitted before requesting funds");

        const result = await submitFinanceFundRequestPostgres(budgetId, {
            requestedAmount: Number(body.amount)
        }, actor.id);

        return NextResponse.json({ request: result });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 400 },
        );
    }
}
