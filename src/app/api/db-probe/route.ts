import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

/**
 * Diagnostic endpoint to probe different database names on the RDS host.
 * Tries multiple common database names to find the one that works.
 */
export async function GET() {
  const rawUrl = process.env.DATABASE_URL?.trim() || "";
  if (!rawUrl) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "DATABASE_URL is not a valid URL" }, { status: 500 });
  }

  // Try these database names in order
  const candidates = ["postgres", "default", parsed.username, "ozeki", "orbf", "rdsadmin"];
  const results: Record<string, string> = {};

  for (const dbName of candidates) {
    const testUrl = new URL(rawUrl);
    testUrl.pathname = `/${dbName}`;
    const pool = new Pool({
      connectionString: testUrl.toString(),
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
    try {
      const res = await pool.query("SELECT current_database() AS db, current_user AS usr");
      const row = res.rows[0] as Record<string, unknown>;
      results[dbName] = `✅ CONNECTED (actual db=${row?.db}, user=${row?.usr})`;
      await pool.end();
    } catch (e) {
      results[dbName] = `❌ ${e instanceof Error ? e.message : String(e)}`;
      try { await pool.end(); } catch { /* ignore */ }
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    host: parsed.hostname,
    port: parsed.port || "5432",
    username: parsed.username,
    currentPathDatabase: parsed.pathname.replace(/^\//, "") || "(none)",
    probeResults: results,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
