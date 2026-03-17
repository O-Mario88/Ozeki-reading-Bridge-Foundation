import { NextRequest, NextResponse } from "next/server";
import { listGeoSubcounties } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const districtId = searchParams.get("districtId") || undefined;
        const subcounties = listGeoSubcounties(districtId);
        return NextResponse.json({ ok: true, subcounties });
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to fetch sub-counties" }, { status: 500 });
    }
}
