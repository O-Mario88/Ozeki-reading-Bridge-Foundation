import { NextRequest, NextResponse } from "next/server";
import { listGeoSubregions } from "@/services/dataService";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const regionId =
            searchParams.get("region_id") ||
            searchParams.get("regionId") ||
            undefined;
        const year = searchParams.get("year");
        const subregions = listGeoSubregions(regionId, year);
        return NextResponse.json(
            { ok: true, subregions },
            { headers: { "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=900" } },
        );
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to fetch sub-regions" }, { status: 500 });
    }
}
