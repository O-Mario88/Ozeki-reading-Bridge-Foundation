import { queryPostgres, withPostgresClient, type PostgresClient } from "@/lib/server/postgres/client";

// Wildcard exports for Postgres-suffixed names
export * from "@/lib/server/postgres/repositories/finance";
export * from "@/lib/server/postgres/repositories/finance-reports";
export * from "@/lib/server/postgres/repositories/finance-v2";
export * from "@/lib/server/postgres/repositories/finance-documents";
export * from "@/lib/server/postgres/repositories/finance-assets";
export * from "@/lib/server/postgres/repositories/finance-liabilities";
export * from "@/lib/server/postgres/repositories/finance-budgets";

// ── Aliased re-exports (pages import without "Postgres" suffix) ──────
export {
    listFinanceContactsPostgres as listFinanceContacts,
    getFinanceSettingsPostgres as getFinanceSettings,
    listFinanceInvoicesPostgres as listFinanceInvoices,
    getFinanceInvoiceByIdPostgres as getFinanceInvoiceById,
    listFinanceReceiptsPostgres as listFinanceReceipts,
    getFinanceReceiptByIdPostgres as getFinanceReceiptById,
    listFinanceExpensesPostgres as listFinanceExpenses,
    getFinanceExpenseByIdPostgres as getFinanceExpenseById,
    submitFinanceExpensePostgres as submitFinanceExpenseAsync,
    createFinanceExpensePostgres as createFinanceExpenseAsync,
    deleteFinanceExpenseDraftPostgres as deleteFinanceExpenseDraftAsync,
    voidFinanceExpensePostgres as voidFinanceExpenseAsync,
    postFinanceExpensePostgres as postFinanceExpenseAsync,
    upsertFinanceExpenseReceiptsPostgres as upsertFinanceExpenseReceiptsAsync,
    listFinanceLedgerTransactionsPostgres as listFinanceLedgerTransactions,
    getFinanceDashboardSummaryPostgres as getFinanceDashboardSummary,
    listFinanceMonthlyStatementsPostgres as listFinanceMonthlyStatements,
    listFinanceAuditExceptionsPostgres as listFinanceAuditExceptions,
    listFinanceHighRiskTransactionsPostgres as listFinanceHighRiskTransactions,
    listFinanceReceiptRegistryPostgres as listFinanceReceiptRegistry,
    listFinanceAuditComplianceChecksPostgres as listFinanceAuditComplianceChecks,
    listStatementLinesPostgres as listStatementLines,
    listMonthlyBudgetsPostgres as listMonthlyBudgets,
    getRestrictedFundsSummaryPostgres as getRestrictedFundsSummary,
    listFinancePublicSnapshotsPostgres as listFinancePublicSnapshots,
    listFinanceAuditedStatementsPostgres as listFinanceAuditedStatements,
    listFinanceExpenseReceiptsPostgres as listFinanceExpenseReceipts,
    listFinanceEmailLogsPostgres as listFinanceEmailLogs,
    getFinanceFileByIdPostgres as getFinanceFileById,
    listFinanceFilesBySourcePostgres as listFinanceFilesBySource,
    generateFinanceMonthlyStatementPostgres as generateFinanceMonthlyStatement,
} from "@/lib/server/postgres/repositories/finance";

/**
 * Utility to export finance rows to CSV format
 */
export function exportFinanceRowsToCsv(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows: any[],
    columns: string[] | { label: string; key: string }[]
): string {
    const isObjectColumns = columns.length > 0 && typeof columns[0] === 'object';
    const header = isObjectColumns 
        ? (columns as { label: string; key: string }[]).map(c => `"${c.label}"`).join(",")
        : (columns as string[]).map(c => `"${c}"`).join(",");
        
    const body = rows.map(row => {
        return columns.map(c => {
            const key = isObjectColumns ? (c as { label: string; key: string }).key : (c as string);
            const val = row[key];
            if (val === null || val === undefined) return '""';
            if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
            return `"${val}"`;
        }).join(",");
    }).join("\n");
        
    return `${header}\n${body}`;
}

// ═══════════════════════════════════════════════════════════════════════
// Finance write-path stubs (not yet migrated to PostgreSQL)
// These allow the API routes to compile while the full write logic
// is implemented against postgres.
// ═══════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FinanceActor = any;

export {
  createFinanceInvoicePostgres as createFinanceInvoiceAsync,
  deleteFinanceInvoiceDraftPostgres as deleteFinanceInvoiceDraftAsync,
  voidFinanceInvoicePostgres as voidFinanceInvoiceAsync,
  sendFinanceInvoicePostgres as sendFinanceInvoice,
  createFinanceReceiptPostgres as createFinanceReceiptAsync,
  deleteFinanceReceiptDraftPostgres as deleteFinanceReceiptDraftAsync,
  voidFinanceReceiptPostgres as voidFinanceReceiptAsync,
  issueFinanceReceiptPostgres as issueFinanceReceipt,
  sendFinanceReceiptPostgres as sendFinanceReceipt,
  recordFinancePaymentPostgres as recordFinancePayment,
  createFinanceContactPostgres as createFinanceContactAsync,
  updateFinanceInvoiceDraftPostgres as updateFinanceInvoiceDraftAsync,
  upsertMonthlyBudgetPostgres as upsertMonthlyBudget,
} from "@/lib/server/postgres/repositories/finance-documents";

