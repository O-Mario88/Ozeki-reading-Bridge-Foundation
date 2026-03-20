import { NextRequest, NextResponse } from "next/server";
import { listGeoParishes } from "@/services/dataService";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const subcountyId = searchParams.get("subcountyId") || undefined;
        const parishStrings = await listGeoParishes(subcountyId);
        const parishes = parishStrings.map(r => ({ id: r, name: r }));
        return NextResponse.json({ ok: true, parishes });
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to fetch parishes" }, { status: 500 });
    }
}
