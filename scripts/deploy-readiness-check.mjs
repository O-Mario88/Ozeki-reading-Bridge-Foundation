#!/usr/bin/env node
/* global process, console, URL */

import fs from "node:fs/promises";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const strictMode = args.has("--strict") || /^(1|true|yes)$/i.test(process.env.DEPLOY_CHECK_STRICT ?? "");

const errors = [];
const warnings = [];
const notes = [];

function value(name) {
  return (process.env[name] ?? "").trim();
}

async function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const key = match[1];
      let rawValue = match[2] ?? "";
      if ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
        rawValue = rawValue.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = rawValue;
      }
    }
  } catch {
    // File is optional.
  }
}

function addMessage(kind, message) {
  if (kind === "error") errors.push(message);
  else if (kind === "warning") warnings.push(message);
  else notes.push(message);
}

function isPlaceholder(valueToCheck) {
  const normalized = valueToCheck.toLowerCase();
  return (
    normalized.includes("change-me")
    || normalized.includes("example.org")
    || normalized.includes("replace-with")
    || normalized === "your-password"
  );
}

function requireNonEmpty(name, { strictOnly = false } = {}) {
  const current = value(name);
  if (current) return current;
  if (strictMode || !strictOnly) {
    addMessage(strictOnly ? "warning" : "error", `${name} is not set.`);
  }
  return "";
}

function validatePortalCredential(name, { strictOnly = false } = {}) {
  const current = requireNonEmpty(name, { strictOnly });
  if (!current) return;
  if (isPlaceholder(current)) {
    addMessage(strictMode || !strictOnly ? "error" : "warning", `${name} still looks like a placeholder value.`);
  }
}

function validateHttpsUrl(name, { strictOnly = false } = {}) {
  const current = requireNonEmpty(name, { strictOnly });
  if (!current) return;
  try {
    const parsed = new URL(current);
    if (strictMode && parsed.protocol !== "https:") {
      addMessage("error", `${name} must use https in strict mode.`);
    }
  } catch {
    addMessage(strictMode || !strictOnly ? "error" : "warning", `${name} must be a valid absolute URL.`);
  }
}

function validateHost(name, { strictOnly = false } = {}) {
  const current = requireNonEmpty(name, { strictOnly });
  if (!current) return "";
  if (/^https?:\/\//i.test(current) || current.includes("/")) {
    addMessage(strictMode || !strictOnly ? "error" : "warning", `${name} should be a hostname only (no protocol/path).`);
  }
  return current.toLowerCase();
}

function validateGroup(label, keys) {
  const present = keys.filter((key) => value(key));
  if (present.length === 0) {
    notes.push(`${label}: not configured.`);
    return;
  }
  if (present.length !== keys.length) {
    warnings.push(`${label}: partially configured (${present.length}/${keys.length}).`);
    return;
  }
  notes.push(`${label}: configured.`);
}

function validateOneOf(label, keys) {
  const present = keys.filter((key) => value(key));
  if (present.length === 0) {
    warnings.push(`${label}: not configured (expected one of ${keys.join(", ")}).`);
    return;
  }
  notes.push(`${label}: configured via ${present[0]}.`);
}

function validateOpenAiConfiguration() {
  const apiKey = value("OPENAI_API_KEY");
  const model = value("OPENAI_REPORT_MODEL");

  if (!apiKey && !model) {
    notes.push("OpenAI: not configured.");
    return;
  }

  if (!apiKey || !model) {
    const configuredCount = (apiKey ? 1 : 0) + (model ? 1 : 0);
    warnings.push(`OpenAI: partially configured (${configuredCount}/2).`);
    return;
  }

  if (isPlaceholder(apiKey)) {
    addMessage("error", "OPENAI_API_KEY still looks like a placeholder value.");
    return;
  }

  if (!/^sk-[A-Za-z0-9._-]{20,}$/.test(apiKey)) {
    addMessage(
      strictMode ? "error" : "warning",
      "OPENAI_API_KEY format looks invalid (expected key beginning with sk-).",
    );
  }

  notes.push("OpenAI: configured.");
}

