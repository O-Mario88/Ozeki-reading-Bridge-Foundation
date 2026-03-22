import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-time migration endpoint to add missing portal_users columns on production.
 * DELETE THIS FILE after successful migration.
 * Usage: GET /api/migrate-fix
 */
export async function GET() {
  const results: string[] = [];

  const statements = [
    "ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS department TEXT",
    "ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'",
    "ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ",
    "ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ",
    // 0038 training feedback
    "ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS training_feedback JSONB",
  ];

  for (const sql of statements) {
    try {
      await queryPostgres(sql);
      results.push(`✅ ${sql.slice(0, 80)}`);
    } catch (error) {
      results.push(`❌ ${sql.slice(0, 80)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return NextResponse.json({ ok: true, results }, {
    headers: { "Cache-Control": "no-store" },
  });
}
