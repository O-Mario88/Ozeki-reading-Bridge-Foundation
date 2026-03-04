import { NextResponse } from "next/server";
import { requireFinanceSuperAdmin } from "@/app/api/portal/finance/_utils";
import { uploadAuditedStatement } from "@/lib/finance-db";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export async function POST(request: Request) {
    try {
        const auth = await requireFinanceSuperAdmin();
        if (auth.error) return auth.error;

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const fy = parseInt(formData.get("fy") as string, 10);
        const auditorName = (formData.get("auditorName") as string) || undefined;
        const auditCompletedDate = (formData.get("auditCompletedDate") as string) || undefined;
        const notes = (formData.get("notes") as string) || undefined;

        if (!file || isNaN(fy)) {
            return NextResponse.json({ error: "File and valid FY are required" }, { status: 400 });
        }

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json({ error: "Only PDFs are allowed" }, { status: 400 });
        }

        const folder = path.join(process.cwd(), "data", "finance", "audited");
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

        return NextResponse.json({ success: true, id });
    } catch (error: Omit<Error, "name"> | any) {
        console.error("POST /api/portal/finance/transparency/upload error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to upload audited statement" },
            { status: 500 }
        );
    }
}
