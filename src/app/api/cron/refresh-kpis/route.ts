import { NextResponse } from "next/server";
import { refreshAllKpiSnapshotsPostgres } from "@/lib/server/postgres/repositories/kpi-snapshots";
import { requireCronToken } from "@/lib/server/http/cron-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = requireCronToken(request);
  if (authError) return authError;

  try {
    const start = Date.now();
    const { searchParams } = new URL(request.url);
    const full = searchParams.get("full") === "1";
    const result = await refreshAllKpiSnapshotsPostgres({
      maxSchools: full ? 2000 : 300,
      staleOnly: !full,
    });
    const ms = Date.now() - start;
    return NextResponse.json({ ok: true, ...result, durationMs: ms, at: new Date().toISOString() });
  } catch (error) {
    logger.error("[cron/refresh-kpis] failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
