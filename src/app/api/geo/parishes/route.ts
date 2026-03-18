import { NextRequest, NextResponse } from "next/server";
import { listGeoParishes } from "@/services/dataService";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const subcountyId = searchParams.get("subcountyId") || undefined;
        const parishes = listGeoParishes(subcountyId);
        return NextResponse.json({ ok: true, parishes });
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to fetch parishes" }, { status: 500 });
    }
}
