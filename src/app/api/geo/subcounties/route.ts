import { NextRequest, NextResponse } from "next/server";
import { listGeoSubcounties } from "@/services/dataService";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const districtId = searchParams.get("districtId") || undefined;
        const subcountyStrings = await listGeoSubcounties(districtId);
        const subcounties = subcountyStrings.map(r => ({ id: r, name: r }));
        return NextResponse.json({ ok: true, subcounties });
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to fetch sub-counties" }, { status: 500 });
    }
}
