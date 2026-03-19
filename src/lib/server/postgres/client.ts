import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { assertPostgres, getPostgresConnectionSummary } from "@/lib/assertPostgres";

const globalForPg = globalThis as typeof globalThis & {
  __orbfPgPool?: Pool;
  __orbfPgConnectionLogged?: boolean;
};

function getDatabaseUrlRaw() {
  const raw = process.env.DATABASE_URL?.trim() || "";
  if (!raw) return "";
  // Fix common DATABASE_URL issues:
  // 1. No database name path → pg defaults to username, which fails
  // 2. Database name "default" → the actual RDS database is "postgres"
  try {
    const url = new URL(raw);
    const dbName = url.pathname.replace(/^\//, "").trim();
    if (!dbName || dbName === "default") {
      url.pathname = "/postgres";
      const fixed = url.toString();
      console.warn("[db] DATABASE_URL database=" + (dbName || "(empty)") + " corrected to postgres");
      return fixed;
    }
  } catch {
    // not a valid URL — let downstream validation handle it
  }
  return raw;
}

function toBooleanFlag(value: string | undefined, fallback = false) {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isProductionRuntime() {
  return (process.env.NODE_ENV ?? "").trim().toLowerCase() === "production";
}

function shouldUseSsl(databaseUrl?: string) {
  const value = (process.env.DATABASE_SSL ?? process.env.DB_SSL_REQUIRE)?.trim().toLowerCase();
  if (!value) {
    const candidate = databaseUrl ?? getDatabaseUrlRaw();
    return candidate.includes("amazonaws.com") || candidate.includes("neon.tech");
  }
  return value === "1" || value === "true" || value === "require" || value === "yes";
}

export function isPostgresConfigured() {
  const raw = getDatabaseUrlRaw();
  if (!raw) {
    return false;
  }
  try {
    assertPostgres(raw);
    return true;
  } catch {
    return false;
  }
}

export type PostgresRuntimeInfo = ReturnType<typeof getPostgresConnectionSummary>;

export function getPostgresRuntimeInfo(): PostgresRuntimeInfo {
  return getPostgresConnectionSummary(assertPostgres(getDatabaseUrlRaw()));
}

function logPostgresSelectionOnce() {
  if (globalForPg.__orbfPgConnectionLogged) {
    return;
  }
  globalForPg.__orbfPgConnectionLogged = true;
  const info = getPostgresRuntimeInfo();
  console.log(
    `[db] Active backend DB=${info.activeDb} host=${info.host} port=${info.port} database=${info.database} ssl=${info.ssl ? "on" : "off"}`,
  );
}

export function requirePostgresConfigured() {
  return assertPostgres(getDatabaseUrlRaw());
}

export function getPostgresPool() {
  const databaseUrl = assertPostgres(getDatabaseUrlRaw());

  if (isProductionRuntime() && !databaseUrl) {
    throw new Error("DATABASE_URL is required in production. PostgreSQL is required.");
  }

  if (!globalForPg.__orbfPgPool) {
    globalForPg.__orbfPgPool = new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS ?? 30_000),
      connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS ?? 5_000),
      statement_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 10_000),
      allowExitOnIdle: true,
      ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
      options: "-c search_path=public",
    });
    if (toBooleanFlag(process.env.LOG_ACTIVE_DB, true)) {
      logPostgresSelectionOnce();
    }
  }

  return globalForPg.__orbfPgPool;
}

export async function queryPostgres<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<Row>> {
  return getPostgresPool().query<Row>(text, params);
}

export async function withPostgresClient<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPostgresPool().connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function checkPostgresConnectivity() {
  requirePostgresConfigured();
  await queryPostgres("SELECT 1");
  return getPostgresRuntimeInfo();
}
