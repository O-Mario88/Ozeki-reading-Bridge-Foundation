import { NextRequest, NextResponse } from "next/server";
import { requireFinanceSuperAdmin } from "@/app/api/portal/finance/_utils";
import {
    createStatementLine,
    listStatementLines,
    matchStatementLineToLedger,
    unmatchStatementLine,
    autoSuggestMatches,
    getReconciliationSummary,
    listFinanceLedgerTransactions,
} from "@/lib/finance-db";
import type { FinanceCurrency, FinanceMatchStatus, FinanceStatementAccountType } from "@/lib/types";

/* GET — list statement lines + unmatched ledger transactions + summary */
export async function GET(request: NextRequest) {
    const { error, actor } = await requireFinanceSuperAdmin();
    if (error || !actor) return error!;

    const url = new URL(request.url);
    const accountType = (url.searchParams.get("accountType") || undefined) as FinanceStatementAccountType | undefined;
    const matchStatus = (url.searchParams.get("matchStatus") || undefined) as FinanceMatchStatus | undefined;
    const month = url.searchParams.get("month") || undefined;
    const currency = (url.searchParams.get("currency") || "UGX") as FinanceCurrency;

    const lines = listStatementLines({ accountType, matchStatus, month });
    const unmatchedLedger = listFinanceLedgerTransactions({}).filter((t) => t.postedStatus === "posted");
    const summary = month ? getReconciliationSummary(month, currency) : null;

    return NextResponse.json({ lines, unmatchedLedger, summary });
}

/* POST — create statement line or match/unmatch */
export async function POST(request: NextRequest) {
    const { error, actor } = await requireFinanceSuperAdmin();
    if (error || !actor) return error!;

    const body = await request.json();
    const action = body.action as string;

    try {
        if (action === "create_line") {
            const line = createStatementLine(actor, {
                accountType: body.accountType,
                date: body.date,
                amount: Number(body.amount),
                currency: body.currency || "UGX",
                reference: body.reference,
                description: body.description,
            });
            return NextResponse.json({ line });
        }

        if (action === "match") {
            const match = matchStatementLineToLedger(
                actor,
                Number(body.statementLineId),
                Number(body.ledgerTxnId),
                Number(body.matchedAmount),
            );
            return NextResponse.json({ match });
        }

        if (action === "unmatch") {
            unmatchStatementLine(actor, Number(body.matchId));
            return NextResponse.json({ ok: true });
        }

        if (action === "auto_suggest") {
            const suggestions = autoSuggestMatches(Number(body.statementLineId));
            return NextResponse.json({ suggestions });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 400 },
        );
    }
}
