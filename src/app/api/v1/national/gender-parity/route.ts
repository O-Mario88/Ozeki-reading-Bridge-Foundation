import { NextResponse } from "next/server";
import { withApiV1 } from "@/lib/server/api-v1";
import { getNationalGenderParityApiPostgres } from "@/lib/server/postgres/repositories/national-intelligence";

export const runtime = "nodejs";
export const revalidate = 3600;

export const GET = withApiV1(async () => {
  const report = await getNationalGenderParityApiPostgres();
  return NextResponse.json(report);
}, { maxAgeSeconds: 3600 });
