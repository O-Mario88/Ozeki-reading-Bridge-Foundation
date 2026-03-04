import { NextResponse } from "next/server";
import { requireFinanceSuperAdmin } from "@/app/api/portal/finance/_utils";
import {
    listFinancePublicSnapshots,
    listFinanceAuditedStatements,
    generatePublicSnapshot,
    publishPublicSnapshot,
    archivePublicSnapshot,
    publishAuditedStatement,
    archiveAuditedStatement,
} from "@/lib/finance-db";
import type { FinanceCurrency } from "@/lib/types";

export async function GET(request: Request) {
    try {
        const auth = await requireFinanceSuperAdmin();
        if (auth.error) return auth.error;

        const { searchParams } = new URL(request.url);
        const publishedOnly = searchParams.get("publishedOnly") === "true";

        const snapshots = listFinancePublicSnapshots({ publishedOnly });
        const audited = listFinanceAuditedStatements({ publishedOnly });

        return NextResponse.json({ snapshots, audited });
    } catch (error: Omit<Error, "name"> | any) {
        console.error("GET /api/portal/finance/transparency error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to load transparency data" },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireFinanceSuperAdmin();
        if (auth.error) return auth.error;

        const action = await request.json();

        switch (action.type) {
            case "generate_fy": {
                const { fy, currency } = action.payload;
                if (!fy || !currency) throw new Error("Missing fy or currency");
                const id = await generatePublicSnapshot(auth.actor, { fy, currency: currency as FinanceCurrency });
                return NextResponse.json({ success: true, id });
            }
            case "generate_quarterly": {
                const { fy, quarter, currency } = action.payload;
                if (!fy || !quarter || !currency) throw new Error("Missing params");
                const id = await generatePublicSnapshot(auth.actor, { fy, quarter, currency: currency as FinanceCurrency });
                return NextResponse.json({ success: true, id });
            }
            case "publish_snapshot": {
                const { id, confirmation } = action.payload;
                publishPublicSnapshot(auth.actor, id, confirmation);
                return NextResponse.json({ success: true });
            }
            case "archive_snapshot": {
                const { id } = action.payload;
                archivePublicSnapshot(auth.actor, id);
                return NextResponse.json({ success: true });
            }
            case "publish_audited": {
                const { id, confirmation } = action.payload;
                publishAuditedStatement(auth.actor, id, confirmation);
                return NextResponse.json({ success: true });
            }
            case "archive_audited": {
                const { id } = action.payload;
                archiveAuditedStatement(auth.actor, id);
                return NextResponse.json({ success: true });
            }
            default:
                return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
        }
    } catch (error: Omit<Error, "name"> | any) {
        console.error("POST /api/portal/finance/transparency error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to process transparency action" },
            { status: 500 },
        );
    }
}
