export function isProductionRuntime() {
  return (process.env.NODE_ENV ?? "").trim().toLowerCase() === "production";
}

export function isSqliteRuntimeAllowed() {
  return false;
}

export function assertSqliteRuntimeAllowed(reason: string) {
  throw new Error(`[db-policy] ${reason} SQLite is permanently disabled. PostgreSQL is the only supported database backend.`);
}
