import { NextRequest, NextResponse } from "next/server";
import { requireFinanceSuperAdmin } from "@/app/api/portal/finance/_utils";
import {
    upsertMonthlyBudget,
    listMonthlyBudgets,
    getBudgetVsActual,
} from "@/lib/finance-db";
import type { FinanceCurrency } from "@/lib/types";

/* GET — list budgets or budget vs actual for a month */
export async function GET(request: NextRequest) {
    const { error, actor } = await requireFinanceSuperAdmin();
    if (error || !actor) return error!;

    const url = new URL(request.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const currency = (url.searchParams.get("currency") || "UGX") as FinanceCurrency;
    const mode = url.searchParams.get("mode");

    if (mode === "variance") {
        const lines = getBudgetVsActual(month, currency);
        return NextResponse.json({ month, currency, lines });
    }

    const budgets = listMonthlyBudgets(month, currency);
    return NextResponse.json({ month, currency, budgets });
}

/* POST — upsert a budget line */
export async function POST(request: NextRequest) {
    const { error, actor } = await requireFinanceSuperAdmin();
    if (error || !actor) return error!;

    const body = await request.json();

    try {
        const record = upsertMonthlyBudget(actor, {
            month: body.month,
            currency: body.currency || "UGX",
            subcategory: body.subcategory,
            budgetAmount: Number(body.budgetAmount),
        });
        return NextResponse.json({ budget: record });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 400 },
        );
    }
}
