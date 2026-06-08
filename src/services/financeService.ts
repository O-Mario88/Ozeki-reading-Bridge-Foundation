import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";

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

// ── File operations ──────────────────────────────────────────────────
export async function createFinanceFileRecord(_input: unknown, _actor?: unknown) {
    return { id: 0, storedPath: '', fileName: '', mimeType: 'application/octet-stream' };
}

export async function loadFinanceFileForDownload(_id: string | number) {
    return { bytes: Buffer.alloc(0), mimeType: "application/octet-stream", fileName: "unknown" };
}

export function verifyFinanceFileSignature(_id: string | number | null, _expires: string | number | null, _sig: string | null): boolean {
    return false;
}

// ── Reconciliation ───────────────────────────────────────────────────
export async function getBankStatementReconciliation(..._args: unknown[]) {
    return { lines: [], summary: { matched: 0, unmatched: 0 } };
}

export async function matchStatementLineToLedger(..._args: unknown[]) {
    throw new Error("matchStatementLineToLedger: not yet migrated to PostgreSQL");
}

export async function unmatchStatementLine(..._args: unknown[]) {
    throw new Error("unmatchStatementLine: not yet migrated to PostgreSQL");
}

export async function autoSuggestMatches(_statementLineId: number) {
    return [];
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
export async function getReconciliationSummary(_month?: string, _currency?: string) {
    return { matched: 0, unmatched: 0, total: 0 };
}

export async function createStatementLineAsync(_actor: unknown, _input: unknown) {
    return { id: 0 };
}

// ── Budgets (now natively exported above) ────────────────────────────

// ── Settings ─────────────────────────────────────────────────────────
export async function updateFinanceSettingsAsync(_input: unknown, _actor?: unknown) {
    throw new Error("updateFinanceSettingsAsync: not yet migrated to PostgreSQL");
}

// ── Audit sweep ──────────────────────────────────────────────────────
export async function runFinanceAuditSweep(_monthOrActor: unknown, _extra?: unknown) {
    return { exceptionsCreated: 0 };
}

export async function updateFinanceAuditExceptionStatusAsync(_id: number, _status: unknown, _actor?: FinanceActor) {
    throw new Error("updateFinanceAuditExceptionStatusAsync: not yet migrated to PostgreSQL");
}

// generateFinanceMonthlyStatement is now natively exported above

// ── Transparency / public snapshots ──────────────────────────────────
export async function generatePublicSnapshot(..._args: unknown[]) {
    return { id: 0 };
}

export async function publishPublicSnapshot(..._args: unknown[]) {
    throw new Error("publishPublicSnapshot: not yet migrated to PostgreSQL");
}

export async function archivePublicSnapshot(..._args: unknown[]) {
    throw new Error("archivePublicSnapshot: not yet migrated to PostgreSQL");
}

export async function uploadAuditedStatement(_input: unknown, _actor: FinanceActor) {
    throw new Error("uploadAuditedStatement: not yet migrated to PostgreSQL");
}

export async function publishAuditedStatement(..._args: unknown[]) {
    throw new Error("publishAuditedStatement: not yet migrated to PostgreSQL");
}

export async function archiveAuditedStatement(..._args: unknown[]) {
    throw new Error("archiveAuditedStatement: not yet migrated to PostgreSQL");
}
