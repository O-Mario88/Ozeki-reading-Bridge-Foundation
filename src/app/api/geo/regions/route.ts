import { NextRequest, NextResponse } from "next/server";
import { listGeoRegions } from "@/services/dataService";

export async function GET(request: NextRequest) {
    try {
        const year = request.nextUrl.searchParams.get("year");
        const regionStrings = await listGeoRegions(year);
        const regions = regionStrings.map(r => ({ id: r, name: r }));
        return NextResponse.json(
            { ok: true, regions },
            { headers: { "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=900" } },
        );
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to fetch regions" }, { status: 500 });
    }
}
