import { NextResponse } from "next/server";
import { requireFinanceSuperAdmin } from "@/app/api/portal/finance/_utils";
import { uploadAuditedStatement } from "@/services/financeService";
import { getRuntimeDataDir } from "@/lib/runtime-paths";
import { auditLog } from "@/lib/server/audit/log";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

export async function POST(request: Request) {
    try {
        const auth = await requireFinanceSuperAdmin();
        if (auth.error) return auth.error;

        const formData = await request.formData();
        const fileEntry = formData.get("file");
        const fy = parseInt(String(formData.get("fy") ?? ""), 10);
        const auditorName = (formData.get("auditorName") as string) || undefined;
        const auditCompletedDate = (formData.get("auditCompletedDate") as string) || undefined;
        const notes = (formData.get("notes") as string) || undefined;

        if (!(fileEntry instanceof File) || isNaN(fy)) {
            return NextResponse.json({ error: "File and valid FY are required" }, { status: 400 });
        }
        const file = fileEntry;

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json({ error: "Only PDFs are allowed." }, { status: 400 });
        }

        const PDF_MIME_TYPES = new Set(["application/pdf", "application/x-pdf"]);
        if (file.type && !PDF_MIME_TYPES.has(file.type.toLowerCase())) {
            return NextResponse.json({ error: "Uploaded file does not appear to be a PDF." }, { status: 400 });
        }

        const MAX_SIZE = 20 * 1024 * 1024; // 20 MB for audited financial statements
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: "File exceeds the 20 MB size limit." }, { status: 400 });
        }

        const folder = path.join(getRuntimeDataDir(), "finance", "audited");
        await fs.mkdir(folder, { recursive: true });

        const safeFilename = crypto.randomBytes(16).toString("hex") + ".pdf";
        const storedPath = path.join(folder, safeFilename);

        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(storedPath, buffer);

        const id = uploadAuditedStatement(
            auth.actor,
            {
                fy,
                storedPath,
                originalFilename: file.name,
                auditorName,
                auditCompletedDate,
                notes
            }
        );

        await auditLog({
            actor: { id: auth.actor.id, name: auth.actor.userName },
            action: "create",
            targetTable: "audited_financial_statements",
            targetId: typeof id === "number" ? id : undefined,
            after: {
                fy,
                originalFilename: file.name,
                sizeBytes: buffer.byteLength,
                auditorName,
                auditCompletedDate,
            },
            detail: `Uploaded audited financial statement for FY${fy} (${file.name})`,
            request,
        });

        return NextResponse.json({ success: true, id });
    } catch (error: unknown) {
        const { logger } = await import("@/lib/logger");
        logger.error("[finance/transparency/upload] POST failed", { error: String(error) });
        return NextResponse.json(
            { error: errorMessage(error, "Failed to upload audited statement") },
            { status: 500 }
        );
    }
}
