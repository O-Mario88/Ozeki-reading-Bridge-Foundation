import { NextResponse } from "next/server";
import { refreshAllKpiSnapshotsPostgres } from "@/lib/server/postgres/repositories/kpi-snapshots";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET_TOKEN;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
