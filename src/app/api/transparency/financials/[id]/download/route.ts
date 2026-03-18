import { NextResponse } from "next/server";
import { listFinancePublicSnapshots, listFinanceAuditedStatements } from "@/services/financeService";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function getErrorCode(error: unknown) {
    if (typeof error !== "object" || error === null) {
        return undefined;
    }
    const maybeCode = (error as { code?: unknown }).code;
    return typeof maybeCode === "string" ? maybeCode : undefined;
}

export async function GET(
    request: Request,
    segmentData: { params: Params }
) {
    try {
        const params = await segmentData.params;
        const id = parseInt(params.id, 10);
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type"); // "snapshot" or "audited"

        if (isNaN(id) || !type) {
            return new NextResponse("Invalid request", { status: 400 });
        }

        let storedPath: string | null = null;
        let filename = "document.pdf";

        if (type === "snapshot") {
            const allDrafts = await listFinancePublicSnapshots();
            const target = allDrafts.find(s => s.id === id);
            if (!target || target.status !== "published") {
                return new NextResponse("Not found or not published", { status: 404 });
            }
            storedPath = target.storedPath;
            filename = target.quarter
                ? `Ledger_Snapshot_FY${target.fy}_${target.quarter}.pdf`
                : `Ledger_Snapshot_FY${target.fy}_Annual.pdf`;
        } else if (type === "audited") {
            const allAudits = await listFinanceAuditedStatements();
            const target = allAudits.find(a => a.id === id);
            if (!target || target.status !== "published") {
                return new NextResponse("Not found or not published", { status: 404 });
            }
            storedPath = typeof target.storedPath === "string" ? target.storedPath : null;
            filename = `Audited_Statement_FY${target.fy}.pdf`;
        } else {
            return new NextResponse("Invalid type", { status: 400 });
        }

        if (!storedPath) {
            return new NextResponse("File path missing", { status: 404 });
        }

        const fullPath = path.resolve(storedPath);
        if (!fullPath.startsWith(path.resolve("data/finance"))) {
            return new NextResponse("Invalid file path", { status: 403 });
        }

        const fileBuffer = await fs.readFile(fullPath);

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${filename}"`,
            },
        });
    } catch (error: unknown) {
        if (getErrorCode(error) === "ENOENT") {
            return new NextResponse("File not found on disk", { status: 404 });
        }
        console.error("Download error:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
