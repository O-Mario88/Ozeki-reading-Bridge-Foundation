import { NextResponse } from "next/server";
import { refreshAllKpiSnapshotsPostgres } from "@/lib/server/postgres/repositories/kpi-snapshots";
import { requireCronToken } from "@/lib/server/http/cron-auth";

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
    console.error("[cron/refresh-kpis]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