export async function voidFinancePaymentAsync(id: number, reason: string, actor: FinanceActor) {
    // Reverse a posted invoice payment. This mirrors recordInvoicePaymentPostgres
    // (finance-lifecycle.ts) step-for-step in reverse, inside one transaction:
    //   payment → void, its receipt → void, its ledger entry → void, drop the
    //   auto-created allocation, then recompute the invoice's paid_amount /
    //   balance_due / status from the remaining POSTED payments using the SAME
    //   sum query the record flow uses. Consistent with the existing void-receipt
    //   behaviour in finance-documents.ts.
    // Known gap (matches void-receipt): the GL journal entry posted via
    //   postReceiptToGl is not reversed here — GL reversal needs a dedicated
    //   reversing entry and is out of scope for this mirror.
    const actorId = Number((actor as { id?: unknown })?.id) || null;
    return withPostgresClient(async (client) => {
        await client.query("BEGIN");

        const payRes = await client.query(
            `SELECT id, related_invoice_id AS "invoiceId", amount, status
               FROM finance_payments WHERE id = $1`,
            [id],
        );
        const pay = payRes.rows[0] as { id: number; invoiceId: number; amount: number; status: string } | undefined;
        if (!pay) throw new Error("Payment not found.");
        if (pay.status === "void") throw new Error("Payment is already void.");
        if (pay.status !== "posted") throw new Error("Only posted payments can be voided.");

        await client.query(
            `UPDATE finance_payments SET status = 'void', void_reason = $2 WHERE id = $1`,
            [id, reason],
        );
        await client.query(
            `UPDATE finance_receipts SET status = 'void', void_reason = $2
              WHERE payment_id = $1 AND status <> 'void'`,
            [id, reason],
        );
        await client.query(
            `UPDATE finance_transactions_ledger SET posted_status = 'void', void_reason = $2
              WHERE source_type = 'invoice_payment' AND source_id = $1 AND posted_status <> 'void'`,
            [id, reason],
        );
        await client.query(`DELETE FROM finance_payment_allocations WHERE payment_id = $1`, [id]);

        const updated = await client.query(
            `WITH sums AS (
               SELECT COALESCE(SUM(amount), 0) AS total_paid
               FROM finance_payments
               WHERE related_invoice_id = $1 AND status = 'posted'
                 AND archived_due_to_finance_reset IS FALSE
             )
             UPDATE finance_invoices fi
             SET paid_amount = sums.total_paid,
                 balance_due = fi.total - sums.total_paid,
                 status = CASE
                   WHEN sums.total_paid >= fi.total THEN 'paid'
                   WHEN sums.total_paid > 0 THEN 'partially_paid'
                   ELSE 'sent'
                 END,
                 updated_at = NOW()
             FROM sums
             WHERE fi.id = $1 AND fi.status IN ('paid', 'partially_paid', 'sent')
             RETURNING id, balance_due AS "balanceDue", paid_amount AS "paidAmount", status`,
            [pay.invoiceId],
        );

        await client.query("COMMIT");
        return {
            id,
            invoiceId: pay.invoiceId,
            amount: Number(pay.amount),
            status: "void" as const,
            voidReason: reason,
            voidedByUserId: actorId,
            invoice: (updated.rows[0] as Record<string, unknown> | undefined) ?? null,
        };
    });
}

export async function allocatePayment(_actorOrPaymentId: unknown, _invoiceIdOrAmount?: unknown, ..._extra: unknown[]) {
    // Manual payment→invoice allocation is intentionally unsupported: in this
    // codebase a payment is auto-allocated 1:1 to its invoice when recorded
    // (recordInvoicePaymentPostgres) and invoice balances are derived from
    // posted payments, so a manual split-allocation model would double-count.
    throw new Error("Manual payment allocation is not supported: payments are auto-allocated to their invoice when recorded.");
}

export async function deallocatePayment(_actorOrPaymentId: unknown, _invoiceIdOrAllocationId?: unknown) {
    throw new Error("Manual payment de-allocation is not supported: void the payment instead (POST /api/portal/finance/payments/[id]/void).");
}

export async function listPaymentAllocations(paymentId: number) {
    const res = await queryPostgres(
        `SELECT a.id,
                a.payment_id      AS "paymentId",
                a.invoice_id      AS "invoiceId",
                a.allocated_amount AS "allocatedAmount",
                a.created_at      AS "createdAt",
                i.invoice_number  AS "invoiceNumber"
           FROM finance_payment_allocations a
           LEFT JOIN finance_invoices i ON i.id = a.invoice_id
          WHERE a.payment_id = $1
          ORDER BY a.id`,
        [paymentId],
    );
    return res.rows;
}

export async function listInvoiceAllocations(invoiceId: number) {
    const res = await queryPostgres(
        `SELECT a.id,
                a.payment_id      AS "paymentId",
                a.invoice_id      AS "invoiceId",
                a.allocated_amount AS "allocatedAmount",
                a.created_at      AS "createdAt",
                p.reference       AS "paymentReference",
                p.date            AS "paymentDate",
                p.status          AS "paymentStatus"
           FROM finance_payment_allocations a
           LEFT JOIN finance_payments p ON p.id = a.payment_id
          WHERE a.invoice_id = $1
          ORDER BY a.id`,
        [invoiceId],
    );
    return res.rows;
}

