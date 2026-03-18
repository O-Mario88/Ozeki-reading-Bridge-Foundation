/* global console, URL */
import process from "node:process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { Client } from "pg";

const appRoot = process.cwd();

if (!process.env.APP_DATA_DIR?.trim()) {
  process.env.APP_DATA_DIR = path.resolve(appRoot, "data");
}

const standaloneServerPath = path.resolve(appRoot, ".next/standalone/server.js");

function toBooleanFlag(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function shouldUseSsl(databaseUrl) {
  const value = (process.env.DATABASE_SSL ?? process.env.DB_SSL_REQUIRE)?.trim().toLowerCase();
  if (!value) {
    return databaseUrl.includes("amazonaws.com");
  }
  return value === "1" || value === "true" || value === "require" || value === "yes";
}

async function verifyProductionDatabaseReadiness() {
  const isProduction = (process.env.NODE_ENV ?? "").trim().toLowerCase() === "production";
  const shouldCheck = isProduction || toBooleanFlag(process.env.DB_STARTUP_CHECK, false);
  const strictStartup = toBooleanFlag(process.env.DB_STARTUP_STRICT, false);
  if (!shouldCheck) {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim() || "";
  if (/sqlite|\.db(?:$|[?#])|^file:/i.test(databaseUrl)) {
    throw new Error("SQLite detected. This system is PostgreSQL-only.");
  }
  if (!databaseUrl) {
    const message = "[startup] DATABASE_URL is not configured. PostgreSQL-backed features will be unavailable.";
    if (strictStartup) {
      throw new Error(message);
    }
    console.error(`${message} Continuing startup in degraded mode.`);
    return;
  }

  const parsed = new URL(databaseUrl);
  const ssl = shouldUseSsl(databaseUrl);
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: Number(process.env.DATABASE_STARTUP_TIMEOUT_MS ?? 10_000),
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    const database = parsed.pathname.replace(/^\//, "") || "default";
    console.log(
      `[startup] DB=postgres host=${parsed.hostname || "unknown"} port=${parsed.port || "5432"} database=${database} ssl=${ssl ? "on" : "off"}`,
    );
  } catch (error) {
    if (strictStartup) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[startup] PostgreSQL preflight failed: ${message}. Continuing startup in degraded mode.`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

function runNextStartFallback() {
  process.chdir(appRoot);
  const nextBinPath = path.resolve(appRoot, "node_modules/next/dist/bin/next");
  const child = spawn(process.execPath, [nextBinPath, "start"], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

try {
  await verifyProductionDatabaseReadiness();
  await import(pathToFileURL(standaloneServerPath).href);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("get-metadata-route") || message.includes("MODULE_NOT_FOUND")) {
    console.warn("[start-standalone] Standalone server is missing traced Next internals. Falling back to `next start`.");
    runNextStartFallback();
  } else {
    throw error;
  }
}
