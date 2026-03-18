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
