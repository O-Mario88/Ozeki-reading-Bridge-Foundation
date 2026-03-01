import { NextResponse } from "next/server";
import { listGeoRegions } from "@/lib/db";

export async function GET() {
    try {
        const regions = listGeoRegions();
        return NextResponse.json({ ok: true, regions });
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to fetch regions" }, { status: 500 });
    }
}
