import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { queryPostgres, isPostgresConfigured } from "@/lib/server/postgres/client";
import { requireAdminToken } from "@/lib/server/http/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-shot schema bootstrap endpoint for first-time deploys.
 *
 * Runs every SQL file in database/postgres/*.sql in lexicographic order —
 * the same set the local `npm run postgres:bootstrap` script runs. Every
 * migration in that directory is idempotent (CREATE ... IF NOT EXISTS,
 * ALTER ... ADD COLUMN IF NOT EXISTS, INSERT ... ON CONFLICT DO UPDATE),
 * so re-running this endpoint on a partially-bootstrapped database is
 * safe.
 *
 * Auth: gated by MIGRATE_TOKEN (or CRON_SECRET_TOKEN / CRON_SECRET) via
 * the shared admin-auth helper.
 *
 *   curl -X POST https://<your-domain>/api/migrate/bootstrap \
 *        -H "Authorization: Bearer $MIGRATE_TOKEN"
 *
 * The response includes the list of files applied and per-file timing so
 * you can confirm seed migration 0031 (which inserts the
 * support@ozekiread.org super-admin) ran.
 */
export async function POST(request: Request) {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }

  const schemaDir = path.resolve(process.cwd(), "database", "postgres");

  let entries: string[];
  try {
    entries = await fs.readdir(schemaDir);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `Could not read ${schemaDir}: ${err instanceof Error ? err.message : String(err)}`,
        hint: "Confirm database/postgres/ was copied into the runtime image. Standalone Next builds may exclude it; if so, re-add it via outputFileTracingIncludes or a Dockerfile COPY.",
      },
      { status: 500 },
    );
  }

  const sqlFiles = entries
    .filter((entry) => entry.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  if (sqlFiles.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No .sql files found in database/postgres/" },
      { status: 500 },
    );
  }

  const applied: { file: string; ms: number }[] = [];
  const failed: { file: string; error: string } | null = null;

  for (const file of sqlFiles) {
    const fullPath = path.join(schemaDir, file);
    const sql = await fs.readFile(fullPath, "utf8");
    const t0 = Date.now();
    try {
      await queryPostgres(sql);
      applied.push({ file, ms: Date.now() - t0 });
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          appliedBeforeFailure: applied,
          failedFile: file,
          error: err instanceof Error ? err.message : String(err),
        },
        { status: 500 },
      );
    }
  }

  // Probe the seed user so the response confirms login will work.
  let seedSuperAdmin: { exists: boolean; email: string | null } = {
    exists: false,
    email: null,
  };
  try {
    const probe = await queryPostgres<{ email: string }>(
      "SELECT email FROM portal_users WHERE is_superadmin = TRUE ORDER BY id LIMIT 1",
    );
    if (probe.rows.length > 0) {
      seedSuperAdmin = { exists: true, email: probe.rows[0]!.email };
    }
  } catch {
    // ignore — schema may have failed silently, applied list still useful
  }

  return NextResponse.json({
    ok: true,
    appliedCount: applied.length,
    applied,
    failed,
    seedSuperAdmin,
    timestamp: new Date().toISOString(),
  });
}
