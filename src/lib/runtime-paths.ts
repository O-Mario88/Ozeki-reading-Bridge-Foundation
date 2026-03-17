import fs from "node:fs";
import path from "node:path";
import { assertSqliteRuntimeAllowed } from "@/lib/db-runtime-policy";

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), "data");
const TMP_FALLBACK_DATA_DIR = path.resolve("/tmp/ozeki-data");

let cachedDataDir: string | null = null;
let dataDirWarningLogged = false;

function directoryExists(dir: string) {
  try {
    const stats = fs.statSync(dir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

function canUseDirectory(dir: string) {
  try {
    if (!directoryExists(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function warnDataFallback(selectedDir: string, requestedDir: string | null) {
  if (dataDirWarningLogged) {
    return;
  }
  dataDirWarningLogged = true;
  const requestedLabel = requestedDir ?? DEFAULT_DATA_DIR;
  if (selectedDir !== requestedLabel) {
    console.warn(
      `[runtime-paths] Using writable fallback data directory "${selectedDir}" (requested "${requestedLabel}" was not writable).`,
    );
  }
}

function uniqueCandidates(values: Array<string | null>) {
  const seen = new Set<string>();
  const candidates: string[] = [];
  values.forEach((value) => {
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    candidates.push(value);
  });
  return candidates;
}

export function getRuntimeDataDir() {
  if (cachedDataDir) {
    return cachedDataDir;
  }

  const envDataDir = process.env.APP_DATA_DIR?.trim()
    ? path.resolve(process.env.APP_DATA_DIR.trim())
    : null;
  const requestedDir = envDataDir ?? DEFAULT_DATA_DIR;

  const candidates = uniqueCandidates([
    envDataDir,
    DEFAULT_DATA_DIR,
    TMP_FALLBACK_DATA_DIR,
  ]);

  const selectedDir = candidates.find((candidate) => {
    if (!candidate) return false;
    return canUseDirectory(candidate);
  });

  if (!selectedDir) {
    console.error(`[runtime-paths] FAILED to find writable data directory. Candidates: ${candidates.join(", ")}`);
    throw new Error(
      "[runtime-paths] Could not find a writable directory for runtime data. Set APP_DATA_DIR to a writable path.",
    );
  }

  cachedDataDir = selectedDir;
  console.log(`[runtime-paths] Data directory: ${cachedDataDir} (${requestedDir === cachedDataDir ? "requested" : "fallback"})`);
  warnDataFallback(selectedDir, requestedDir);
  return cachedDataDir;
}

export function getRuntimeDbFilePath() {
  assertSqliteRuntimeAllowed("SQLite runtime database path requested.");
  throw new Error("[runtime-paths] SQLite runtime database paths are disabled. Use PostgreSQL (DATABASE_URL).");
}
