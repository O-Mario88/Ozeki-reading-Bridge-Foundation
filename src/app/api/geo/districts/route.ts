import { NextRequest, NextResponse } from "next/server";
import { listGeoDistricts } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const subregionId =
            searchParams.get("subregion_id") ||
            searchParams.get("subregionId") ||
            undefined;
        const year = searchParams.get("year");
        const districts = listGeoDistricts(subregionId, year);
        return NextResponse.json(
            { ok: true, districts },
            { headers: { "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=900" } },
        );
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to fetch districts" }, { status: 500 });
    }
}
