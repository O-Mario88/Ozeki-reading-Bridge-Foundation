import { NextRequest, NextResponse } from "next/server";
import { listGeoDistricts } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const subregionId = searchParams.get("subregionId") || undefined;
        const districts = listGeoDistricts(subregionId);
        return NextResponse.json({ ok: true, districts });
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to fetch districts" }, { status: 500 });
    }
}
