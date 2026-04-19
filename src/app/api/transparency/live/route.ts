import { NextResponse } from "next/server";
import { getTransparencyLiveStatsPostgres } from "@/lib/server/postgres/repositories/finance-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const revalidate = 300; // 5 min

export async function GET() {
  try {
    const stats = await getTransparencyLiveStatsPostgres();
    return NextResponse.json(stats);
  } catch (error) {
    logger.error("[transparency/live] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
