import { NextRequest, NextResponse } from "next/server";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { getRestrictedFundsSummary } from "@/lib/finance-db";
import type { FinanceCurrency } from "@/lib/types";

/* GET — restricted funds balance summary */
export async function GET(request: NextRequest) {
    const { error, actor } = await requireFinanceEditor();
    if (error || !actor) return error!;

    const url = new URL(request.url);
    const currency = (url.searchParams.get("currency") || undefined) as FinanceCurrency | undefined;

    const summary = await getRestrictedFundsSummary(currency);
    return NextResponse.json({ summary });
}
