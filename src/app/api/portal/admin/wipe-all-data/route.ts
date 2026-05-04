import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { withPostgresClient } from "@/lib/server/postgres/client";
import { logger } from "@/lib/logger";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * NUCLEAR WIPE — truncates every non-config table in the public schema.
 *
 * Safety gates:
 *   1. Super-admin only (isSuperAdmin check)
 *   2. Confirmation phrase must be "DELETE ALL DATA" in the POST body
 *   3. Runs inside a single BEGIN/COMMIT transaction
 *   4. Keep-list preserves login + config + reference tables
 *
 * Mirror of scripts/maintenance/wipe-all-data.sql — logic lives here so it
 * can run from the portal without needing psql access.
 */

const KEEP_TABLES = new Set<string>([
  // login + sessions (keep so admin can still log in after the wipe)
  "portal_users",
  "portal_sessions",

  // app-wide config
  "system_settings",
  "currency_rates",
  "sponsorship_tiers",
  "service_catalog",

  // finance setup (config, not transactions)
  "finance_chart_of_accounts",
  "finance_funds",
  "finance_grants",
  "finance_settings",
  "finance_audited_statements",

  // Uganda admin hierarchy — real reference data
  "geo_regions",
  "geo_districts",
  "geo_subregions",
  "geo_subcounties",
  "geo_parishes",

  // assessment benchmark config
  "benchmark_profiles",
  "benchmark_rules",
  "assessment_benchmark_settings",

  // org + methodology config
  "organization_profile",
  "teaching_improvement_settings",

  // misc config-like
  "portal_dashboard_pins",
  "portal_dashboard_settings",
]);

const bodySchema = z.object({
  confirmation: z.string(),
});

const CONFIRMATION_PHRASE = "DELETE ALL DATA";

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalUser();
    if (!user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Super-admin only. This endpoint requires the highest privilege level." },
        { status: 403 },
      );
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing confirmation." }, { status: 400 });
    }
    if (parsed.data.confirmation !== CONFIRMATION_PHRASE) {
      return NextResponse.json(
        { error: `Type "${CONFIRMATION_PHRASE}" exactly to confirm.` },
        { status: 400 },
      );
    }

    const summary = await withPostgresClient(async (client) => {
      await client.query("BEGIN");
      try {
        // Find every user-table in the public schema.
        const tableRes = await client.query(
          `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
        );
        const allTables = tableRes.rows.map((r: { tablename: string }) => String(r.tablename));
        const toTruncate = allTables.filter((t: string) => !KEEP_TABLES.has(t));
        const preserved = allTables.filter((t: string) => KEEP_TABLES.has(t));

        if (toTruncate.length === 0) {
          await client.query("ROLLBACK");
          return { truncated: [], preserved, message: "Nothing to truncate." };
        }

        // Single TRUNCATE ... CASCADE RESTART IDENTITY
        const quoted = toTruncate.map((t) => `"${t.replace(/"/g, '""')}"`).join(", ");
        await client.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);

        // Audit trail — write into audit_logs AFTER truncation (which cleared it too,
        // so this is the single entry explaining why everything is empty).
        await client.query(
          `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, detail)
           SELECT id, full_name, 'nuclear_wipe', 'public', 'all', $2
           FROM portal_users WHERE id = $1`,
          [user.id, `Nuclear wipe — truncated ${toTruncate.length} tables; preserved ${preserved.length}`],
        );

        await client.query("COMMIT");
        return { truncated: toTruncate, preserved };
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      }
    });

    logger.warn("[admin/wipe-all-data] executed", {
      actorId: user.id,
      truncatedCount: summary.truncated.length,
      preservedCount: summary.preserved.length,
    });

    await auditLog({
      actor: user,
      action: "bulk_delete",
      targetTable: "all_data_wipe",
      after: {
        truncatedCount: summary.truncated.length,
        preservedCount: summary.preserved.length,
        truncated: summary.truncated,
        preserved: summary.preserved,
      },
      detail: `Wiped all platform data — ${summary.truncated.length} tables truncated, ${summary.preserved.length} preserved`,
      request: req,
    });
    return NextResponse.json({
      ok: true,
      truncatedCount: summary.truncated.length,
      preservedCount: summary.preserved.length,
      truncated: summary.truncated,
      preserved: summary.preserved,
    });
  } catch (err) {
    logger.error("[admin/wipe-all-data] failed", { error: String(err) });
    return NextResponse.json({ error: "Wipe failed. Check server logs." }, { status: 500 });
  }
}
