import { NextResponse } from "next/server";
import { getTableRowCounts, purgeAllData } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

export async function GET() {
    const user = await getAuthenticatedPortalUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.isSuperAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ tables: getTableRowCounts() });
}

export async function DELETE() {
    const user = await getAuthenticatedPortalUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.isSuperAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