// ── Contacts (now natively exported above) ───────────────────────────

// ── File operations (now natively exported above, from finance.ts) ───
// createFinanceFileRecord / loadFinanceFileForDownload /
// verifyFinanceFileSignature live next to the finance_files queries and
// the FINANCE_FILE_SECRET signing helper.

// ── Reconciliation ───────────────────────────────────────────────────
// Link bank/cash/mobile-money statement lines to posted ledger transactions
// (finance_statement_matches, migration 0076), then roll the result up onto the
// line's match_status/matched_amount. This is bookkeeping reconciliation — it
// does NOT move money.

function isPgUniqueViolation(e: unknown): boolean {
    return !!e && typeof e === "object" && (e as { code?: string }).code === "23505";
}

// Recompute a statement line's matched_amount + match_status from the sum of
// its match rows. Runs on the caller's transaction client.
async function recomputeStatementLineMatchStatus(client: PostgresClient, statementLineId: number) {
    const res = await client.query(
        `WITH m AS (
           SELECT COALESCE(SUM(matched_amount), 0) AS total
           FROM finance_statement_matches WHERE statement_line_id = $1
         )
         UPDATE finance_statement_lines sl
         SET matched_amount = m.total,
             match_status = CASE
               WHEN m.total <= 0 THEN 'unmatched'
               WHEN m.total >= ABS(sl.amount) - 0.005 THEN 'matched'
               ELSE 'partial'
             END
         FROM m
         WHERE sl.id = $1
         RETURNING match_status AS "matchStatus", matched_amount AS "matchedAmount"`,
        [statementLineId],
    );
    return (res.rows[0] as { matchStatus?: string; matchedAmount?: number } | undefined) ?? null;
}

export async function getBankStatementReconciliation(
    filters: { accountType?: string; matchStatus?: string; month?: string; currency?: string } = {},
) {
    const { listStatementLinesPostgres } = await import("@/lib/server/postgres/repositories/finance");
    const lines = await listStatementLinesPostgres({
        accountType: filters.accountType as never,
        matchStatus: filters.matchStatus as never,
        month: filters.month,
    });
    const summary = await getReconciliationSummary(filters.month, filters.currency);
    return { lines, summary };
}

