import { NextRequest, NextResponse } from "next/server";
import { searchGeoDistricts } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q");
        if (!q || q.length < 2) {
            return NextResponse.json({ ok: true, results: [] });
        }
        const results = searchGeoDistricts(q);
        return NextResponse.json({ ok: true, results });
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to search districts" }, { status: 500 });
    }
}
