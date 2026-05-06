import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { assertPostgres, getPostgresConnectionSummary } from "@/lib/assertPostgres";
import { logger } from "@/lib/logger";

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
      logger.info("[db] DATABASE_URL database=" + (dbName || "(empty)") + " corrected to postgres");
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

/**
 * SSL posture:
 *   Managed Postgres (AWS RDS, Neon, Supabase, etc.) presents certificates
 *   signed by provider CAs that Node.js does not bundle. Setting
 *   `rejectUnauthorized: false` keeps the connection *encrypted* but skips
 *   certificate-chain validation. This is the industry-default for those
 *   providers and matches what Next.js + Prisma + Drizzle recommend.
 *
 *   To tighten to strict validation, set `DATABASE_SSL_CA` to the PEM CA
 *   bundle (or mount one via your deploy env) and the pool will verify.
 */
function resolveSslConfig(databaseUrl: string): false | { rejectUnauthorized: boolean; ca?: string } {
  if (!shouldUseSsl(databaseUrl)) return false;
  const caPem = process.env.DATABASE_SSL_CA?.trim();
  if (caPem) {
    return { rejectUnauthorized: true, ca: caPem };
  }
  return { rejectUnauthorized: false };
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
  logger.info(
    `[db] Active backend DB=${info.activeDb} host=${info.host} port=${info.port} database=${info.database} ssl=${info.ssl ? "on" : "off"}`,
  );
}

export function requirePostgresConfigured() {
  return assertPostgres(getDatabaseUrlRaw());
}

/**
 * Pool sizing:
 *   Raised default from 10 → 20 in production. Next.js route handlers reuse
 *   the same Pool across all concurrent requests on a single server instance;
 *   10 connections becomes a bottleneck above ~20 concurrent dashboard loads
 *   (each loading 4-6 parallel queries). 20 gives comfortable headroom while
 *   staying well below typical managed-Postgres `max_connections = 100`.
 *
 *   Override via DATABASE_POOL_MAX. Tune up for heavy analytics, down for
 *   small tiers where the provider enforces a low `max_connections`.
 */
function resolvePoolMax(): number {
  const raw = process.env.DATABASE_POOL_MAX;
  if (raw) return Math.max(1, Number(raw));
  return isProductionRuntime() ? 20 : 10;
}

export function getPostgresPool() {
  const databaseUrl = assertPostgres(getDatabaseUrlRaw());

  if (isProductionRuntime() && !databaseUrl) {
    throw new Error("DATABASE_URL is required in production. PostgreSQL is required.");
  }

  if (!globalForPg.__orbfPgPool) {
    const sslConfig = resolveSslConfig(databaseUrl);
    const poolMax = resolvePoolMax();

    const pool = new Pool({
      connectionString: databaseUrl,
      max: poolMax,
      idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS ?? 15_000),
      connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS ?? 5_000),
      statement_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 10_000),
      allowExitOnIdle: true,
      ssl: sslConfig,
      options: "-c search_path=public",
    });

    // Unhandled pool errors would otherwise crash the Node process; log them.
    pool.on("error", (err) => {
      logger.error("[db] idle client error", { error: String(err) });
    });

    globalForPg.__orbfPgPool = pool;

    if (toBooleanFlag(process.env.LOG_ACTIVE_DB, true)) {
      logPostgresSelectionOnce();
      logger.info(
        `[db] pool max=${poolMax} ssl=${sslConfig ? (sslConfig as { rejectUnauthorized: boolean }).rejectUnauthorized ? "strict" : "encrypted (no cert check)" : "off"}`,
      );
      if (isProductionRuntime() && sslConfig && !(sslConfig as { rejectUnauthorized: boolean }).rejectUnauthorized) {
        logger.warn(
          "[db] TLS certificate validation disabled — set DATABASE_SSL_CA to enforce strict validation.",
        );
      }
    }
  }

  return globalForPg.__orbfPgPool;
}

/** Snapshot of pool utilisation. Used by /api/health endpoints + pressure warnings. */
export function getPoolStats(): { total: number; idle: number; waiting: number; max: number } {
  const pool = globalForPg.__orbfPgPool;
  if (!pool) return { total: 0, idle: 0, waiting: 0, max: resolvePoolMax() };
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: resolvePoolMax(),
  };
}

// Minimal client interface for functions that accept an optional transaction client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PostgresClient = { query: (text: string, values?: any[]) => Promise<{ rows: any[] }> };

// Empty QueryResult returned during `next build` when DATABASE_URL is unset.
// Prerender on hosts (Railway, Cloud Run) that don't expose the DB at build
// time should degrade to empty data instead of crashing the build. Runtime is
// unaffected — NEXT_PHASE is only set to 'phase-production-build' during the
// build worker, never when the app actually serves requests.
function emptyBuildResult<Row extends QueryResultRow>(): QueryResult<Row> {
  return { command: "SELECT", rowCount: 0, oid: 0, fields: [], rows: [] } as unknown as QueryResult<Row>;
}

function isBuildPhaseWithoutDb() {
  return process.env.NEXT_PHASE === "phase-production-build" && !getDatabaseUrlRaw();
}

export async function queryPostgres<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<Row>> {
  if (isBuildPhaseWithoutDb()) return emptyBuildResult<Row>();
  return getPostgresPool().query<Row>(text, params);
}

export async function withPostgresClient<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (isBuildPhaseWithoutDb()) {
    // Provide a stub client during prerender so callers that branch on rows
    // (e.g. testimonials lookups) get empty results instead of a thrown init.
    const stub = {
      query: async () => ({ rows: [], rowCount: 0 }),
      release: () => {},
    } as unknown as PoolClient;
    return callback(stub);
  }
  const client = await getPostgresPool().connect();
  let released = false;
  try {
    return await callback(client);
  } catch (err) {
    // If the callback threw mid-transaction, roll back before returning the
    // client to the pool so the next caller doesn't inherit an open tx.
    try {
      await client.query("ROLLBACK");
    } catch {
      // If ROLLBACK fails the client is already in an error state; release
      // with a destroy flag so pg discards it instead of reusing.
      client.release(true);
      released = true;
    }
    throw err;
  } finally {
    if (!released) client.release();
  }
}

export async function checkPostgresConnectivity() {
  requirePostgresConfigured();
  await queryPostgres("SELECT 1");
  return getPostgresRuntimeInfo();
}

/**
 * Executes an array of factory functions that return Promises, sequentially in chunks.
 * Useful for preventing PostgreSQL connection pool exhaustion when fetching multiple
 * distinct data points dynamically across a dashboard or analytics page.
 *
 * Default concurrency 4: leaves room for other concurrent requests even on the
 * default 20-connection pool. Bump caller-side for single-user admin pages that
 * benefit from more parallelism.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function chunkedPromiseAll<T extends any[]>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  promiseFactories: (() => Promise<any>)[],
  concurrency = 4,
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];
  for (let i = 0; i < promiseFactories.length; i += concurrency) {
    const chunk = promiseFactories.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map((fn) => fn()));
    results.push(...chunkResults);
  }
  return results as unknown as T;
}
