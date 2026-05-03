import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { withPostgresClient } from "@/lib/server/postgres/client";
import { logger } from "@/lib/logger";
import { readOptionalJsonBody, JsonBodyError } from "@/lib/server/http/json-body";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const CONFIRM_PHRASE = "I UNDERSTAND THIS WILL PERMANENTLY DELETE ALL FINANCE TRANSACTIONS";

const schema = z.object({
  dryRun: z.boolean().optional(),
  confirm: z.literal(CONFIRM_PHRASE).optional(),
});

// Transactional / log / report tables — TRUNCATE wipes these.
// Config tables (chart_of_accounts, branches, contacts, settings, approval_workflows,
// approval_thresholds, period_locks, programs, projects, departments, funds, grants,
// assets) are intentionally NOT in this list and will be preserved.
const PURGE_TABLES = [
  "finance_approval_logs",
  "finance_approvals",
  "finance_audit_chain",
  "finance_audit_checkpoints",
  "finance_audit_exceptions",
  "finance_audit_trail",
  "finance_audited_statements",
  "finance_budget_lines",
  "finance_budget_plans",
  "finance_budgets_monthly",
  "finance_email_logs",
  "finance_expense_receipts",
  "finance_expenses",
  "finance_files",
  "finance_fund_requests",
  "finance_generated_documents",
  "finance_invoice_items",
  "finance_invoices",
  "finance_journal_entries",
  "finance_journal_lines",
  "finance_monthly_statements",
  "finance_operation_budget_items",
  "finance_operation_budgets",
  "finance_payment_allocations",
  "finance_payments",
  "finance_public_snapshots",
  "finance_receipts",
  "finance_reconciliation_matches",
  "finance_statement_lines",
  "finance_transactions_ledger",
  "finance_txn_risk_scores",
] as const;

type TableSummary = { name: string; rowsBefore: number; rowsAfter: number };

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalUser();
    if (!user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super-admins may purge finance data." },
        { status: 403 },
      );
    }

    const body = await readOptionalJsonBody(req);
    const parsed = schema.parse(body);
    const dryRun = Boolean(parsed.dryRun);

    if (!dryRun && parsed.confirm !== CONFIRM_PHRASE) {
      return NextResponse.json(
        { error: "Type the exact confirmation phrase in the 'confirm' field, or pass dryRun=true." },
        { status: 400 },
      );
    }

    const tables: TableSummary[] = await withPostgresClient(async (client) => {
      await client.query("BEGIN");
      try {
        const before = new Map<string, number>();
        for (const name of PURGE_TABLES) {
          const r = await client.query<{ count: string }>(
            `SELECT count(*)::text AS count FROM public.${name}`,
          );
          before.set(name, Number(r.rows[0]?.count ?? 0));
        }

        if (!dryRun) {
          const list = PURGE_TABLES.map((t) => `public.${t}`).join(", ");
          await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
        }

        const result: TableSummary[] = [];
        for (const name of PURGE_TABLES) {
          const rowsBefore = before.get(name) ?? 0;
          const rowsAfter = dryRun ? rowsBefore : 0;
          result.push({ name, rowsBefore, rowsAfter });
        }

        if (dryRun) {
          await client.query("ROLLBACK");
        } else {
          await client.query("COMMIT");
        }
        return result;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      }
    });

    const totalRowsDeleted = tables.reduce((sum, t) => sum + (t.rowsBefore - t.rowsAfter), 0);
    const summary = {
      executedAt: new Date().toISOString(),
      tablesAffected: tables.filter((t) => t.rowsBefore > 0).length,
      totalRowsDeleted,
      tables,
    };

    if (!dryRun) {
      await auditLog({
        actor: user,
        action: "bulk_delete",
        targetTable: "finance_purge_all",
        detail: `Finance purge — ${totalRowsDeleted} rows wiped across ${PURGE_TABLES.length} tables`,
        after: summary,
        request: req,
      });
      logger.warn("[finance/purge-all] executed", {
        actorUserId: user.id,
        totalRowsDeleted,
      });
    }

    return NextResponse.json({ ok: true, dryRun, summary });
  } catch (err) {
    if (err instanceof JsonBodyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[finance/purge-all] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
