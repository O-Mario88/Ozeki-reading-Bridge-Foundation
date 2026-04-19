import { NextResponse } from "next/server";
import { withApiV1 } from "@/lib/server/api-v1";
import { getRegionLiteracyIndicatorsPostgres } from "@/lib/server/postgres/repositories/national-intelligence";

export const runtime = "nodejs";
export const revalidate = 3600;

export const GET = withApiV1<{ region: string }>(async (_req, { params }) => {
  const region = decodeURIComponent(params.region);
  const data = await getRegionLiteracyIndicatorsPostgres(region);
  if (!data) {
    return NextResponse.json(
      { error: "region_not_found", message: `No schools found in region '${region}'.` },
      { status: 404 },
    );
  }
  return NextResponse.json(data);
}, { maxAgeSeconds: 3600 });
