import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { assertPostgres, getPostgresConnectionSummary } from "@/lib/assertPostgres";
import { getPostgresPool, queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";

type Database = {
  readonly pool: Pool;
  query<Row extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<Row>>;
  withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
  assertConfigured(): string;
  getRuntimeInfo(): ReturnType<typeof getPostgresConnectionSummary>;
};

const globalForDb = globalThis as typeof globalThis & {
  __orbfDbSingleton?: Database;
};

function isDevelopmentRuntime() {
  return (process.env.NODE_ENV ?? "").trim().toLowerCase() !== "production";
}

function createDatabase(): Database {
  return {
    get pool() {
      assertPostgres();
      return getPostgresPool();
    },
    async query<Row extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
      assertPostgres();
      return queryPostgres<Row>(text, params);
    },
    async withClient<T>(callback: (client: PoolClient) => Promise<T>) {
      assertPostgres();
      return withPostgresClient(callback);
    },
    assertConfigured() {
      return assertPostgres();
    },
    getRuntimeInfo() {
      return getPostgresConnectionSummary();
    },
  };
}

const db = globalForDb.__orbfDbSingleton ?? createDatabase();

if (isDevelopmentRuntime()) {
  globalForDb.__orbfDbSingleton = db;
}

export default db;
export { assertPostgres } from "@/lib/assertPostgres";
export { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
