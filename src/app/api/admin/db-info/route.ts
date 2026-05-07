import { NextResponse } from "next/server";
import { queryPostgres, isPostgresConfigured } from "@/lib/server/postgres/client";
import { requireAdminToken } from "@/lib/server/http/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only diagnostic endpoint that returns the public-schema table list
 * + row counts on a sentinel set of tables, so an operator can confirm
 * migrations actually applied without needing a psql shell.
 *
 * Returns the equivalent of `\dt` in JSON form. Does NOT return any row
 * contents, credentials, or PII — only schema-level metadata.
 *
 * Auth: same MIGRATE_TOKEN / CRON_SECRET gate as /api/migrate/*.
 *
 *   curl https://<railway-domain>/api/admin/db-info \
 *        -H "Authorization: Bearer $MIGRATE_TOKEN"
 *
 *   curl "https://<railway-domain>/api/admin/db-info?secret=$MIGRATE_TOKEN"
 */
export async function GET(request: Request) {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }

  const tables = await queryPostgres<{ tableName: string }>(
    `SELECT tablename AS "tableName"
     FROM pg_tables
     WHERE schemaname = 'public'
     ORDER BY tablename`,
  );

  // Row counts on a small set of canary tables. We deliberately keep this
  // list short so the response stays fast — enough to verify the bootstrap
  // populated the auth + finance + delivery spine, not a full audit.
  const canaryTables = [
    "portal_users",
    "schools_directory",
    "teacher_roster",
    "school_contacts",
    "training_events",
    "coaching_visits",
    "finance_invoices",
    "donations",
    "sponsorships",
    "sponsorship_school_allocations",
  ];
  const canaryCounts: Record<string, number | null> = {};
  for (const table of canaryTables) {
    try {
      // Inline the table name — it's a fixed allow-list above so no SQL
      // injection surface even though we can't bind it as a parameter.
      const r = await queryPostgres<{ n: string }>(`SELECT COUNT(*)::TEXT AS n FROM ${table}`);
      canaryCounts[table] = Number(r.rows[0]?.n ?? 0);
    } catch {
      // Table not present — leave as null so the operator can see which
      // canary tables didn't make it through the bootstrap.
      canaryCounts[table] = null;
    }
  }

  return NextResponse.json({
    ok: true,
    schema: "public",
    tableCount: tables.rows.length,
    tables: tables.rows.map((r) => r.tableName),
    canaryRowCounts: canaryCounts,
    timestamp: new Date().toISOString(),
  });
}
