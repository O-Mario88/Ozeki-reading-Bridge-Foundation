import { NextResponse } from "next/server";
import { getTableRowCounts, purgeAllData } from "@/lib/db";
import { authorizeSuperAdmin } from "@/app/api/portal/_shared/auth";

export const runtime = "nodejs";

export async function GET() {
    const auth = await authorizeSuperAdmin();
    if (!auth.authorized) {
        return auth.response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ tables: getTableRowCounts() });
}

export async function DELETE() {
    const auth = await authorizeSuperAdmin();
    if (!auth.authorized) {
        return auth.response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const tables = purgeAllData();
        return NextResponse.json({ ok: true, tables });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Purge failed." },
            { status: 500 },
        );
    }
}