async function validateDataDir() {
  const dir = value("APP_DATA_DIR") || path.join(process.cwd(), "data");
  try {
    await fs.mkdir(dir, { recursive: true });
    const probe = path.join(dir, `.deploy-check-${Date.now()}.tmp`);
    await fs.writeFile(probe, "ok", "utf8");
    await fs.unlink(probe);
    notes.push(`Data directory writable: ${dir}`);
  } catch (error) {
    addMessage("error", `Data directory is not writable (${dir}): ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

async function main() {
  await loadEnvFile(".env");
  await loadEnvFile(".env.local");

  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  if (nodeMajor < 20 || nodeMajor >= 25) {
    addMessage("error", `Node.js ${process.versions.node} detected. Required range is >=20 and <25.`);
  } else {
    notes.push(`Node.js ${process.versions.node} is within supported range.`);
  }

  validateHttpsUrl("APP_ORIGIN");
  validateHttpsUrl("NEXT_PUBLIC_APP_URL", { strictOnly: true });

  const publicHost = validateHost("PUBLIC_SITE_HOST");
  const adminHost = validateHost("ADMIN_PORTAL_HOST");
  if (publicHost && adminHost && publicHost === adminHost) {
    addMessage("error", "PUBLIC_SITE_HOST and ADMIN_PORTAL_HOST must not be the same.");
  }

  const databaseUrl = requireNonEmpty("DATABASE_URL");
  if (databaseUrl && !/^postgres(ql)?:\/\//i.test(databaseUrl)) {
    addMessage("error", "DATABASE_URL must be a PostgreSQL connection string.");
  }
  if (value("ALLOW_SQLITE")) {
    addMessage("error", "ALLOW_SQLITE is no longer supported. Remove it from the environment.");
  }
  if (value("SQLITE_DB_PATH")) {
    addMessage("error", "SQLITE_DB_PATH is not supported. Remove it from the environment.");
  }
  if (value("DATABASE_PATH")) {
    addMessage("error", "DATABASE_PATH is not supported. Remove it from the environment.");
  }

  requireNonEmpty("PORTAL_SESSION_SECRET");

  const seedUsers = value("PORTAL_AUTO_SEED_USERS");
  if (strictMode && seedUsers.toLowerCase() !== "false") {
    addMessage("error", "PORTAL_AUTO_SEED_USERS must be false in strict mode.");
  } else if (!strictMode && seedUsers.toLowerCase() === "true") {
    warnings.push("PORTAL_AUTO_SEED_USERS=true is not recommended for production.");
  }

  const salt = requireNonEmpty("PORTAL_PASSWORD_SALT");
  if (salt) {
    if (salt.length < 20) {
      addMessage("error", "PORTAL_PASSWORD_SALT should be at least 20 characters.");
    }
    if (isPlaceholder(salt)) {
      addMessage("error", "PORTAL_PASSWORD_SALT still looks like a placeholder value.");
    }
  }

  validatePortalCredential("PORTAL_ADMIN_EMAIL");
  validatePortalCredential("PORTAL_ADMIN_PASSWORD");
  validatePortalCredential("PORTAL_SUPERADMIN_EMAIL");
  validatePortalCredential("PORTAL_SUPERADMIN_PASSWORD");
  validatePortalCredential("PORTAL_STAFF_EMAIL", { strictOnly: true });
  validatePortalCredential("PORTAL_STAFF_PASSWORD", { strictOnly: true });

  validateGroup("SMTP", ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]);
  validateGroup("Google Calendar", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
  validateOneOf("Google OAuth redirect", ["GOOGLE_WORKSPACE_OAUTH_REDIRECT_URI", "GOOGLE_OAUTH_REDIRECT_URI", "GOOGLE_REDIRECT_URI"]);
  validateOpenAiConfiguration();
  validateGroup("YouTube", ["YOUTUBE_API_KEY", "YOUTUBE_CHANNEL_ID"]);

  await validateDataDir();

  console.log(`\nDeployment readiness check (${strictMode ? "STRICT" : "STANDARD"})`);
  console.log("------------------------------------------------------------");

  if (notes.length > 0) {
    console.log("\nNotes:");
    for (const note of notes) console.log(`- ${note}`);
  }

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of warnings) console.log(`- ${warning}`);
  }

  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const error of errors) console.log(`- ${error}`);
  }

  const passed = errors.length === 0;
  console.log(`\nResult: ${passed ? "PASS" : "FAIL"} (${errors.length} error(s), ${warnings.length} warning(s))`);

  if (!passed && strictMode) {
    process.exit(1);
  }
}

await main();
