import { NextResponse } from "next/server";
import { getTableRowCounts, purgeAllData, purgeSelectedDataTables } from "@/services/dataService";
import { authorizeSuperAdmin } from "@/app/api/portal/_shared/auth";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

export async function GET() {
    const auth = await authorizeSuperAdmin();
    if (!auth.authorized) {
        return auth.response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ tables: getTableRowCounts() });
}

export async function DELETE(request: Request) {
    const auth = await authorizeSuperAdmin();
    if (!auth.authorized) {
        return auth.response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        let selectedTables: string[] | null = null;
        try {
            const body = (await request.json()) as { tables?: unknown };
            if (Array.isArray(body.tables)) {
                selectedTables = body.tables
                    .map((value) => String(value ?? "").trim())
                    .filter(Boolean);
            }
        } catch {
            selectedTables = null;
        }

        const tables =
            selectedTables && selectedTables.length > 0
                ? purgeSelectedDataTables(selectedTables)
                : purgeAllData();

        if (auth.user) {
            await auditLog({
                actor: auth.user,
                action: "wipe_data",
                targetTable: "_global_purge",
                detail:
                    selectedTables && selectedTables.length > 0
                        ? `Selective purge of tables: ${selectedTables.join(", ")}`
                        : "FULL DATABASE PURGE — all tables",
                after: { tables },
                request,
            });
        }

        return NextResponse.json({ ok: true, tables });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Purge failed." },
            { status: 500 },
        );
    }
}
