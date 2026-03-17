import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

const globalForPg = globalThis as typeof globalThis & {
  __orbfPgPool?: Pool;
};

function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

function shouldUseSsl() {
  const value = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (!value) {
    return getDatabaseUrl().includes("amazonaws.com");
  }
  return value === "1" || value === "true" || value === "require" || value === "yes";
}

export function isPostgresConfigured() {
  return getDatabaseUrl().length > 0;
}

export function requirePostgresConfigured() {
  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is not configured. PostgreSQL is required for this backend.");
  }
}

export function getPostgresPool() {
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
