import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

const globalForPg = globalThis as typeof globalThis & {
  __orbfPgPool?: Pool;
  __orbfPgConnectionLogged?: boolean;
};

function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
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

function shouldUseSsl() {
  const value = (process.env.DATABASE_SSL ?? process.env.DB_SSL_REQUIRE)?.trim().toLowerCase();
  if (!value) {
    return getDatabaseUrl().includes("amazonaws.com");
  }
  return value === "1" || value === "true" || value === "require" || value === "yes";
}

export function isPostgresConfigured() {
  return getDatabaseUrl().length > 0;
}

export type PostgresRuntimeInfo = {
  activeDb: "postgres";
  host: string;
  port: string;
  database: string;
  ssl: boolean;
};

export function getPostgresRuntimeInfo(): PostgresRuntimeInfo {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    return {
      activeDb: "postgres",
      host: "unconfigured",
      port: "n/a",
      database: "n/a",
      ssl: shouldUseSsl(),
    };
  }

  try {
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\//, "") || "default";
    return {
      activeDb: "postgres",
      host: parsed.hostname || "unknown",
      port: parsed.port || "5432",
      database: databaseName,
      ssl: shouldUseSsl(),
    };
  } catch {
    return {
      activeDb: "postgres",
      host: "invalid-url",
      port: "n/a",
      database: "n/a",
      ssl: shouldUseSsl(),
    };
  }
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
  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is not configured. PostgreSQL is required for this backend.");
  }
}

export function getPostgresPool() {
  if (isProductionRuntime() && !isPostgresConfigured()) {
    throw new Error("DATABASE_URL is required in production. SQLite is disabled.");
  }

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalForPg.__orbfPgPool) {
    globalForPg.__orbfPgPool = new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS ?? 30_000),
      allowExitOnIdle: true,
      ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
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
