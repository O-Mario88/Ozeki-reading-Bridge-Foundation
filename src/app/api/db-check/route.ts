import { NextResponse } from "next/server";
import { isPostgresConfigured, getPostgresRuntimeInfo } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

function safeParseUrl(raw: string) {
  try {
    const url = new URL(raw);
    return {
      host: url.hostname || "(empty)",
      port: url.port || "5432",
      database: url.pathname.replace(/^\//, "") || "(empty — will default to username!)",
      username: url.username || "(empty)",
      hasPassword: Boolean(url.password),
      searchParams: url.search || "(none)",
    };
  } catch {
    return { parseError: "Could not parse DATABASE_URL as URL" };
  }
}

export async function GET() {
  const rawUrl = process.env.DATABASE_URL ?? "";
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl: Boolean(rawUrl),
    databaseUrlPrefix: rawUrl.slice(0, 35) + "...",
    databaseUrlLength: rawUrl.length,
    databaseUrlParsed: rawUrl ? safeParseUrl(rawUrl) : null,
    databaseSsl: process.env.DATABASE_SSL ?? process.env.DB_SSL_REQUIRE ?? "(not set)",
    envVarKeys: Object.keys(process.env).filter(k =>
      k.startsWith("DATABASE") || k.startsWith("DB_") || k.startsWith("GOOGLE") || k.startsWith("AMPLIFY")
    ).sort(),
    isPostgresConfigured: false,
    runtimeInfo: null as unknown,
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
      checks.runtimeInfo = getPostgresRuntimeInfo();
    } catch {
      // ignore
    }

    try {
      const { queryPostgres } = await import("@/lib/server/postgres/client");
      const result = await queryPostgres("SELECT current_database() AS db, current_user AS usr, version() AS ver");
      checks.canConnect = true;
      const row = result.rows[0] as Record<string, unknown>;
      checks.connectedDatabase = row?.db;
      checks.connectedUser = row?.usr;
      checks.postgresVersion = String(row?.ver ?? "").slice(0, 60);
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
        checks.error = "portal_users table does not exist — run POST /api/db-migrate";
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
