import process from "node:process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const appRoot = process.cwd();

if (!process.env.APP_DATA_DIR?.trim()) {
  process.env.APP_DATA_DIR = path.resolve(appRoot, "data");
}

const standaloneServerPath = path.resolve(appRoot, ".next/standalone/server.js");

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
