/**
 * finance-db.ts — Barrel re-export layer for finance functions.
 * Tests import from `../lib/finance-db`, this file re-exports from the
 * PostgreSQL-backed financeService.
 */
export {
  createFinanceContactAsync,
  createFinanceExpenseAsync,
  createFinanceFileRecord,
  createFinanceInvoiceAsync,
  createFinanceReceiptAsync,
  generateFinanceMonthlyStatement,
  issueFinanceReceipt,
  sendFinanceInvoice,
  listFinanceLedgerTransactions,
  postFinanceExpenseAsync,
  recordFinancePayment,
  submitFinanceExpenseAsync,
  upsertFinanceExpenseReceiptsAsync,
} from "@/services/financeService";
