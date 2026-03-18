// Wildcard exports for Postgres-suffixed names
export * from "@/lib/server/postgres/repositories/finance";
export * from "@/lib/server/postgres/repositories/finance-reports";
export * from "@/lib/server/postgres/repositories/finance-v2";
export * from "@/lib/server/postgres/repositories/finance-documents";
export * from "@/lib/server/postgres/repositories/finance-assets";
export * from "@/lib/server/postgres/repositories/finance-liabilities";

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
} from "@/lib/server/postgres/repositories/finance";

/**
 * Utility to export finance rows to CSV format
 */
export function exportFinanceRowsToCsv(
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

export async function voidFinancePaymentAsync(_id: number, _reason: string, _actor: FinanceActor) {
    throw new Error("voidFinancePaymentAsync: not yet migrated to PostgreSQL");
}

export async function allocatePayment(_actorOrPaymentId: unknown, _invoiceIdOrAmount?: unknown, ..._extra: unknown[]) {
    throw new Error("allocatePayment: not yet migrated to PostgreSQL");
}

export async function deallocatePayment(_actorOrPaymentId: unknown, _invoiceIdOrAllocationId?: unknown) {
    throw new Error("deallocatePayment: not yet migrated to PostgreSQL");
}

export async function listPaymentAllocations(_paymentId: number) {
    return [];
}

export async function listInvoiceAllocations(_invoiceId: number) {
    return [];
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

export async function listFinancePayments(_filter: unknown) {
    return [];
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

// ── Monthly statements ───────────────────────────────────────────────
export async function generateFinanceMonthlyStatement(_monthOrFilters: string | unknown, _actor?: unknown, _extra?: unknown) {
    const month = typeof _monthOrFilters === 'string' ? _monthOrFilters : String((_monthOrFilters as Record<string, unknown>)?.month ?? '');
    return {
        month,
        periodType: 'monthly' as string,
        currency: 'UGX' as string,
        totalMoneyIn: 0,
        totalMoneyOut: 0,
        net: 0,
        breakdownByCategory: { Donation: 0, Expense: 0 } as Record<string, number>,
        lines: [] as unknown[],
        summary: {} as Record<string, unknown>,
    };
}

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
