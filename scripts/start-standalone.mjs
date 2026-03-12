import process from "node:process";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (!process.env.APP_DATA_DIR?.trim()) {
  process.env.APP_DATA_DIR = path.resolve(process.cwd(), "data");
}

const standaloneServerPath = path.resolve(process.cwd(), ".next/standalone/server.js");
await import(pathToFileURL(standaloneServerPath).href);