export async function matchStatementLineToLedger(
    actor: FinanceActor,
    statementLineId: number,
    ledgerTxnId: number,
    matchedAmount?: number,
) {
    const actorId = Number((actor as { id?: unknown })?.id) || null;
    return withPostgresClient(async (client) => {
        await client.query("BEGIN");
        const lineRes = await client.query(
            `SELECT id, amount FROM finance_statement_lines WHERE id = $1`,
            [statementLineId],
        );
        const line = lineRes.rows[0] as { id: number; amount: number } | undefined;
        if (!line) throw new Error("Statement line not found.");

        const ledRes = await client.query(
            `SELECT id, posted_status FROM finance_transactions_ledger WHERE id = $1`,
            [ledgerTxnId],
        );
        const led = ledRes.rows[0] as { id: number; posted_status: string } | undefined;
        if (!led) throw new Error("Ledger transaction not found.");
        if (led.posted_status !== "posted") throw new Error("Only posted ledger transactions can be reconciled.");

        const amount = Number.isFinite(Number(matchedAmount)) && Number(matchedAmount) > 0
            ? Number(matchedAmount)
            : Math.abs(Number(line.amount));

        let matchId: number;
        try {
            const ins = await client.query(
                `INSERT INTO finance_statement_matches (statement_line_id, ledger_txn_id, matched_amount, created_by_user_id)
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [statementLineId, ledgerTxnId, amount, actorId],
            );
            matchId = Number((ins.rows[0] as { id: number }).id);
        } catch (e) {
            if (isPgUniqueViolation(e)) throw new Error("This statement line is already matched to that ledger transaction.");
            throw e;
        }
        const rollup = await recomputeStatementLineMatchStatus(client, statementLineId);
        await client.query("COMMIT");
        return {
            id: matchId,
            statementLineId,
            ledgerTxnId,
            matchedAmount: amount,
            lineMatchStatus: rollup?.matchStatus ?? null,
            lineMatchedAmount: rollup?.matchedAmount ?? null,
        };
    });
}

export async function unmatchStatementLine(actor: FinanceActor, matchId: number) {
    return withPostgresClient(async (client) => {
        await client.query("BEGIN");
        const del = await client.query(
            `DELETE FROM finance_statement_matches WHERE id = $1 RETURNING statement_line_id`,
            [matchId],
        );
        const row = del.rows[0] as { statement_line_id: number } | undefined;
        if (!row) throw new Error("Match not found.");
        const statementLineId = Number(row.statement_line_id);
        const rollup = await recomputeStatementLineMatchStatus(client, statementLineId);
        await client.query("COMMIT");
        return { ok: true, statementLineId, lineMatchStatus: rollup?.matchStatus ?? null };
    });
}

export async function autoSuggestMatches(statementLineId: number) {
    // Conservative, non-destructive suggestions: posted ledger txns with the
    // SAME currency, EXACT amount (±0.01 on absolute value), within ±7 days,
    // not already linked to this line. Ranked by date proximity. These are hints
    // only — an actual match requires explicit confirmation via the 'match' action.
    const lineRes = await queryPostgres(
        `SELECT id, date::text AS date, amount, currency FROM finance_statement_lines WHERE id = $1`,
        [statementLineId],
    );
    const line = lineRes.rows[0] as { id: number; date: string; amount: number; currency: string } | undefined;
    if (!line) return [];
    const res = await queryPostgres(
        `SELECT l.id              AS "ledgerTxnId",
                l.txn_type        AS "txnType",
                l.date::text      AS date,
                l.amount,
                l.currency,
                l.category,
                l.notes,
                ABS(l.date - $2::date) AS "dayDiff"
           FROM finance_transactions_ledger l
          WHERE l.posted_status = 'posted'
            AND l.currency = $3
            AND ABS(l.amount - ABS($4::numeric)) < 0.01
            AND ABS(l.date - $2::date) <= 7
            AND NOT EXISTS (
              SELECT 1 FROM finance_statement_matches m
               WHERE m.statement_line_id = $1 AND m.ledger_txn_id = l.id
            )
          ORDER BY ABS(l.date - $2::date) ASC, l.id DESC
          LIMIT 10`,
        [statementLineId, line.date, line.currency, line.amount],
    );
    return res.rows.map((r) => {
        const row = r as Record<string, unknown>;
        const dayDiff = Number(row.dayDiff);
        return {
            ledgerTxnId: Number(row.ledgerTxnId),
            txnType: row.txnType as string,
            date: row.date as string,
            amount: Number(row.amount),
            currency: row.currency as string,
            category: (row.category as string | null) ?? null,
            notes: (row.notes as string | null) ?? null,
            dayDiff,
            confidence: dayDiff === 0 ? "high" : dayDiff <= 3 ? "medium" : "low",
        };
    });
}

export async function listFinancePayments(filter: { invoiceId?: number } = {}) {
    // Real read of recorded payments. Payments ARE created (recordFinancePayment
    // → finance_payments), so the prior []-stub left the invoice payment-history
    // view permanently empty. Returns posted + voided rows (excludes drafts) so
    // the full history is visible; status is included for the UI to render.
    const params: unknown[] = [];
    const where: string[] = ["status <> 'draft'"];
    const invoiceId = Number(filter?.invoiceId);
    if (Number.isFinite(invoiceId) && invoiceId > 0) {
        params.push(invoiceId);
        where.push(`related_invoice_id = $${params.length}`);
    }
    const res = await queryPostgres(
        `SELECT id,
                related_invoice_id AS "invoiceId",
                date, amount, currency, method, reference, notes, status,
                void_reason AS "voidReason",
                created_at AS "createdAt"
         FROM finance_payments
         WHERE ${where.join(" AND ")}
         ORDER BY date DESC, id DESC`,
        params,
    );
    return res.rows;
}

// ── Expenses are natively exported above ───────────────────────────
export async function getReconciliationSummary(month?: string, currency: string = "UGX") {
    const res = await queryPostgres(
        `SELECT
           COUNT(*) FILTER (WHERE match_status = 'matched')::int   AS matched,
           COUNT(*) FILTER (WHERE match_status = 'partial')::int    AS partial,
           COUNT(*) FILTER (WHERE match_status = 'unmatched')::int  AS unmatched,
           COUNT(*)::int                                            AS total,
           COALESCE(SUM(ABS(amount)) FILTER (WHERE match_status = 'matched'), 0)  AS "matchedAmount",
           COALESCE(SUM(ABS(amount)) FILTER (WHERE match_status <> 'matched'), 0) AS "unmatchedAmount"
         FROM finance_statement_lines
         WHERE ($1::text IS NULL OR date::text LIKE $1) AND currency = $2`,
        [month ? `${month}%` : null, currency],
    );
    const r = (res.rows[0] ?? {}) as Record<string, unknown>;
    return {
        matched: Number(r.matched ?? 0),
        partial: Number(r.partial ?? 0),
        unmatched: Number(r.unmatched ?? 0),
        total: Number(r.total ?? 0),
        matchedAmount: Number(r.matchedAmount ?? 0),
        unmatchedAmount: Number(r.unmatchedAmount ?? 0),
        currency,
        month: month ?? null,
    };
}

export async function createStatementLineAsync(
    actor: FinanceActor,
    input: { accountType?: string; date: string; amount: number; currency?: string; reference?: string | null; description?: string | null },
) {
    const actorId = Number((actor as { id?: unknown })?.id) || null;
    const res = await queryPostgres(
        `INSERT INTO finance_statement_lines
           (account_type, date, amount, currency, reference, description, match_status, matched_amount, created_by_user_id)
         VALUES ($1, $2::date, $3, $4, $5, $6, 'unmatched', 0, $7)
         RETURNING id,
                   account_type       AS "accountType",
                   date::text         AS date,
                   amount,
                   currency,
                   reference,
                   description,
                   match_status       AS "matchStatus",
                   matched_amount     AS "matchedAmount",
                   created_by_user_id AS "createdBy",
                   created_at         AS "createdAt"`,
        [
            input.accountType ?? "bank",
            input.date,
            Number(input.amount) || 0,
            input.currency ?? "UGX",
            input.reference ?? null,
            input.description ?? null,
            actorId,
        ],
    );
    return res.rows[0];
}

// ── Budgets (now natively exported above) ────────────────────────────

// ── Settings ─────────────────────────────────────────────────────────
export async function updateFinanceSettingsAsync(
    input: Partial<{
        fromEmail: string | null;
        ccFinanceEmail: string | null;
        invoicePrefix: string;
        receiptPrefix: string;
        expensePrefix: string;
        categorySubcategories: Record<string, string[]>;
        invoiceEmailTemplate: string;
        receiptEmailTemplate: string;
        paymentInstructions: string;
        cashThresholdUgx: number;
        cashThresholdUsd: number;
        backdateDaysLimit: number;
        allowReceiptMismatchOverride: boolean;
        allowReceiptReuseOverride: boolean;
        outlierMultiplier: number;
    }>,
    _actor?: FinanceActor,
) {
    // Merge the partial update over the current settings (which fall back to
    // defaults when the singleton row doesn't exist yet), then upsert the
    // CHECK(id = 1) singleton row. Returns the freshly-read settings so the
    // route responds with what is actually persisted.
    const { getFinanceSettingsPostgres } = await import("@/lib/server/postgres/repositories/finance");
    const current = await getFinanceSettingsPostgres();
    const merged = { ...current, ...input };
    await queryPostgres(
        `INSERT INTO finance_settings (
           id, from_email, cc_finance_email, invoice_prefix, receipt_prefix, expense_prefix,
           subcategories_json, invoice_email_template, receipt_email_template, payment_instructions,
           cash_threshold_ugx, cash_threshold_usd, backdate_days_limit,
           allow_receipt_mismatch_override, allow_receipt_reuse_override, outlier_multiplier, updated_at
         ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
         ON CONFLICT (id) DO UPDATE SET
           from_email = EXCLUDED.from_email,
           cc_finance_email = EXCLUDED.cc_finance_email,
           invoice_prefix = EXCLUDED.invoice_prefix,
           receipt_prefix = EXCLUDED.receipt_prefix,
           expense_prefix = EXCLUDED.expense_prefix,
           subcategories_json = EXCLUDED.subcategories_json,
           invoice_email_template = EXCLUDED.invoice_email_template,
           receipt_email_template = EXCLUDED.receipt_email_template,
           payment_instructions = EXCLUDED.payment_instructions,
           cash_threshold_ugx = EXCLUDED.cash_threshold_ugx,
           cash_threshold_usd = EXCLUDED.cash_threshold_usd,
           backdate_days_limit = EXCLUDED.backdate_days_limit,
           allow_receipt_mismatch_override = EXCLUDED.allow_receipt_mismatch_override,
           allow_receipt_reuse_override = EXCLUDED.allow_receipt_reuse_override,
           outlier_multiplier = EXCLUDED.outlier_multiplier,
           updated_at = NOW()`,
        [
            merged.fromEmail ?? null,
            merged.ccFinanceEmail ?? null,
            merged.invoicePrefix,
            merged.receiptPrefix,
            merged.expensePrefix,
            JSON.stringify(merged.categorySubcategories ?? {}),
            merged.invoiceEmailTemplate,
            merged.receiptEmailTemplate,
            merged.paymentInstructions ?? "",
            Number(merged.cashThresholdUgx) || 0,
            Number(merged.cashThresholdUsd) || 0,
            Math.max(0, Math.trunc(Number(merged.backdateDaysLimit) || 0)),
            merged.allowReceiptMismatchOverride ? 1 : 0,
            merged.allowReceiptReuseOverride ? 1 : 0,
            Number(merged.outlierMultiplier) > 0 ? Number(merged.outlierMultiplier) : 3,
        ],
    );
    return getFinanceSettingsPostgres();
}

// ── Audit sweep ──────────────────────────────────────────────────────
// Rule-based exception generation over expenses. Each rule is an
// INSERT…SELECT with a NOT EXISTS dedup on (entity_type, entity_id,
// rule_code), so re-running the sweep is idempotent and never re-flags an
// entity that was already resolved or overridden. Thresholds come from
// finance_settings (cash thresholds, backdate limit, outlier multiplier).
export async function runFinanceAuditSweep(actor: FinanceActor, _extra?: unknown) {
    const actorId = Number((actor as { id?: unknown })?.id) || null;
    const { getFinanceSettingsPostgres } = await import("@/lib/server/postgres/repositories/finance");
    const settings = await getFinanceSettingsPostgres();

    const DEDUP = `NOT EXISTS (
        SELECT 1 FROM finance_audit_exceptions x
        WHERE x.entity_type = 'expense' AND x.entity_id = e.id AND x.rule_code = $1
    )`;

    let exceptionsCreated = 0;
    const byRule: Record<string, number> = {};
    const run = async (ruleCode: string, sql: string, params: unknown[]) => {
        const res = await queryPostgres(sql, [ruleCode, ...params]);
        const created = res.rowCount ?? 0;
        byRule[ruleCode] = created;
        exceptionsCreated += created;
    };

    // 1. Cash expense above the configured threshold for its currency.
    // (Thresholds are passed twice — numeric for the comparison, text for the
    // message — because Postgres assigns exactly one type per parameter.)
    await run(
        "CASH_OVER_THRESHOLD",
        `INSERT INTO finance_audit_exceptions (entity_type, entity_id, severity, rule_code, message, amount, currency, created_by_user_id)
         SELECT 'expense', e.id, 'high', $1,
                'Cash expense ' || e.expense_number || ' of ' || e.currency || ' ' || e.amount || ' exceeds the cash threshold (' ||
                CASE WHEN e.currency = 'USD' THEN $6 ELSE $5 END || ').',
                e.amount, e.currency, $4
         FROM finance_expenses e
         WHERE e.status IN ('submitted', 'posted')
           AND e.payment_method = 'cash'
           AND ((e.currency = 'UGX' AND e.amount > $2) OR (e.currency = 'USD' AND e.amount > $3))
           AND ${DEDUP}`,
        [
            settings.cashThresholdUgx,
            settings.cashThresholdUsd,
            actorId,
            String(settings.cashThresholdUgx),
            String(settings.cashThresholdUsd),
        ],
    );

    // 2. Posted expense with no receipt evidence on file.
    await run(
        "MISSING_RECEIPT_EVIDENCE",
        `INSERT INTO finance_audit_exceptions (entity_type, entity_id, severity, rule_code, message, amount, currency, created_by_user_id)
         SELECT 'expense', e.id, 'high', $1,
                'Posted expense ' || e.expense_number || ' (' || e.currency || ' ' || e.amount || ') has no receipt evidence attached.',
                e.amount, e.currency, $2
         FROM finance_expenses e
         WHERE e.status = 'posted'
           AND NOT EXISTS (SELECT 1 FROM finance_expense_receipts r WHERE r.expense_id = e.id)
           AND ${DEDUP}`,
        [actorId],
    );

    // 3. Receipt evidence totals that disagree with the expense amount.
    await run(
        "RECEIPT_AMOUNT_MISMATCH",
        `INSERT INTO finance_audit_exceptions (entity_type, entity_id, severity, rule_code, message, amount, currency, created_by_user_id)
         SELECT 'expense', e.id, 'medium', $1,
                'Expense ' || e.expense_number || ' amount (' || e.currency || ' ' || e.amount || ') does not match its receipt total (' || r.total || ').',
                e.amount, e.currency, $2
         FROM finance_expenses e
         JOIN (
            SELECT expense_id, SUM(receipt_amount) AS total
            FROM finance_expense_receipts
            GROUP BY expense_id
         ) r ON r.expense_id = e.id
         WHERE e.status IN ('submitted', 'posted')
           AND ABS(r.total - e.amount) > 0.01
           AND ${DEDUP}`,
        [actorId],
    );

    // 4. Entry recorded long after the expense date (backdating).
    await run(
        "BACKDATED_ENTRY",
        `INSERT INTO finance_audit_exceptions (entity_type, entity_id, severity, rule_code, message, amount, currency, created_by_user_id)
         SELECT 'expense', e.id, 'medium', $1,
                'Expense ' || e.expense_number || ' was recorded ' || (e.created_at::date - e.date) || ' days after its expense date (limit ' || $4 || ').',
                e.amount, e.currency, $3
         FROM finance_expenses e
         WHERE e.status IN ('submitted', 'posted')
           AND e.created_at::date - e.date > $2
           AND ${DEDUP}`,
        [settings.backdateDaysLimit, actorId, String(settings.backdateDaysLimit)],
    );

    // 5. Amount far above the norm for its subcategory (needs >= 3 peers).
    await run(
        "AMOUNT_OUTLIER",
        `INSERT INTO finance_audit_exceptions (entity_type, entity_id, severity, rule_code, message, amount, currency, created_by_user_id)
         SELECT 'expense', e.id, 'low', $1,
                'Expense ' || e.expense_number || ' (' || e.currency || ' ' || e.amount || ') is more than ' || $4 || 'x the average for "' || COALESCE(e.subcategory, 'Uncategorized') || '".',
                e.amount, e.currency, $3
         FROM finance_expenses e
         JOIN (
            SELECT COALESCE(subcategory, '') AS sub, currency, AVG(amount) AS avg_amount, COUNT(*) AS n
            FROM finance_expenses
            WHERE status = 'posted'
            GROUP BY COALESCE(subcategory, ''), currency
         ) stats ON stats.sub = COALESCE(e.subcategory, '') AND stats.currency = e.currency
         WHERE e.status = 'posted'
           AND stats.n >= 3
           AND e.amount > stats.avg_amount * $2
           AND ${DEDUP}`,
        [settings.outlierMultiplier, actorId, String(settings.outlierMultiplier)],
    );

    const checkedRes = await queryPostgres(
        `SELECT COUNT(*)::int AS n FROM finance_expenses WHERE status IN ('submitted', 'posted')`,
    );
    const checkedExpenses = Number((checkedRes.rows[0] as { n?: number })?.n ?? 0);

    return { checkedExpenses, exceptionsCreated, byRule };
}

export async function updateFinanceAuditExceptionStatusAsync(
    id: number,
    input: { status: "acknowledged" | "resolved" | "overridden"; notes?: string },
    actor?: FinanceActor,
) {
    const actorId = Number((actor as { id?: unknown })?.id) || null;
    const closing = input.status === "resolved" || input.status === "overridden";
    const res = await queryPostgres(
        `UPDATE finance_audit_exceptions
         SET status = $2,
             resolution_notes = COALESCE($3, resolution_notes),
             resolved_at = CASE WHEN $4 THEN NOW() ELSE NULL END,
             resolved_by_user_id = CASE WHEN $4 THEN $5::int ELSE NULL END
         WHERE id = $1
         RETURNING id,
                   entity_type AS "entityType",
                   entity_id AS "entityId",
                   severity,
                   rule_code AS "ruleCode",
                   message,
                   status,
                   amount,
                   currency,
                   created_by_user_id AS "createdBy",
                   created_at AS "createdAt",
                   resolved_at AS "resolvedAt",
                   resolved_by_user_id AS "resolvedBy",
                   resolution_notes AS "resolutionNotes"`,
        [id, input.status, input.notes ?? null, closing, actorId],
    );
    const row = res.rows[0];
    if (!row) throw new Error("Audit exception not found.");
    return row;
}

// generateFinanceMonthlyStatement is now natively exported above

// ── Transparency / public snapshots ──────────────────────────────────
// Controlled-publication flow: generate (draft) → publish (typed
// confirmation phrase, matching the UI prompts) → archive. Confirmation
// phrases mirror PortalFinanceTransparencyManager exactly.

const SNAPSHOT_PUBLISH_CONFIRMATION = "PUBLISH FY SNAPSHOT";
const AUDITED_PUBLISH_CONFIRMATION = "PUBLISH AUDITED STATEMENTS";

function quarterWindow(fy: number, quarter?: "Q1" | "Q2" | "Q3" | "Q4" | null) {
    if (!quarter) return { from: `${fy}-01-01`, to: `${fy + 1}-01-01` };
    const startMonth = { Q1: 1, Q2: 4, Q3: 7, Q4: 10 }[quarter];
    const endMonth = startMonth + 3;
    const from = `${fy}-${String(startMonth).padStart(2, "0")}-01`;
    const to = endMonth > 12 ? `${fy + 1}-01-01` : `${fy}-${String(endMonth).padStart(2, "0")}-01`;
    return { from, to };
}

export async function generatePublicSnapshot(
    actor: FinanceActor,
    input: { fy: number; quarter?: "Q1" | "Q2" | "Q3" | "Q4"; currency: string },
) {
    const actorId = Number((actor as { id?: unknown })?.id);
    if (!Number.isFinite(actorId) || actorId <= 0) throw new Error("An authenticated actor is required.");
    const quarter = input.quarter ?? null;
    const { from, to } = quarterWindow(input.fy, quarter);

    // Aggregate from posted ledger entries (calendar FY, same convention as
    // generateFinanceMonthlyStatementPostgres quarters).
    const totalsRes = await queryPostgres(
        `SELECT
           COALESCE(SUM(amount) FILTER (WHERE txn_type = 'money_in'), 0)  AS income,
           COALESCE(SUM(amount) FILTER (WHERE txn_type = 'money_out'), 0) AS spend
         FROM finance_transactions_ledger
         WHERE posted_status = 'posted' AND currency = $1 AND date >= $2::date AND date < $3::date`,
        [input.currency, from, to],
    );
    const totals = totalsRes.rows[0] as { income?: number; spend?: number };
    const totalIncome = Number(totals?.income ?? 0);
    const totalExpenditure = Number(totals?.spend ?? 0);

    const categoryRes = await queryPostgres(
        `SELECT COALESCE(display_category, category, 'Uncategorized') AS name,
                COALESCE(SUM(amount) FILTER (WHERE txn_type = 'money_in'), 0)  AS income,
                COALESCE(SUM(amount) FILTER (WHERE txn_type = 'money_out'), 0) AS spent
         FROM finance_transactions_ledger
         WHERE posted_status = 'posted' AND currency = $1 AND date >= $2::date AND date < $3::date
         GROUP BY COALESCE(display_category, category, 'Uncategorized')
         ORDER BY name`,
        [input.currency, from, to],
    );
    const restrictedRes = await queryPostgres(
        `SELECT restricted_program AS program,
                COALESCE(SUM(amount) FILTER (WHERE txn_type = 'money_in'), 0)  AS received,
                COALESCE(SUM(amount) FILTER (WHERE txn_type = 'money_out'), 0) AS spent
         FROM finance_transactions_ledger
         WHERE posted_status = 'posted' AND currency = $1 AND date >= $2::date AND date < $3::date
           AND restricted_program IS NOT NULL
         GROUP BY restricted_program
         ORDER BY restricted_program`,
        [input.currency, from, to],
    );

    return withPostgresClient(async (client) => {
        await client.query("BEGIN");
        // The (fy, quarter, currency) unique constraint does NOT dedup the
        // quarter-NULL annual snapshots (NULLs compare distinct), so resolve
        // the existing row explicitly.
        const existingRes = await client.query(
            `SELECT id, status FROM finance_public_snapshots
             WHERE fy = $1 AND quarter IS NOT DISTINCT FROM $2 AND currency = $3
             LIMIT 1`,
            [input.fy, quarter, input.currency],
        );
        const existing = existingRes.rows[0] as { id: number; status: string } | undefined;
        // Draft → refresh in place. Archived → revive as a fresh draft.
        // Published → block: the public number must be archived deliberately
        // before it can be replaced.
        if (existing && existing.status === "published") {
            throw new Error(
                "A published snapshot already exists for this period — archive it before regenerating.",
            );
        }

        const net = totalIncome - totalExpenditure;
        const categoryJson = JSON.stringify(categoryRes.rows);
        const restrictedJson = JSON.stringify(restrictedRes.rows);
        let id: number;
        if (existing) {
            const upd = await client.query(
                `UPDATE finance_public_snapshots
                 SET total_income = $1, total_expenditure = $2, net = $3,
                     category_breakdown_json = $4, restricted_summary_json = $5,
                     generated_by_user_id = $6, generated_at = NOW(),
                     status = 'draft', publish_confirmation = NULL,
                     published_at = NULL, published_by_user_id = NULL, archived_at = NULL
                 WHERE id = $7
                 RETURNING id`,
                [totalIncome, totalExpenditure, net, categoryJson, restrictedJson, actorId, existing.id],
            );
            id = Number((upd.rows[0] as { id: number }).id);
        } else {
            const ins = await client.query(
                `INSERT INTO finance_public_snapshots
                   (fy, quarter, currency, snapshot_type, total_income, total_expenditure, net,
                    category_breakdown_json, restricted_summary_json, generated_by_user_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING id`,
                [
                    input.fy,
                    quarter,
                    input.currency,
                    quarter ? "quarterly" : "fy",
                    totalIncome,
                    totalExpenditure,
                    net,
                    categoryJson,
                    restrictedJson,
                    actorId,
                ],
            );
            id = Number((ins.rows[0] as { id: number }).id);
        }
        await client.query("COMMIT");
        return { id };
    });
}

export async function publishPublicSnapshot(actor: FinanceActor, id: number, confirmation: string) {
    const actorId = Number((actor as { id?: unknown })?.id) || null;
    if (confirmation !== SNAPSHOT_PUBLISH_CONFIRMATION) {
        throw new Error(`Confirmation phrase mismatch — type "${SNAPSHOT_PUBLISH_CONFIRMATION}" exactly.`);
    }
    const res = await queryPostgres(
        `UPDATE finance_public_snapshots
         SET status = 'published', publish_confirmation = $2, published_at = NOW(), published_by_user_id = $3
         WHERE id = $1 AND status = 'draft'
         RETURNING id`,
        [id, confirmation, actorId],
    );
    if (!res.rows[0]) throw new Error("Snapshot not found or not in draft state.");
    return { id };
}

export async function archivePublicSnapshot(_actor: FinanceActor, id: number) {
    const res = await queryPostgres(
        `UPDATE finance_public_snapshots
         SET status = 'archived', archived_at = NOW()
         WHERE id = $1 AND status <> 'archived'
         RETURNING id`,
        [id],
    );
    if (!res.rows[0]) throw new Error("Snapshot not found or already archived.");
    return { id };
}

export async function uploadAuditedStatement(
    actor: FinanceActor,
    input: {
        fy: number;
        storedPath: string;
        originalFilename: string;
        auditorName?: string;
        auditCompletedDate?: string;
        notes?: string;
    },
): Promise<number> {
    const actorId = Number((actor as { id?: unknown })?.id);
    if (!Number.isFinite(actorId) || actorId <= 0) throw new Error("An authenticated actor is required.");
    const res = await queryPostgres(
        `INSERT INTO finance_audited_statements
           (fy, auditor_name, audit_completed_date, stored_path, original_filename, notes, uploaded_by_user_id)
         VALUES ($1, $2, $3::date, $4, $5, $6, $7)
         RETURNING id`,
        [
            input.fy,
            input.auditorName ?? null,
            input.auditCompletedDate || null,
            input.storedPath,
            input.originalFilename,
            input.notes ?? null,
            actorId,
        ],
    );
    return Number((res.rows[0] as { id: number }).id);
}

export async function publishAuditedStatement(actor: FinanceActor, id: number, confirmation: string) {
    const actorId = Number((actor as { id?: unknown })?.id) || null;
    if (confirmation !== AUDITED_PUBLISH_CONFIRMATION) {
        throw new Error(`Confirmation phrase mismatch — type "${AUDITED_PUBLISH_CONFIRMATION}" exactly.`);
    }
    const res = await queryPostgres(
        `UPDATE finance_audited_statements
         SET status = 'published', publish_confirmation = $2, published_at = NOW(), published_by_user_id = $3
         WHERE id = $1 AND status = 'private_uploaded'
         RETURNING id`,
        [id, confirmation, actorId],
    );
    if (!res.rows[0]) throw new Error("Audited statement not found or not in a publishable state.");
    return { id };
}

export async function archiveAuditedStatement(_actor: FinanceActor, id: number) {
    const res = await queryPostgres(
        `UPDATE finance_audited_statements
         SET status = 'archived', archived_at = NOW()
         WHERE id = $1 AND status <> 'archived'
         RETURNING id`,
        [id],
    );
    if (!res.rows[0]) throw new Error("Audited statement not found or already archived.");
    return { id };
}
