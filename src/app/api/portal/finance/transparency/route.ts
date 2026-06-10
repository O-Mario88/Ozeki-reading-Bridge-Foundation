import { NextResponse } from "next/server";
import { requireFinanceSuperAdmin } from "@/app/api/portal/finance/_utils";
import { logger } from "@/lib/logger";
import {
    listFinancePublicSnapshots,
    listFinanceAuditedStatements,
    generatePublicSnapshot,
    publishPublicSnapshot,
    archivePublicSnapshot,
    publishAuditedStatement,
    archiveAuditedStatement,
} from "@/services/financeService";
import type { FinanceCurrency } from "@/lib/types";

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

function parseCurrency(value: unknown): FinanceCurrency | null {
    if (value === "UGX" || value === "USD") {
        return value;
    }
    return null;
}

function parsePositiveInt(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

function parseQuarter(value: unknown): "Q1" | "Q2" | "Q3" | "Q4" | null {
    if (value === "Q1" || value === "Q2" || value === "Q3" || value === "Q4") {
        return value;
    }
    return null;
}

export async function GET(request: Request) {
    try {
        const auth = await requireFinanceSuperAdmin();
        if (auth.error) return auth.error;

        const { searchParams } = new URL(request.url);
        const publishedOnly = searchParams.get("publishedOnly") === "true";

        const snapshots = await listFinancePublicSnapshots({ publishedOnly });
        const audited = await listFinanceAuditedStatements({ publishedOnly });

        return NextResponse.json({ snapshots, audited });
    } catch (error: unknown) {
        logger.error("[portal/finance/transparency] GET failed", { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json(
            { error: errorMessage(error, "Failed to load transparency data") },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireFinanceSuperAdmin();
        if (auth.error) return auth.error;

        const action = (await request.json()) as { type?: string; payload?: Record<string, unknown> };
        const payload = action.payload ?? {};

        switch (action.type) {
            case "generate_fy": {
                const fy = parsePositiveInt(payload.fy);
                const currency = parseCurrency(payload.currency);
                if (!fy || !currency) throw new Error("Missing fy or currency");
                const id = await generatePublicSnapshot(auth.actor, { fy, currency });
                return NextResponse.json({ success: true, id });
            }
            case "generate_quarterly": {
                const fy = parsePositiveInt(payload.fy);
                const quarter = parseQuarter(payload.quarter);
                const currency = parseCurrency(payload.currency);
                if (!fy || !quarter || !currency) throw new Error("Missing params");
                const id = await generatePublicSnapshot(auth.actor, { fy, quarter, currency });
                return NextResponse.json({ success: true, id });
            }
            case "publish_snapshot": {
                const id = parsePositiveInt(payload.id);
                const confirmation = String(payload.confirmation ?? "");
                if (!id) throw new Error("Invalid snapshot id");
                await publishPublicSnapshot(auth.actor, id, confirmation);
                return NextResponse.json({ success: true });
            }
            case "archive_snapshot": {
                const id = parsePositiveInt(payload.id);
                if (!id) throw new Error("Invalid snapshot id");
                await archivePublicSnapshot(auth.actor, id);
                return NextResponse.json({ success: true });
            }
            case "publish_audited": {
                const id = parsePositiveInt(payload.id);
                const confirmation = String(payload.confirmation ?? "");
                if (!id) throw new Error("Invalid audited statement id");
                await publishAuditedStatement(auth.actor, id, confirmation);
                return NextResponse.json({ success: true });
            }
            case "archive_audited": {
                const id = parsePositiveInt(payload.id);
                if (!id) throw new Error("Invalid audited statement id");
                await archiveAuditedStatement(auth.actor, id);
                return NextResponse.json({ success: true });
            }
            default:
                return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
        }
    } catch (error: unknown) {
        logger.error("[portal/finance/transparency] POST failed", { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json(
            { error: errorMessage(error, "Failed to process transparency action") },
            { status: 500 },
        );
    }
}
