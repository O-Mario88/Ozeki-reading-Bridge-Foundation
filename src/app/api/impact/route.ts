import { NextResponse } from "next/server";
import { getImpactSummary } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getImpactSummary());
}
