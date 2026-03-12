import fs from "node:fs";
import path from "node:path";

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), "data");
const TMP_FALLBACK_DATA_DIR = path.resolve("/tmp/ozeki-data");
const DEFAULT_DB_FILE_NAME = "app.db";

let cachedDataDir: string | null = null;
let cachedDbFilePath: string | null = null;
let dataDirWarningLogged = false;
let dbPathWarningLogged = false;

function resolveEnvDbPath() {
  const explicit = process.env.SQLITE_DB_PATH?.trim() || process.env.DATABASE_PATH?.trim();
  if (!explicit) {
    return null;
  }
  return path.resolve(explicit);
}

function directoryExists(dir: string) {
  try {
    const stats = fs.statSync(dir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

function hasExistingDb(dir: string) {
  try {
    return fs.existsSync(path.join(dir, DEFAULT_DB_FILE_NAME));
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

function warnDbFallback(selectedPath: string, requestedPath: string) {
  if (dbPathWarningLogged) {
    return;
  }
  dbPathWarningLogged = true;
  if (selectedPath !== requestedPath) {
    console.warn(
      `[runtime-paths] Using database path "${selectedPath}" because "${requestedPath}" was not writable.`,
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
  const envDbPath = resolveEnvDbPath();
  const envDbDir = envDbPath ? path.dirname(envDbPath) : null;
  const requestedDir = envDataDir ?? envDbDir ?? DEFAULT_DATA_DIR;

  const candidates = uniqueCandidates([
    envDataDir,
    envDbDir,
    DEFAULT_DATA_DIR,
    TMP_FALLBACK_DATA_DIR,
  ]);

  const selectedDir = candidates.find((candidate) => {
    if (!candidate) return false;
    // Prefer writable, but accept read-only if DB is already there (the DB layer has RW fallback)
    return canUseDirectory(candidate) || hasExistingDb(candidate);
  });
  if (!selectedDir) {
    throw new Error(
      "[runtime-paths] Could not find a writable directory for runtime data. Set APP_DATA_DIR or SQLITE_DB_PATH to a writable path.",
    );
  }

  cachedDataDir = selectedDir;
  warnDataFallback(selectedDir, requestedDir);
  return cachedDataDir;
}

export function getRuntimeDbFilePath() {
  if (cachedDbFilePath) {
    return cachedDbFilePath;
  }

  const envDbPath = resolveEnvDbPath();
  if (envDbPath) {
    const envDbDir = path.dirname(envDbPath);
    if (canUseDirectory(envDbDir)) {
      cachedDbFilePath = envDbPath;
      return cachedDbFilePath;
    }
  }

  const fallbackPath = path.join(getRuntimeDataDir(), DEFAULT_DB_FILE_NAME);
  if (envDbPath) {
    warnDbFallback(fallbackPath, envDbPath);
  }
  cachedDbFilePath = fallbackPath;
  return cachedDbFilePath;
}
