// Wildcard exports for Postgres-suffixed names
export * from "@/lib/server/postgres/repositories/finance";
export * from "@/lib/server/postgres/repositories/finance-reports";
export * from "@/lib/server/postgres/repositories/finance-v2";

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

// ── Invoice CRUD ─────────────────────────────────────────────────────
export async function createFinanceInvoiceAsync(_input: unknown, _actor: FinanceActor) {
    throw new Error("createFinanceInvoiceAsync: not yet migrated to PostgreSQL");
}

export async function updateFinanceInvoiceDraftAsync(_id: number, _input: unknown, _actor: FinanceActor) {
    throw new Error("updateFinanceInvoiceDraftAsync: not yet migrated to PostgreSQL");
}

export async function deleteFinanceInvoiceDraftAsync(_id: number, _actor: FinanceActor, _extra?: unknown) {
    throw new Error("deleteFinanceInvoiceDraftAsync: not yet migrated to PostgreSQL");
}

export async function voidFinanceInvoiceAsync(_id: number, _reason: string, _actor: FinanceActor) {
    throw new Error("voidFinanceInvoiceAsync: not yet migrated to PostgreSQL");
}

export async function sendFinanceInvoice(_id: number, _actor: FinanceActor, _extra?: unknown) {
    throw new Error("sendFinanceInvoice: not yet migrated to PostgreSQL");
}

// ── Receipt CRUD ─────────────────────────────────────────────────────
export async function createFinanceReceiptAsync(_input: unknown, _actor: FinanceActor) {
    throw new Error("createFinanceReceiptAsync: not yet migrated to PostgreSQL");
}

export async function deleteFinanceReceiptDraftAsync(_id: number, _actor: FinanceActor, _extra?: unknown) {
    throw new Error("deleteFinanceReceiptDraftAsync: not yet migrated to PostgreSQL");
}

export async function voidFinanceReceiptAsync(_id: number, _reason: string, _actor: FinanceActor) {
    throw new Error("voidFinanceReceiptAsync: not yet migrated to PostgreSQL");
}

export async function issueFinanceReceipt(_id: number, _actor: FinanceActor, _extra?: unknown) {
    throw new Error("issueFinanceReceipt: not yet migrated to PostgreSQL");
}

export async function sendFinanceReceipt(_id: number, _actor: FinanceActor, _extra?: unknown) {
    throw new Error("sendFinanceReceipt: not yet migrated to PostgreSQL");
}

// ── Expense lifecycle ────────────────────────────────────────────────
export async function createFinanceExpenseAsync(_input: unknown, _actor: FinanceActor) {
    throw new Error("createFinanceExpenseAsync: not yet migrated to PostgreSQL");
}

export async function deleteFinanceExpenseDraftAsync(_id: number, _actor: FinanceActor, _extra?: unknown) {
    throw new Error("deleteFinanceExpenseDraftAsync: not yet migrated to PostgreSQL");
}

export async function voidFinanceExpenseAsync(_id: number, _reason: string, _actor: FinanceActor) {
    throw new Error("voidFinanceExpenseAsync: not yet migrated to PostgreSQL");
}

export async function postFinanceExpenseAsync(_id: number, _actor: FinanceActor, _extra?: unknown) {
    throw new Error("postFinanceExpenseAsync: not yet migrated to PostgreSQL");
}

export async function upsertFinanceExpenseReceiptsAsync(_expenseId: number, _receipts: unknown[], _actor: FinanceActor) {
    throw new Error("upsertFinanceExpenseReceiptsAsync: not yet migrated to PostgreSQL");
}

// ── Payments ─────────────────────────────────────────────────────────
export async function listFinancePayments(_invoiceId: number) {
    return [];
}

export async function recordFinancePayment(_input: unknown, _actor: FinanceActor, ..._extra: unknown[]) {
    throw new Error("recordFinancePayment: not yet migrated to PostgreSQL");
}


export async function voidFinancePaymentAsync(_id: number, _reason: string, _actor: FinanceActor) {
    throw new Error("voidFinancePaymentAsync: not yet migrated to PostgreSQL");
}

