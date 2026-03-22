import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-time migration: switch super admin to support@ozekiread.org.
 * Also cleans up expired sessions.
 * DELETE THIS FILE after successful migration.
 * Usage: GET /api/migrate-fix
 */
export async function GET() {
  const results: string[] = [];

  // 1. Switch super admin email
  try {
    const existing = await queryPostgres(
      `SELECT id, email FROM portal_users WHERE lower(email) = 'edwin@ozekiread.org' LIMIT 1`,
    );
    if (existing.rows.length > 0) {
      await queryPostgres(
        `UPDATE portal_users SET email = 'support@ozekiread.org', full_name = 'ORBF Support' WHERE lower(email) = 'edwin@ozekiread.org'`,
      );
      results.push("✅ Switched super admin from edwin@ozekiread.org → support@ozekiread.org");
    } else {
      // Check if support@ already exists
      const support = await queryPostgres(
        `SELECT id FROM portal_users WHERE lower(email) = 'support@ozekiread.org' LIMIT 1`,
      );
      if (support.rows.length > 0) {
        results.push("✅ support@ozekiread.org already exists (no change needed)");
      } else {
        results.push("⚠️ edwin@ozekiread.org not found and support@ozekiread.org doesn't exist");
      }
    }
  } catch (error) {
    results.push(`❌ Super admin switch: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 2. Clean up expired sessions
  try {
    const deleted = await queryPostgres(
      `DELETE FROM portal_sessions WHERE expires_at <= NOW() RETURNING id`,
    );
    results.push(`✅ Cleaned ${deleted.rowCount ?? 0} expired sessions`);
  } catch (error) {
    results.push(`❌ Session cleanup: ${error instanceof Error ? error.message : String(error)}`);
  }

  return NextResponse.json({ ok: true, results }, {
    headers: { "Cache-Control": "no-store" },
  });
}
