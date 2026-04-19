import { NextResponse } from "next/server";
import { withApiV1 } from "@/lib/server/api-v1";
import { getDistrictLiteracyIndicatorsPostgres } from "@/lib/server/postgres/repositories/national-intelligence";

export const runtime = "nodejs";
export const revalidate = 3600; // aggregate indicators; cache 1h

export const GET = withApiV1<{ district: string }>(async (_req, { params }) => {
  const district = decodeURIComponent(params.district);
  const data = await getDistrictLiteracyIndicatorsPostgres(district);
  if (!data) {
    return NextResponse.json(
      { error: "district_not_found", message: `No schools found in district '${district}'.` },
      { status: 404 },
    );
  }
  return NextResponse.json(data);
});
