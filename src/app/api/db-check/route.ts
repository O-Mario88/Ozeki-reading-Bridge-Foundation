import { NextResponse } from "next/server";
import { isPostgresConfigured } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    databaseUrlPrefix: (process.env.DATABASE_URL ?? "").slice(0, 30) + "...",
    databaseSsl: process.env.DATABASE_SSL ?? process.env.DB_SSL_REQUIRE ?? "(not set)",
    envVarKeys: Object.keys(process.env).filter(k =>
      k.startsWith("DATABASE") || k.startsWith("DB_") || k.startsWith("GOOGLE") || k.startsWith("AMPLIFY")
    ).sort(),
    isPostgresConfigured: false,
    canConnect: false,
    tableCheck: null as string | null,
    portalUsersCount: null as number | null,
    error: null as string | null,
  };

  try {
    checks.isPostgresConfigured = isPostgresConfigured();
  } catch (e) {
    checks.error = `isPostgresConfigured failed: ${e instanceof Error ? e.message : String(e)}`;
  }

  if (checks.isPostgresConfigured) {
    try {
      const { queryPostgres } = await import("@/lib/server/postgres/client");
      const result = await queryPostgres("SELECT 1 AS ok");
      checks.canConnect = result.rows.length > 0;
    } catch (e) {
      checks.error = `Connection failed: ${e instanceof Error ? e.message : String(e)}`;
      return NextResponse.json(checks, { status: 500 });
    }

    try {
      const { queryPostgres } = await import("@/lib/server/postgres/client");
      const result = await queryPostgres(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
      );
      checks.tableCheck = `${result.rows.length} tables found`;

      const portalUsers = result.rows.find(
        (r: Record<string, unknown>) => r.table_name === "portal_users"
      );
      if (portalUsers) {
        const countResult = await queryPostgres("SELECT COUNT(*)::int AS count FROM portal_users");
        checks.portalUsersCount = Number(
          (countResult.rows[0] as Record<string, unknown>)?.count ?? 0
        );
      } else {
        checks.portalUsersCount = null;
        checks.error = "portal_users table does not exist";
      }
    } catch (e) {
      checks.error = `Table check failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json(checks, {
    status: checks.canConnect ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
