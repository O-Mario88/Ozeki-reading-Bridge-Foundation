import { NextResponse } from "next/server";
import { checkPostgresConnectivity, getPoolStats } from "@/lib/server/postgres/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Operational health probe. Returns pool utilisation + a SELECT 1 latency.
 * Safe to expose to internal monitoring; does not leak connection strings.
 */
export async function GET() {
  const started = Date.now();
  try {
    const info = await checkPostgresConnectivity();
    const latencyMs = Date.now() - started;
    const stats = getPoolStats();

    const pressure = stats.waiting > 0 || stats.total >= stats.max * 0.9;
    return NextResponse.json({
      ok: true,
      activeDb: info.activeDb,
      host: info.host,
      database: info.database,
      ssl: info.ssl,
      pool: stats,
      selectLatencyMs: latencyMs,
      warning: pressure ? "pool_near_capacity" : null,
    }, { status: pressure ? 200 : 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err), latencyMs: Date.now() - started },
      { status: 503 },
    );
  }
}
