const SQLITE_URL_PATTERNS = [/sqlite/i, /\.db(?:$|[?#])/i, /^file:/i];
const POSTGRES_URL_PATTERN = /^postgres(?:ql)?:\/\//i;

function normalizeUrl(value: string | undefined | null) {
  return String(value ?? "").trim();
}

export function isSqliteDatabaseUrl(value: string | undefined | null) {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return false;
  }
  return SQLITE_URL_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isPostgresDatabaseUrl(value: string | undefined | null) {
  const normalized = normalizeUrl(value);
  return POSTGRES_URL_PATTERN.test(normalized);
}

export function assertPostgres(databaseUrl = process.env.DATABASE_URL) {
  const normalized = normalizeUrl(databaseUrl);
  if (!normalized) {
    throw new Error("DATABASE_URL is not configured. PostgreSQL is required.");
  }
  if (isSqliteDatabaseUrl(normalized)) {
    throw new Error("SQLite detected. This system is PostgreSQL-only.");
  }
  if (!isPostgresDatabaseUrl(normalized)) {
    throw new Error("DATABASE_URL must use a PostgreSQL connection string.");
  }
  return normalized;
}

export function getPostgresConnectionSummary(databaseUrl = process.env.DATABASE_URL) {
  const validated = assertPostgres(databaseUrl);
  const parsed = new URL(validated);
  return {
    activeDb: "postgres" as const,
    host: parsed.hostname || "unknown",
    port: parsed.port || "5432",
    database: parsed.pathname.replace(/^\//, "") || "default",
    ssl: /amazonaws\.com/i.test(parsed.hostname) || ["1", "true", "yes", "require", "on"].includes(String(process.env.DATABASE_SSL ?? process.env.DB_SSL_REQUIRE ?? "").trim().toLowerCase()),
  };
}
