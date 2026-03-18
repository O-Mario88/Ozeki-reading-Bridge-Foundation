import { NextRequest, NextResponse } from "next/server";
import { listGeoSchools } from "@/services/dataService";

export async function GET(request: NextRequest) {
  try {
    const districtId =
      request.nextUrl.searchParams.get("district_id") ||
      request.nextUrl.searchParams.get("districtId") ||
      undefined;
    const year = request.nextUrl.searchParams.get("year");
    const schools = listGeoSchools(districtId, year);
    return NextResponse.json(
      { ok: true, schools },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=900" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch schools" }, { status: 500 });
  }
}

