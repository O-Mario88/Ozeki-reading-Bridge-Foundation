#!/usr/bin/env node
/* global console, process */
import { spawnSync } from "node:child_process";

const skipCheck = /^(1|true|yes)$/i.test(process.env.SKIP_NATIVE_CHECK ?? "");
if (skipCheck) {
  console.warn("[native-check] Skipping native module verification (SKIP_NATIVE_CHECK enabled).");
  process.exit(0);
}

function runNativeProbe() {
  const probe = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import Database from 'better-sqlite3'; const db = new Database(':memory:'); db.pragma('foreign_keys = ON'); db.close();",
    ],
    {
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  if (probe.status === 0) {
    return null;
  }

  const stderr = (probe.stderr ?? "").trim();
  const stdout = (probe.stdout ?? "").trim();
  return stderr || stdout || `Native probe exited with status ${probe.status ?? 1}.`;
}

function rebuildNativeModule() {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const rebuild = spawnSync(npmCmd, ["rebuild", "better-sqlite3"], {
    encoding: "utf8",
    stdio: "inherit",
  });
  return rebuild.status === 0;
}

let failureReason = runNativeProbe();

if (failureReason) {
  console.error("[native-check] Failed to initialize better-sqlite3.");
  console.error(`[native-check] ${failureReason}`);

  if (!/^(1|true|yes)$/i.test(process.env.NATIVE_CHECK_SKIP_REBUILD ?? "")) {
    console.warn("[native-check] Attempting automatic `npm rebuild better-sqlite3`...");
    const rebuilt = rebuildNativeModule();
    if (rebuilt) {
      failureReason = runNativeProbe();
    } else {
      failureReason = "Automatic rebuild failed.";
    }
  }
}

if (failureReason) {
  console.error("[native-check] Failed to initialize better-sqlite3 after rebuild attempt.");
  console.error(`[native-check] ${failureReason}`);
  console.error(
    "[native-check] Confirm Node.js version compatibility and run `npm rebuild better-sqlite3` in the same deployment environment.",
  );
  process.exit(1);
}

console.log("[native-check] Native modules look healthy.");