export async function allocatePayment(_paymentId: number, _invoiceId: number, _amount: number) {
    throw new Error("allocatePayment: not yet migrated to PostgreSQL");
}

export async function deallocatePayment(_paymentId: number, _invoiceId: number) {
    throw new Error("deallocatePayment: not yet migrated to PostgreSQL");
}

export async function listPaymentAllocations(_paymentId: number) {
    return [];
}

export async function listInvoiceAllocations(_invoiceId: number) {
    return [];
}

// ── Contacts ─────────────────────────────────────────────────────────
export async function createFinanceContactAsync(_input: unknown, _extra?: unknown) {
    throw new Error("createFinanceContactAsync: not yet migrated to PostgreSQL");
}

// ── File operations ──────────────────────────────────────────────────
export async function createFinanceFileRecord(_input: unknown) {
    throw new Error("createFinanceFileRecord: not yet migrated to PostgreSQL");
}

export async function loadFinanceFileForDownload(_id: number) {
    throw new Error("loadFinanceFileForDownload: not yet migrated to PostgreSQL");
}

export function verifyFinanceFileSignature(_id: number, _expires: number, _sig: string): boolean {
    return false;
}

// ── Reconciliation ───────────────────────────────────────────────────
export async function createStatementLineAsync(_input: unknown, _actor: FinanceActor) {
    throw new Error("createStatementLineAsync: not yet migrated to PostgreSQL");
}

export async function matchStatementLineToLedger(_statementLineId: number, _ledgerTxnId: number) {
    throw new Error("matchStatementLineToLedger: not yet migrated to PostgreSQL");
}

export async function unmatchStatementLine(_statementLineId: number) {
    throw new Error("unmatchStatementLine: not yet migrated to PostgreSQL");
}

export async function autoSuggestMatches(_statementLineId: number) {
    return [];
}

export async function getReconciliationSummary(_month?: string) {
    return { matched: 0, unmatched: 0, total: 0 };
}

// ── Budgets ──────────────────────────────────────────────────────────
export async function upsertMonthlyBudget(_input: unknown, _actor: FinanceActor) {
    throw new Error("upsertMonthlyBudget: not yet migrated to PostgreSQL");
}

// ── Settings ─────────────────────────────────────────────────────────
export async function updateFinanceSettingsAsync(_input: unknown) {
    throw new Error("updateFinanceSettingsAsync: not yet migrated to PostgreSQL");
}

// ── Audit sweep ──────────────────────────────────────────────────────
export async function runFinanceAuditSweep(_month: string) {
    return { exceptionsCreated: 0 };
}

export async function updateFinanceAuditExceptionStatusAsync(_id: number, _status: string, _actor: FinanceActor) {
    throw new Error("updateFinanceAuditExceptionStatusAsync: not yet migrated to PostgreSQL");
}

// ── Monthly statements ───────────────────────────────────────────────
export async function generateFinanceMonthlyStatement(_month: string, _actor: FinanceActor, _extra?: unknown) {
    throw new Error("generateFinanceMonthlyStatement: not yet migrated to PostgreSQL");
}

// ── Transparency / public snapshots ──────────────────────────────────
export async function generatePublicSnapshot(_actor: FinanceActor) {
    throw new Error("generatePublicSnapshot: not yet migrated to PostgreSQL");
}

export async function publishPublicSnapshot(_id: number, _actor: FinanceActor, _extra?: unknown) {
    throw new Error("publishPublicSnapshot: not yet migrated to PostgreSQL");
}

export async function archivePublicSnapshot(_id: number, _actor: FinanceActor, _extra?: unknown) {
    throw new Error("archivePublicSnapshot: not yet migrated to PostgreSQL");
}

export async function uploadAuditedStatement(_input: unknown, _actor: FinanceActor) {
    throw new Error("uploadAuditedStatement: not yet migrated to PostgreSQL");
}

export async function publishAuditedStatement(_id: number, _actor: FinanceActor, _extra?: unknown) {
    throw new Error("publishAuditedStatement: not yet migrated to PostgreSQL");
}

export async function archiveAuditedStatement(_id: number, _actor: FinanceActor, _extra?: unknown) {
    throw new Error("archiveAuditedStatement: not yet migrated to PostgreSQL");
}
