import { NextResponse } from "next/server";
import { listFinancePublicSnapshots, listFinanceAuditedStatements } from "@/lib/finance-db";

export const dynamic = "force-dynamic";

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

export async function GET() {
    try {
        const snapshots = listFinancePublicSnapshots({ publishedOnly: true });
        const audited = listFinanceAuditedStatements({ publishedOnly: true });

        const safeSnapshots = snapshots.map(s => ({
            id: s.id,
            fy: s.fy,
            quarter: s.quarter,
            currency: s.currency,
            snapshotType: s.snapshotType,
            totalIncome: s.totalIncome,
            totalExpenditure: s.totalExpenditure,
            net: s.net,
            programPct: s.programPct,
            adminPct: s.adminPct,
            categoryBreakdownJson: s.categoryBreakdownJson,
            restrictedSummaryJson: s.restrictedSummaryJson,
            publishedAt: s.publishedAt,
        }));

        const safeAudited = audited.map(a => ({
            id: a.id,
            fy: a.fy,
            auditorName: a.auditorName,
            auditCompletedDate: a.auditCompletedDate,
            publishedAt: a.publishedAt,
            notes: a.notes,
            originalFilename: a.originalFilename,
        }));

        return NextResponse.json({
            snapshots: safeSnapshots,
            audited: safeAudited,
        });
    } catch (error: unknown) {
        console.error("GET /api/transparency/financials error:", error);
        return NextResponse.json(
            { error: errorMessage(error, "Failed to load public transparency data") },
            { status: 500 }
        );
    }
}
