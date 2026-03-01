import { NextRequest, NextResponse } from "next/server";
import { listGeoSubregions } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const regionId = searchParams.get("regionId") || undefined;
        const subregions = listGeoSubregions(regionId);
        return NextResponse.json({ ok: true, subregions });
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to fetch sub-regions" }, { status: 500 });
    }
}
