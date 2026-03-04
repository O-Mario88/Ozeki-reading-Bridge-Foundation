import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type Database from "better-sqlite3";
import { getDb, logAuditEvent } from "@/lib/db";
import { generateInvoicePdfFile, generateReceiptPdfFile, generateStatementPdfFile } from "@/lib/finance-documents";
import { sendFinanceMail } from "@/lib/finance-email";
import { officialContact } from "@/lib/contact";
import {
  createFinanceIncomeBreakdownZero,
  FINANCE_INCOME_CATEGORIES,
  mapFinanceIncomeToBaseCategory,
  normalizeFinanceIncomeCategory,
  type FinanceBaseIncomeCategory,
  type FinanceIncomeCategory,
} from "@/lib/finance-categories";
import type {
  FinanceBudgetMonthlyRecord,
  FinanceBudgetVsActualLine,
  FinanceCategory,
  FinanceContactInput,
  FinanceContactRecord,
  FinanceCurrency,
  FinanceDashboardSummary,
  FinanceEmailLogEntry,
  FinanceExpenseInput,
  FinanceExpenseRecord,
  FinanceFileRecord,
  FinanceInvoiceInput,
  FinanceInvoiceLineItemInput,
  FinanceInvoiceLineItemRecord,
  FinanceInvoiceRecord,
  FinanceMatchStatus,
  FinanceMonthlyStatementRecord,
  FinancePaymentAllocationRecord,
  FinancePaymentInput,
  FinancePaymentRecord,
  FinancePostedStatus,
  FinanceReceiptInput,
  FinanceReceiptRecord,
  FinanceReconciliationMatchRecord,
  FinanceRestrictedBalanceLine,
  FinanceRestrictedProgram,
  FinanceSettingsRecord,
  FinanceStatementAccountType,
  FinanceStatementLineRecord,
  FinanceTransactionSourceType,
  FinanceLedgerTransactionRecord,
} from "@/lib/types";

type FinanceActor = {
  userId: number;
  userName: string;
};

type FinanceEmailResult = {
  status: "sent" | "failed" | "skipped";
  providerMessage: string;
};

type FinanceStatementPeriodType = "monthly" | "quarterly" | "fiscal_year";

type FinanceStatementPeriodInput = {
  periodType?: FinanceStatementPeriodType;
  month?: string;
  year?: number | string;
  quarter?: "Q1" | "Q2" | "Q3" | "Q4";
};

type FinancePositionLine = {
  label: string;
  amount: number;
};

type FinanceStatementPosition = {
  asOfDate: string;
  currentAssets: FinancePositionLine[];
  nonCurrentAssets: FinancePositionLine[];
  currentLiabilities: FinancePositionLine[];
  nonCurrentLiabilities: FinancePositionLine[];
  equityLines: FinancePositionLine[];
};

type FinanceIncomeStatement = {
  asOfDate: string;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  marketingExpenses: number;
  rent: number;
  utilities: number;
  insurance: number;
  generalAdmin: number;
  depreciation: number;
  totalOperatingExpenses: number;
  operatingIncome: number;
  interestExpense: number;
  incomeBeforeTax: number;
  incomeTaxExpense: number;
  netIncome: number;
};

type InvoiceRow = NonNullable<ReturnType<typeof getInvoiceRowById>>;
type ReceiptRow = NonNullable<ReturnType<typeof getReceiptRowById>>;

const DEFAULT_CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  Donation: ["General Donation", "Campaign Donation", "In-kind Support"],
  Training: ["Teacher Training", "Phonics Training", "Cluster Workshop"],
  "School Coaching visits and Follow Up": ["Coaching Visit", "Follow-up Support", "Mentor Check-in"],
  Assessment: ["Baseline Assessment", "Progress Assessment", "Endline Assessment"],
  Contracts: ["Training Delivery", "M&E Services", "Technical Assistance"],
  Sponsorship: ["Event Sponsorship", "Program Sponsorship", "Materials Sponsorship"],
  Expense: ["Transport", "Printing", "Per Diem", "Materials", "Operations", "Other"],
};

const DEFAULT_INVOICE_TEMPLATE = [
  "Dear {{contactName}},",
  "",
  "Please find attached Invoice {{invoiceNumber}} from Ozeki Reading Bridge Foundation.",
  "Amount due: {{currency}} {{total}}",
  "Due date: {{dueDate}}",
  "",
  "{{paymentInstructions}}",
  "",
  "Thank you,",
  "Ozeki Reading Bridge Foundation",
].join("\n");

const DEFAULT_RECEIPT_TEMPLATE = [
  "Dear {{contactName}},",
  "",
  "Please find attached Receipt {{receiptNumber}} from Ozeki Reading Bridge Foundation.",
  "Amount received: {{currency}} {{amount}}",
  "Date received: {{receiptDate}}",
  "{{descriptionLine}}",
  "",
  "Thank you for supporting our literacy work.",
  "",
  "Ozeki Reading Bridge Foundation",
].join("\n");

const FINANCE_FILE_SECRET =
  process.env.FINANCE_FILE_SIGNING_SECRET ||
  process.env.PORTAL_PASSWORD_SALT ||
  "orbf-finance-files-secret";
const REQUIRED_INVOICE_CC = ["amos@ozekiread.org", "support@ozekiread.org"];

let financeSchemaReady = false;

function hasTableColumn(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function ensureTableColumn(db: Database.Database, table: string, column: string, definition: string) {
  if (!hasTableColumn(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function todayIsoDate() {
  return nowIso().slice(0, 10);
}

function normalizeCurrency(value: string | undefined | null): FinanceCurrency {
  if (String(value || "").toUpperCase() === "USD") {
    return "USD";
  }
  return "UGX";
}

function normalizeStatementPeriodType(value: string | undefined | null): FinanceStatementPeriodType {
  if (value === "quarterly" || value === "fiscal_year") {
    return value;
  }
  return "monthly";
}

function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => String(item ?? "").trim())
      .filter((item) => item.length > 0);
  } catch {
    return [];
  }
}

function sanitizeEmailList(items: string[]): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim().toLowerCase())
        .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)),
    ),
  );
}

function ensureFinanceSchema() {
  if (financeSchemaReady) {
    return;
  }

  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS finance_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emails_json TEXT NOT NULL DEFAULT '[]',
      phone TEXT,
      whatsapp TEXT,
      address TEXT,
      contact_type TEXT NOT NULL CHECK(contact_type IN ('donor', 'partner', 'sponsor', 'other')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS finance_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      contact_id INTEGER NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Donations', 'Contracts', 'Sponsorship')),
      display_category TEXT,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'UGX',
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      balance_due REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void')) DEFAULT 'draft',
      notes TEXT,
      pdf_stored_path TEXT,
      pdf_file_id INTEGER,
      emailed_at TEXT,
      last_sent_to TEXT,
      void_reason TEXT,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(contact_id) REFERENCES finance_contacts(id),
      FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_finance_invoices_status ON finance_invoices(status);
    CREATE INDEX IF NOT EXISTS idx_finance_invoices_due_date ON finance_invoices(due_date);
    CREATE INDEX IF NOT EXISTS idx_finance_invoices_contact ON finance_invoices(contact_id);

    CREATE TABLE IF NOT EXISTS finance_invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      qty REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(invoice_id) REFERENCES finance_invoices(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_finance_invoice_items_invoice ON finance_invoice_items(invoice_id);

    CREATE TABLE IF NOT EXISTS finance_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT NOT NULL UNIQUE,
      contact_id INTEGER NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Donations', 'Contracts', 'Sponsorship')),
      display_category TEXT,
      received_from TEXT NOT NULL,
      receipt_date TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'UGX',
      amount_received REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque', 'other')),
      reference_no TEXT,
      related_invoice_id INTEGER,
      description TEXT,
      notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('draft', 'issued', 'void')) DEFAULT 'draft',
      pdf_stored_path TEXT,
      pdf_file_id INTEGER,
      emailed_at TEXT,
      last_sent_to TEXT,
      void_reason TEXT,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(contact_id) REFERENCES finance_contacts(id),
      FOREIGN KEY(related_invoice_id) REFERENCES finance_invoices(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_finance_receipts_status ON finance_receipts(status);
    CREATE INDEX IF NOT EXISTS idx_finance_receipts_date ON finance_receipts(receipt_date);
    CREATE INDEX IF NOT EXISTS idx_finance_receipts_invoice ON finance_receipts(related_invoice_id);

    CREATE TABLE IF NOT EXISTS finance_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      related_invoice_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'UGX',
      method TEXT NOT NULL CHECK(method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque', 'other')),
      reference TEXT,
      notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('draft', 'posted', 'void')) DEFAULT 'posted',
      void_reason TEXT,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(related_invoice_id) REFERENCES finance_invoices(id),
      FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_finance_payments_invoice ON finance_payments(related_invoice_id);
    CREATE INDEX IF NOT EXISTS idx_finance_payments_status ON finance_payments(status);
    CREATE INDEX IF NOT EXISTS idx_finance_payments_date ON finance_payments(date);

    CREATE TABLE IF NOT EXISTS finance_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_number TEXT NOT NULL UNIQUE,
      vendor_name TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Expense' CHECK(category = 'Expense'),
      subcategory TEXT,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'UGX',
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque', 'other')),
      description TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('draft', 'posted', 'void')) DEFAULT 'draft',
      void_reason TEXT,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_finance_expenses_status ON finance_expenses(status);
    CREATE INDEX IF NOT EXISTS idx_finance_expenses_date ON finance_expenses(date);

    CREATE TABLE IF NOT EXISTS finance_transactions_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      txn_type TEXT NOT NULL CHECK(txn_type IN ('money_in', 'money_out')),
      category TEXT NOT NULL CHECK(category IN ('Donations', 'Contracts', 'Sponsorship', 'Expense')),
      display_category TEXT,
      subcategory TEXT,
      date TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'UGX',
      amount REAL NOT NULL DEFAULT 0,
      counterparty_contact_id INTEGER,
      source_type TEXT NOT NULL CHECK(source_type IN ('receipt', 'invoice_payment', 'expense', 'adjustment')),
      source_id INTEGER NOT NULL,
      notes TEXT,
      evidence_file_ids_json TEXT NOT NULL DEFAULT '[]',
      posted_status TEXT NOT NULL CHECK(posted_status IN ('draft', 'posted', 'void')) DEFAULT 'posted',
      posted_at TEXT,
      void_reason TEXT,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(counterparty_contact_id) REFERENCES finance_contacts(id),
      FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_finance_ledger_txn_type ON finance_transactions_ledger(txn_type);
    CREATE INDEX IF NOT EXISTS idx_finance_ledger_category ON finance_transactions_ledger(category);
    CREATE INDEX IF NOT EXISTS idx_finance_ledger_date ON finance_transactions_ledger(date);
    CREATE INDEX IF NOT EXISTS idx_finance_ledger_source ON finance_transactions_ledger(source_type, source_id);

    CREATE TABLE IF NOT EXISTS finance_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,
      source_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      uploaded_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(uploaded_by_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_finance_files_source ON finance_files(source_type, source_id);

    CREATE TABLE IF NOT EXISTS finance_monthly_statements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      period_type TEXT NOT NULL DEFAULT 'monthly' CHECK(period_type IN ('monthly', 'quarterly', 'fiscal_year')),
      currency TEXT NOT NULL DEFAULT 'UGX',
      total_money_in REAL NOT NULL DEFAULT 0,
      total_money_out REAL NOT NULL DEFAULT 0,
      net REAL NOT NULL DEFAULT 0,
      breakdown_json TEXT NOT NULL DEFAULT '{}',
      pdf_stored_path TEXT,
      pdf_file_id INTEGER,
      balance_sheet_pdf_file_id INTEGER,
      statement_of_financial_position_pdf_file_id INTEGER,
      income_statement_pdf_file_id INTEGER,
      generated_by_user_id INTEGER NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(month, currency),
      FOREIGN KEY(generated_by_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_finance_statements_month ON finance_monthly_statements(month, currency);

    CREATE TABLE IF NOT EXISTS finance_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      from_email TEXT,
      cc_finance_email TEXT,
      invoice_prefix TEXT NOT NULL DEFAULT 'ORBF-INV',
      receipt_prefix TEXT NOT NULL DEFAULT 'ORBF-RCT',
      expense_prefix TEXT NOT NULL DEFAULT 'ORBF-EXP',
      subcategories_json TEXT NOT NULL DEFAULT '{}',
      invoice_email_template TEXT NOT NULL,
      receipt_email_template TEXT NOT NULL,
      payment_instructions TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS finance_email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_type TEXT NOT NULL CHECK(record_type IN ('invoice', 'receipt')),
      record_id INTEGER NOT NULL,
      to_email TEXT NOT NULL,
      cc_email TEXT,
      subject TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sent', 'failed', 'skipped')),
      provider_message TEXT,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_finance_email_logs_record ON finance_email_logs(record_type, record_id);
  `);

  ensureTableColumn(db, "finance_invoices", "display_category", "TEXT");
  ensureTableColumn(db, "finance_receipts", "display_category", "TEXT");
  ensureTableColumn(db, "finance_receipts", "description", "TEXT");
  ensureTableColumn(db, "finance_transactions_ledger", "display_category", "TEXT");
  ensureTableColumn(db, "finance_monthly_statements", "period_type", "TEXT NOT NULL DEFAULT 'monthly'");
  ensureTableColumn(db, "finance_monthly_statements", "balance_sheet_pdf_file_id", "INTEGER");
  ensureTableColumn(db, "finance_monthly_statements", "statement_of_financial_position_pdf_file_id", "INTEGER");
  ensureTableColumn(db, "finance_monthly_statements", "income_statement_pdf_file_id", "INTEGER");
  db.exec(`
    UPDATE finance_invoices
    SET display_category = COALESCE(display_category, CASE WHEN category = 'Donations' THEN 'Donation' ELSE category END)
    WHERE display_category IS NULL OR TRIM(display_category) = '';
    UPDATE finance_receipts
    SET display_category = COALESCE(display_category, CASE WHEN category = 'Donations' THEN 'Donation' ELSE category END)
    WHERE display_category IS NULL OR TRIM(display_category) = '';
    UPDATE finance_transactions_ledger
    SET display_category = COALESCE(display_category, CASE WHEN category = 'Donations' THEN 'Donation' ELSE category END)
    WHERE display_category IS NULL OR TRIM(display_category) = '';
    UPDATE finance_monthly_statements
    SET period_type = COALESCE(NULLIF(TRIM(period_type), ''), 'monthly');
  `);

  const settingsExists = db.prepare("SELECT id FROM finance_settings WHERE id = 1 LIMIT 1").get() as
    | { id: number }
    | undefined;
  if (!settingsExists) {
    db.prepare(
      `
      INSERT INTO finance_settings (
        id,
        from_email,
        cc_finance_email,
        invoice_prefix,
        receipt_prefix,
        expense_prefix,
        subcategories_json,
        invoice_email_template,
        receipt_email_template,
        payment_instructions,
        updated_at
      ) VALUES (
        1,
        @fromEmail,
        @ccFinanceEmail,
        'ORBF-INV',
        'ORBF-RCT',
        'ORBF-EXP',
        @subcategoriesJson,
        @invoiceEmailTemplate,
        @receiptEmailTemplate,
        @paymentInstructions,
        @updatedAt
      )
    `,
    ).run({
      fromEmail: process.env.FINANCE_EMAIL_FROM?.trim() || officialContact.email,
      ccFinanceEmail: officialContact.email,
      subcategoriesJson: JSON.stringify(DEFAULT_CATEGORY_SUBCATEGORIES),
      invoiceEmailTemplate: DEFAULT_INVOICE_TEMPLATE,
      receiptEmailTemplate: DEFAULT_RECEIPT_TEMPLATE,
      paymentInstructions:
        "Payments can be made via bank transfer or mobile money. Contact support@ozekiread.org for account details.",
      updatedAt: nowIso(),
    });
  }

  /* ── V2: New tables for reconciliation, payment allocation, budgets ── */
  db.exec(`
    CREATE TABLE IF NOT EXISTS finance_statement_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_type TEXT NOT NULL CHECK(account_type IN ('bank', 'cash', 'mobile_money')),
      date TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'UGX',
      reference TEXT,
      description TEXT,
      match_status TEXT NOT NULL CHECK(match_status IN ('unmatched', 'matched', 'partial')) DEFAULT 'unmatched',
      matched_amount REAL NOT NULL DEFAULT 0,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_fin_stmt_lines_status ON finance_statement_lines(match_status);
    CREATE INDEX IF NOT EXISTS idx_fin_stmt_lines_date ON finance_statement_lines(date);

    CREATE TABLE IF NOT EXISTS finance_reconciliation_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      statement_line_id INTEGER NOT NULL,
      ledger_txn_id INTEGER NOT NULL,
      matched_amount REAL NOT NULL DEFAULT 0,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(statement_line_id) REFERENCES finance_statement_lines(id) ON DELETE CASCADE,
      FOREIGN KEY(ledger_txn_id) REFERENCES finance_transactions_ledger(id),
      FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_fin_recon_stmt ON finance_reconciliation_matches(statement_line_id);
    CREATE INDEX IF NOT EXISTS idx_fin_recon_ledger ON finance_reconciliation_matches(ledger_txn_id);

    CREATE TABLE IF NOT EXISTS finance_payment_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      invoice_id INTEGER NOT NULL,
      allocated_amount REAL NOT NULL DEFAULT 0,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(payment_id) REFERENCES finance_payments(id),
      FOREIGN KEY(invoice_id) REFERENCES finance_invoices(id),
      FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_fin_alloc_payment ON finance_payment_allocations(payment_id);
    CREATE INDEX IF NOT EXISTS idx_fin_alloc_invoice ON finance_payment_allocations(invoice_id);

    CREATE TABLE IF NOT EXISTS finance_budgets_monthly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'UGX',
      subcategory TEXT NOT NULL,
      budget_amount REAL NOT NULL DEFAULT 0,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(month, currency, subcategory),
      FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_fin_budgets_month ON finance_budgets_monthly(month, currency);
  `);

  /* ── V2: Restriction columns on receipts, expenses, ledger ── */
  ensureTableColumn(db, "finance_receipts", "restricted_flag", "INTEGER DEFAULT 0");
  ensureTableColumn(db, "finance_receipts", "restricted_program", "TEXT");
  ensureTableColumn(db, "finance_receipts", "restricted_geo_scope", "TEXT");
  ensureTableColumn(db, "finance_receipts", "restricted_geo_id", "INTEGER");
  ensureTableColumn(db, "finance_receipts", "restriction_notes", "TEXT");

  ensureTableColumn(db, "finance_expenses", "restricted_flag", "INTEGER DEFAULT 0");
  ensureTableColumn(db, "finance_expenses", "restricted_program", "TEXT");
  ensureTableColumn(db, "finance_expenses", "restricted_geo_scope", "TEXT");
  ensureTableColumn(db, "finance_expenses", "restricted_geo_id", "INTEGER");
  ensureTableColumn(db, "finance_expenses", "restriction_notes", "TEXT");

  ensureTableColumn(db, "finance_transactions_ledger", "restricted_flag", "INTEGER DEFAULT 0");
  ensureTableColumn(db, "finance_transactions_ledger", "restricted_program", "TEXT");
  ensureTableColumn(db, "finance_transactions_ledger", "restricted_geo_scope", "TEXT");
  ensureTableColumn(db, "finance_transactions_ledger", "restricted_geo_id", "INTEGER");
  ensureTableColumn(db, "finance_transactions_ledger", "restriction_notes", "TEXT");

  /* ── V2: Transparency Hub tables ── */
  db.exec(`
    CREATE TABLE IF NOT EXISTS finance_public_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fy INTEGER NOT NULL,
      quarter TEXT,
      currency TEXT NOT NULL DEFAULT 'UGX',
      snapshot_type TEXT NOT NULL CHECK(snapshot_type IN ('fy', 'quarterly')),
      status TEXT NOT NULL CHECK(status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
      total_income REAL NOT NULL DEFAULT 0,
      total_expenditure REAL NOT NULL DEFAULT 0,
      net REAL NOT NULL DEFAULT 0,
      program_pct REAL,
      admin_pct REAL,
      category_breakdown_json TEXT NOT NULL DEFAULT '[]',
      restricted_summary_json TEXT NOT NULL DEFAULT '[]',
      pdf_file_id INTEGER,
      stored_path TEXT,
      publish_confirmation TEXT,
      published_at TEXT,
      published_by_user_id INTEGER,
      archived_at TEXT,
      generated_by_user_id INTEGER NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(fy, quarter, currency),
      FOREIGN KEY(published_by_user_id) REFERENCES portal_users(id),
      FOREIGN KEY(generated_by_user_id) REFERENCES portal_users(id)
    );

    CREATE TABLE IF NOT EXISTS finance_audited_statements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fy INTEGER NOT NULL,
      auditor_name TEXT,
      audit_completed_date TEXT,
      status TEXT NOT NULL CHECK(status IN ('private_uploaded', 'published', 'archived')) DEFAULT 'private_uploaded',
      stored_path TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      notes TEXT,
      publish_confirmation TEXT,
      published_at TEXT,
      published_by_user_id INTEGER,
      archived_at TEXT,
      uploaded_by_user_id INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(published_by_user_id) REFERENCES portal_users(id),
      FOREIGN KEY(uploaded_by_user_id) REFERENCES portal_users(id)
    );
  `);

  financeSchemaReady = true;
};

function getFinanceSettingsRow(db: Database.Database): FinanceSettingsRecord {
  const row = db.prepare(
    `
      SELECT
        from_email AS fromEmail,
        cc_finance_email AS ccFinanceEmail,
        invoice_prefix AS invoicePrefix,
        receipt_prefix AS receiptPrefix,
        expense_prefix AS expensePrefix,
        subcategories_json AS subcategoriesJson,
        invoice_email_template AS invoiceEmailTemplate,
        receipt_email_template AS receiptEmailTemplate,
        payment_instructions AS paymentInstructions
      FROM finance_settings
      WHERE id = 1
      LIMIT 1
    `,
  ).get() as
    | {
      fromEmail: string | null;
      ccFinanceEmail: string | null;
      invoicePrefix: string;
      receiptPrefix: string;
      expensePrefix: string;
      subcategoriesJson: string;
      invoiceEmailTemplate: string;
      receiptEmailTemplate: string;
      paymentInstructions: string;
    }
    | undefined;

  if (!row) {
    return {
      fromEmail: officialContact.email,
      ccFinanceEmail: officialContact.email,
      invoicePrefix: "ORBF-INV",
      receiptPrefix: "ORBF-RCT",
      expensePrefix: "ORBF-EXP",
      categorySubcategories: { ...DEFAULT_CATEGORY_SUBCATEGORIES },
      invoiceEmailTemplate: DEFAULT_INVOICE_TEMPLATE,
      receiptEmailTemplate: DEFAULT_RECEIPT_TEMPLATE,
      paymentInstructions: "",
    };
  }

  let categorySubcategories: Record<string, string[]> = { ...DEFAULT_CATEGORY_SUBCATEGORIES };
  try {
    const parsed = JSON.parse(row.subcategoriesJson || "{}") as Record<string, unknown>;
    const parsedSubcategories = Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, parseJsonArray(JSON.stringify(value))]),
    );
    if (parsedSubcategories.Donations && !parsedSubcategories.Donation) {
      parsedSubcategories.Donation = parsedSubcategories.Donations;
    }
    categorySubcategories = {
      ...DEFAULT_CATEGORY_SUBCATEGORIES,
      ...parsedSubcategories,
    };
  } catch {
    categorySubcategories = { ...DEFAULT_CATEGORY_SUBCATEGORIES };
  }

  return {
    fromEmail: row.fromEmail,
    ccFinanceEmail: row.ccFinanceEmail,
    invoicePrefix: row.invoicePrefix || "ORBF-INV",
    receiptPrefix: row.receiptPrefix || "ORBF-RCT",
    expensePrefix: row.expensePrefix || "ORBF-EXP",
    categorySubcategories,
    invoiceEmailTemplate: row.invoiceEmailTemplate || DEFAULT_INVOICE_TEMPLATE,
    receiptEmailTemplate: row.receiptEmailTemplate || DEFAULT_RECEIPT_TEMPLATE,
    paymentInstructions: row.paymentInstructions || "",
  };
}

function nextNumberFor(
  db: Database.Database,
  table: "finance_invoices" | "finance_receipts" | "finance_expenses",
  column: "invoice_number" | "receipt_number" | "expense_number",
  prefix: string,
  date: string,
) {
  const year = (date || todayIsoDate()).slice(0, 4);
  const base = `${prefix}-${year}-`;
  const row = db.prepare(`SELECT ${column} AS num FROM ${table} WHERE ${column} LIKE @needle ORDER BY ${column} DESC LIMIT 1`)
    .get({ needle: `${base}%` }) as { num: string } | undefined;
  const nextSeq = row?.num ? Number(row.num.split("-").pop() || "0") + 1 : 1;
  return `${base}${String(nextSeq).padStart(4, "0")}`;
}

function parseContactRow(row: {
  id: number;
  name: string;
  emailsJson: string;
  phone: string | null;
  address: string | null;
  contactType: string;
  createdAt: string;
}): FinanceContactRecord {
  return {
    id: row.id,
    name: row.name,
    emails: parseJsonArray(row.emailsJson),
    phone: row.phone || undefined,
    address: row.address || undefined,
    contactType: row.contactType as FinanceContactRecord["contactType"],
    createdAt: row.createdAt,
  };
}

function parseInvoiceLineItemRows(
  rows: Array<{ id: number; description: string; qty: number; unitPrice: number; amount: number }>,
): FinanceInvoiceLineItemRecord[] {
  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    qty: normalizeNumber(Number(row.qty)),
    unitPrice: normalizeNumber(Number(row.unitPrice)),
    amount: normalizeNumber(Number(row.amount)),
  }));
}

function getLatestLinkedReceiptForInvoice(db: Database.Database, invoiceId: number): FinanceInvoiceRecord["linkedReceipt"] {
  const row = db.prepare(
    `
      SELECT
        id,
        receipt_number AS receiptNumber,
        status,
        amount_received AS amountReceived,
        receipt_date AS receiptDate,
        pdf_file_id AS pdfFileId,
        pdf_stored_path AS pdfStoredPath,
        emailed_at AS emailedAt,
        last_sent_to AS lastSentTo
      FROM finance_receipts
      WHERE related_invoice_id = @invoiceId
        AND status != 'void'
      ORDER BY CASE WHEN status = 'issued' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 1
    `,
  ).get({ invoiceId }) as
    | {
      id: number;
      receiptNumber: string;
      status: string;
      amountReceived: number;
      receiptDate: string;
      pdfFileId: number | null;
      pdfStoredPath: string | null;
      emailedAt: string | null;
      lastSentTo: string | null;
    }
    | undefined;
  if (!row) {
    return undefined;
  }
  return {
    id: row.id,
    receiptNumber: row.receiptNumber,
    status: row.status as FinanceReceiptRecord["status"],
    amountReceived: normalizeNumber(Number(row.amountReceived)),
    receiptDate: row.receiptDate,
    pdfFileId: row.pdfFileId ?? undefined,
    pdfUrl: row.pdfFileId ? getSignedFinanceFileUrl(row.pdfFileId) : undefined,
    emailedAt: row.emailedAt || undefined,
    lastSentTo: row.lastSentTo || undefined,
  };
}

function buildInvoiceRecord(
  db: Database.Database,
  row: InvoiceRow,
): FinanceInvoiceRecord {
  const itemRows = db.prepare(
    `
      SELECT
        id,
        description,
        qty,
        unit_price AS unitPrice,
        amount
      FROM finance_invoice_items
      WHERE invoice_id = @invoiceId
      ORDER BY id ASC
    `,
  ).all({ invoiceId: row.id }) as Array<{
    id: number;
    description: string;
    qty: number;
    unitPrice: number;
    amount: number;
  }>;
  const lineItems = parseInvoiceLineItemRows(itemRows);
  const linkedReceipt = getLatestLinkedReceiptForInvoice(db, row.id);

  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    contactId: row.contactId,
    category: normalizeFinanceIncomeCategory(row.category),
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    currency: normalizeCurrency(row.currency),
    lineItems,
    subtotal: normalizeNumber(Number(row.subtotal)),
    tax: normalizeNumber(Number(row.tax)),
    total: normalizeNumber(Number(row.total)),
    paidAmount: normalizeNumber(Number(row.paidAmount)),
    balanceDue: normalizeNumber(Number(row.balanceDue)),
    status: row.status as FinanceInvoiceRecord["status"],
    notes: row.notes || undefined,
    pdfFileId: row.pdfFileId ?? undefined,
    pdfUrl: row.pdfFileId ? getSignedFinanceFileUrl(row.pdfFileId) : undefined,
    emailedAt: row.emailedAt || undefined,
    lastSentTo: row.lastSentTo || undefined,
    voidReason: row.voidReason || undefined,
    createdBy: row.createdBy,
    createdByName: row.createdByName || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    linkedReceipt,
  };
}

function buildReceiptRecord(row: ReceiptRow): FinanceReceiptRecord {
  return {
    id: row.id,
    receiptNumber: row.receiptNumber,
    contactId: row.contactId,
    category: normalizeFinanceIncomeCategory(row.category),
    receivedFrom: row.receivedFrom,
    receiptDate: row.receiptDate,
    currency: normalizeCurrency(row.currency),
    amountReceived: normalizeNumber(Number(row.amountReceived)),
    paymentMethod: row.paymentMethod as FinanceReceiptRecord["paymentMethod"],
    referenceNo: row.referenceNo || undefined,
    relatedInvoiceId: row.relatedInvoiceId ?? undefined,
    description: row.description || undefined,
    notes: row.notes || undefined,
    status: row.status as FinanceReceiptRecord["status"],
    pdfFileId: row.pdfFileId ?? undefined,
    pdfUrl: row.pdfFileId ? getSignedFinanceFileUrl(row.pdfFileId) : undefined,
    emailedAt: row.emailedAt || undefined,
    lastSentTo: row.lastSentTo || undefined,
    voidReason: row.voidReason || undefined,
    createdBy: row.createdBy,
    createdByName: row.createdByName || undefined,
    createdAt: row.createdAt,
  };
}

function buildExpenseRecord(row: {
  id: number;
  expenseNumber: string;
  vendorName: string;
  date: string;
  subcategory: string | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  description: string;
  notes: string | null;
  status: string;
  voidReason: string | null;
  createdBy: number;
  createdByName: string | null;
  createdAt: string;
}): FinanceExpenseRecord {
  return {
    id: row.id,
    expenseNumber: row.expenseNumber,
    vendorName: row.vendorName,
    date: row.date,
    category: "Expense",
    subcategory: row.subcategory || undefined,
    amount: normalizeNumber(Number(row.amount)),
    currency: normalizeCurrency(row.currency),
    paymentMethod: row.paymentMethod as FinanceExpenseRecord["paymentMethod"],
    description: row.description,
    notes: row.notes || undefined,
    status: row.status as FinancePostedStatus,
    voidReason: row.voidReason || undefined,
    createdBy: row.createdBy,
    createdByName: row.createdByName || undefined,
    createdAt: row.createdAt,
  };
}

function appendAudit(actor: FinanceActor, action: string, table: string, targetId: number, detail: string) {
  logAuditEvent(actor.userId, actor.userName, action, table, targetId, null, null, detail, null);
}

function getMonthWindow(month: string) {
  const safe = /^\d{4}-\d{2}$/.test(month) ? month : todayIsoDate().slice(0, 7);
  const from = `${safe}-01`;
  const [yearRaw, monthRaw] = safe.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw);
  const nextMonth = monthIndex === 12 ? `${year + 1}-01` : `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const to = `${nextMonth}-01`;
  return { month: safe, from, to };
}

function currentYearUtc() {
  return Number(todayIsoDate().slice(0, 4));
}

function safeYear(value: number | string | undefined) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 2000 && numeric <= 3000) {
    return Math.trunc(numeric);
  }
  return currentYearUtc();
}

function periodWindowFromInput(input: FinanceStatementPeriodInput | string) {
  if (typeof input === "string") {
    const monthWindow = getMonthWindow(input);
    return {
      periodType: "monthly" as const,
      month: monthWindow.month,
      from: monthWindow.from,
      to: monthWindow.to,
    };
  }

  const requestedType = input.periodType || "monthly";
  if (requestedType === "quarterly") {
    const year = safeYear(input.year);
    const quarter = input.quarter || "Q1";
    const quarterStartMonth: Record<"Q1" | "Q2" | "Q3" | "Q4", number> = {
      Q1: 1,
      Q2: 4,
      Q3: 7,
      Q4: 10,
    };
    const startMonth = quarterStartMonth[quarter];
    const endMonth = startMonth + 3;
    const month = `${year}-${quarter}`;
    const from = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const toYear = endMonth > 12 ? year + 1 : year;
    const toMonth = endMonth > 12 ? endMonth - 12 : endMonth;
    const to = `${toYear}-${String(toMonth).padStart(2, "0")}-01`;
    return {
      periodType: "quarterly" as const,
      month,
      from,
      to,
    };
  }

  if (requestedType === "fiscal_year") {
    const year = safeYear(input.year);
    return {
      periodType: "fiscal_year" as const,
      month: `FY-${year}`,
      from: `${year}-01-01`,
      to: `${year + 1}-01-01`,
    };
  }

  const monthly = getMonthWindow(input.month || todayIsoDate().slice(0, 7));
  return {
    periodType: "monthly" as const,
    month: monthly.month,
    from: monthly.from,
    to: monthly.to,
  };
}

function toMonthEndDate(window: { to: string }) {
  const monthStartNext = new Date(`${window.to}T00:00:00.000Z`);
  monthStartNext.setUTCDate(monthStartNext.getUTCDate() - 1);
  return monthStartNext.toISOString().slice(0, 10);
}

function matchesAnyKeyword(value: string, keywords: string[]) {
  const text = value.toLowerCase();
  return keywords.some((keyword) => text.includes(keyword));
}

function deriveStatementOfFinancialPosition(
  db: Database.Database,
  currency: FinanceCurrency,
  window: { month: string; from: string; to: string },
): FinanceStatementPosition {
  const asOfDate = toMonthEndDate(window);

  const postedCashRow = db.prepare(
    `
      SELECT
        COALESCE(SUM(CASE WHEN txn_type = 'money_in' THEN amount ELSE -amount END), 0) AS cashBalance
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND currency = @currency
        AND date < @toDate
    `,
  ).get({
    currency,
    toDate: window.to,
  }) as { cashBalance: number } | undefined;

  const receivableRow = db.prepare(
    `
      SELECT
        COALESCE(SUM(balance_due), 0) AS receivables
      FROM finance_invoices
      WHERE status IN ('sent', 'overdue', 'partially_paid')
        AND currency = @currency
        AND issue_date < @toDate
    `,
  ).get({
    currency,
    toDate: window.to,
  }) as { receivables: number } | undefined;

  const postedExpenseRows = db.prepare(
    `
      SELECT
        amount,
        COALESCE(subcategory, '') AS subcategory,
        COALESCE(description, '') AS description,
        date
      FROM finance_expenses
      WHERE status = 'posted'
        AND currency = @currency
        AND date < @toDate
    `,
  ).all({
    currency,
    toDate: window.to,
  }) as Array<{
    amount: number;
    subcategory: string;
    description: string;
    date: string;
  }>;

  const draftExpenseRows = db.prepare(
    `
      SELECT
        amount,
        COALESCE(subcategory, '') AS subcategory,
        COALESCE(description, '') AS description,
        date
      FROM finance_expenses
      WHERE status = 'draft'
        AND currency = @currency
        AND date < @toDate
    `,
  ).all({
    currency,
    toDate: window.to,
  }) as Array<{
    amount: number;
    subcategory: string;
    description: string;
    date: string;
  }>;

  const equipmentKeywords = ["equipment", "tools", "computer", "laptop", "printer", "furniture", "tablet"];
  const landBuildingKeywords = ["land", "building", "property", "premise", "construction"];
  const vehicleKeywords = ["vehicle", "car", "van", "truck", "bus", "motorcycle", "bike"];
  const supplyKeywords = ["supply", "supplies", "material", "materials", "stationery", "printing", "print"];
  const utilityKeywords = ["utility", "utilities", "power", "electric", "water", "internet", "airtime"];
  const shortDebtKeywords = ["short-term debt", "short term debt", "loan", "advance", "overdraft"];
  const taxKeywords = ["tax", "vat", "withholding", "paye"];
  const longDebtKeywords = ["long-term debt", "long term debt", "long-term loan", "long term loan"];
  const pensionKeywords = ["pension", "benefit", "gratuity"];

  let officeSupplies = 0;
  let toolsAndEquipment = 0;
  let landAndBuilding = 0;

  postedExpenseRows.forEach((row) => {
    const text = `${row.subcategory} ${row.description}`.toLowerCase();
    const amount = normalizeNumber(Number(row.amount || 0));
    if (amount <= 0) {
      return;
    }
    if (matchesAnyKeyword(text, landBuildingKeywords)) {
      landAndBuilding += amount;
      return;
    }
    if (matchesAnyKeyword(text, equipmentKeywords)) {
      toolsAndEquipment += amount;
      return;
    }
    if (matchesAnyKeyword(text, vehicleKeywords)) {
      toolsAndEquipment += amount;
      return;
    }
    if (matchesAnyKeyword(text, supplyKeywords)) {
      officeSupplies += amount;
    }
  });

  let accountsPayable = 0;
  let accruedExpenses = 0;
  let shortTermDebt = 0;
  let taxesPayable = 0;
  let longTermDebt = 0;
  let pensionAndOtherBenefits = 0;

  draftExpenseRows.forEach((row) => {
    const text = `${row.subcategory} ${row.description}`.toLowerCase();
    const amount = normalizeNumber(Number(row.amount || 0));
    if (amount <= 0) {
      return;
    }
    if (matchesAnyKeyword(text, longDebtKeywords)) {
      longTermDebt += amount;
      return;
    }
    if (matchesAnyKeyword(text, pensionKeywords)) {
      pensionAndOtherBenefits += amount;
      return;
    }
    if (matchesAnyKeyword(text, shortDebtKeywords)) {
      shortTermDebt += amount;
      return;
    }
    if (matchesAnyKeyword(text, taxKeywords)) {
      taxesPayable += amount;
      return;
    }
    if (matchesAnyKeyword(text, utilityKeywords) || row.date >= window.from) {
      accruedExpenses += amount;
      return;
    }
    accountsPayable += amount;
  });

  const cashBalance = normalizeNumber(Number(postedCashRow?.cashBalance || 0));
  const cashAsset = Math.max(0, cashBalance);
  const overdraft = Math.max(0, -cashBalance);
  const receivables = normalizeNumber(Number(receivableRow?.receivables || 0));

  const currentAssets = [
    { label: "Cash", amount: normalizeNumber(cashAsset) },
    { label: "Accounts receivable, net", amount: receivables },
    { label: "Office supplies, net", amount: normalizeNumber(officeSupplies) },
  ];

  const nonCurrentAssets = [
    { label: "Equipment, net", amount: normalizeNumber(toolsAndEquipment) },
    { label: "Land and building, net", amount: normalizeNumber(landAndBuilding) },
  ];

  const currentLiabilities = [
    { label: "Short-term debt", amount: normalizeNumber(shortTermDebt) },
    { label: "Accounts payable", amount: normalizeNumber(accountsPayable) },
    { label: "Taxes payable", amount: normalizeNumber(taxesPayable) },
    { label: "Accrued expenses", amount: normalizeNumber(accruedExpenses) },
  ];
  if (overdraft > 0) {
    currentLiabilities.push({ label: "Bank overdraft", amount: normalizeNumber(overdraft) });
  }
  const nonCurrentLiabilities = [
    { label: "Long-term debt", amount: normalizeNumber(longTermDebt) },
    { label: "Pensions and other benefits", amount: normalizeNumber(pensionAndOtherBenefits) },
  ];

  const totalAssets = normalizeNumber(
    currentAssets.reduce((sum, line) => sum + line.amount, 0) +
    nonCurrentAssets.reduce((sum, line) => sum + line.amount, 0),
  );
  const totalLiabilities = normalizeNumber(
    currentLiabilities.reduce((sum, line) => sum + line.amount, 0) +
    nonCurrentLiabilities.reduce((sum, line) => sum + line.amount, 0),
  );
  const retainedEarnings = normalizeNumber(totalAssets - totalLiabilities);
  const equityLines = [{ label: "Owner's equity", amount: retainedEarnings }];

  return {
    asOfDate,
    currentAssets,
    nonCurrentAssets,
    currentLiabilities,
    nonCurrentLiabilities,
    equityLines,
  };
}

function deriveIncomeStatement(
  db: Database.Database,
  currency: FinanceCurrency,
  window: { month: string; from: string; to: string },
): FinanceIncomeStatement {
  const rows = db.prepare(
    `
      SELECT
        txn_type AS txnType,
        amount,
        COALESCE(subcategory, '') AS subcategory,
        COALESCE(notes, '') AS notes,
        source_type AS sourceType
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND currency = @currency
        AND date >= @fromDate
        AND date < @toDate
    `,
  ).all({
    currency,
    fromDate: window.from,
    toDate: window.to,
  }) as Array<{
    txnType: "money_in" | "money_out";
    amount: number;
    subcategory: string;
    notes: string;
    sourceType: string;
  }>;

  const cogsKeywords = [
    "materials",
    "material",
    "printing",
    "print",
    "book",
    "story",
    "assessment",
    "training",
    "coaching",
    "phonics",
    "program delivery",
    "content",
  ];
  const marketingKeywords = ["marketing", "promotion", "campaign", "communications", "branding", "publicity"];
  const rentKeywords = ["rent", "office space", "premises"];
  const utilityKeywords = ["utility", "utilities", "power", "electric", "water", "internet", "airtime"];
  const insuranceKeywords = ["insurance"];
  const depreciationKeywords = ["depreciation", "amortization"];
  const interestKeywords = ["interest", "loan interest", "finance charge", "bank charge"];
  const taxKeywords = ["tax", "vat", "withholding", "paye"];

  let revenue = 0;
  let costOfGoodsSold = 0;
  let marketingExpenses = 0;
  let rent = 0;
  let utilities = 0;
  let insurance = 0;
  let depreciation = 0;
  let interestExpense = 0;
  let incomeTaxExpense = 0;
  let generalAdmin = 0;

  rows.forEach((row) => {
    const amount = normalizeNumber(Number(row.amount || 0));
    if (amount <= 0) {
      return;
    }
    if (row.txnType === "money_in") {
      revenue += amount;
      return;
    }

    const text = `${row.subcategory} ${row.notes} ${row.sourceType}`.toLowerCase();
    if (matchesAnyKeyword(text, interestKeywords)) {
      interestExpense += amount;
      return;
    }
    if (matchesAnyKeyword(text, taxKeywords)) {
      incomeTaxExpense += amount;
      return;
    }
    if (matchesAnyKeyword(text, depreciationKeywords)) {
      depreciation += amount;
      return;
    }
    if (matchesAnyKeyword(text, marketingKeywords)) {
      marketingExpenses += amount;
      return;
    }
    if (matchesAnyKeyword(text, rentKeywords)) {
      rent += amount;
      return;
    }
    if (matchesAnyKeyword(text, utilityKeywords)) {
      utilities += amount;
      return;
    }
    if (matchesAnyKeyword(text, insuranceKeywords)) {
      insurance += amount;
      return;
    }
    if (matchesAnyKeyword(text, cogsKeywords)) {
      costOfGoodsSold += amount;
      return;
    }
    generalAdmin += amount;
  });

  const normalizedRevenue = normalizeNumber(revenue);
  const normalizedCogs = normalizeNumber(costOfGoodsSold);
  const grossProfit = normalizeNumber(normalizedRevenue - normalizedCogs);
  const totalOperatingExpenses = normalizeNumber(
    marketingExpenses + rent + utilities + insurance + generalAdmin + depreciation,
  );
  const operatingIncome = normalizeNumber(grossProfit - totalOperatingExpenses);
  const incomeBeforeTax = normalizeNumber(operatingIncome - interestExpense);
  const netIncome = normalizeNumber(incomeBeforeTax - incomeTaxExpense);

  return {
    asOfDate: toMonthEndDate(window),
    revenue: normalizedRevenue,
    costOfGoodsSold: normalizedCogs,
    grossProfit,
    marketingExpenses: normalizeNumber(marketingExpenses),
    rent: normalizeNumber(rent),
    utilities: normalizeNumber(utilities),
    insurance: normalizeNumber(insurance),
    generalAdmin: normalizeNumber(generalAdmin),
    depreciation: normalizeNumber(depreciation),
    totalOperatingExpenses,
    operatingIncome,
    interestExpense: normalizeNumber(interestExpense),
    incomeBeforeTax,
    incomeTaxExpense: normalizeNumber(incomeTaxExpense),
    netIncome,
  };
}

function renderTemplate(template: string, tokens: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => tokens[key] ?? "");
}

function getInvoiceContact(db: Database.Database, contactId: number) {
  const row = db.prepare(
    `
      SELECT
        id,
        name,
        emails_json AS emailsJson,
        phone,
        address,
        contact_type AS contactType,
        created_at AS createdAt
      FROM finance_contacts
      WHERE id = @id
      LIMIT 1
    `,
  ).get({ id: contactId }) as
    | {
      id: number;
      name: string;
      emailsJson: string;
      phone: string | null;
      address: string | null;
      contactType: string;
      createdAt: string;
    }
    | undefined;
  if (!row) {
    throw new Error("Contact not found.");
  }
  return parseContactRow(row);
}

function createLedgerEntry(
  db: Database.Database,
  input: {
    txnType: "money_in" | "money_out";
    category: FinanceBaseIncomeCategory | "Expense";
    displayCategory?: FinanceIncomeCategory;
    subcategory?: string;
    date: string;
    currency: FinanceCurrency;
    amount: number;
    counterpartyContactId?: number;
    sourceType: FinanceTransactionSourceType;
    sourceId: number;
    notes?: string;
    evidenceFileIds?: number[];
    postedStatus?: FinancePostedStatus;
    actor: FinanceActor;
  },
) {
  const status = input.postedStatus || "posted";
  db.prepare(
    `
      INSERT INTO finance_transactions_ledger (
        txn_type,
        category,
        display_category,
        subcategory,
        date,
        currency,
        amount,
        counterparty_contact_id,
        source_type,
        source_id,
        notes,
        evidence_file_ids_json,
        posted_status,
        posted_at,
        created_by_user_id,
        created_at
      ) VALUES (
        @txnType,
        @category,
        @displayCategory,
        @subcategory,
        @date,
        @currency,
        @amount,
        @counterpartyContactId,
        @sourceType,
        @sourceId,
        @notes,
        @evidenceFileIdsJson,
        @postedStatus,
        @postedAt,
        @createdBy,
        @createdAt
      )
    `,
  ).run({
    txnType: input.txnType,
    category: input.category,
    displayCategory: input.displayCategory || null,
    subcategory: input.subcategory || null,
    date: input.date,
    currency: normalizeCurrency(input.currency),
    amount: normalizeNumber(input.amount),
    counterpartyContactId: input.counterpartyContactId ?? null,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    notes: input.notes || null,
    evidenceFileIdsJson: JSON.stringify((input.evidenceFileIds || []).filter((id) => Number.isFinite(id))),
    postedStatus: status,
    postedAt: status === "posted" ? nowIso() : null,
    createdBy: input.actor.userId,
    createdAt: nowIso(),
  });
}

function voidLedgerEntriesForSource(
  db: Database.Database,
  sourceType: FinanceTransactionSourceType,
  sourceId: number,
  reason: string,
  actor: FinanceActor,
) {
  db.prepare(
    `
      UPDATE finance_transactions_ledger
      SET posted_status = 'void',
          void_reason = @reason,
          notes = COALESCE(notes, '') || '\nVoided by ' || @actorName || ' at ' || @stamp
      WHERE source_type = @sourceType
        AND source_id = @sourceId
        AND posted_status != 'void'
    `,
  ).run({
    reason,
    actorName: actor.userName,
    stamp: nowIso(),
    sourceType,
    sourceId,
  });
}

function computeInvoiceStatus(
  previousStatus: FinanceInvoiceRecord["status"],
  dueDate: string,
  total: number,
  paidAmount: number,
) {
  const roundedTotal = normalizeNumber(total);
  const roundedPaid = normalizeNumber(paidAmount);
  const today = todayIsoDate();

  if (previousStatus === "void") {
    return "void" as FinanceInvoiceRecord["status"];
  }
  if (roundedPaid >= roundedTotal && roundedTotal > 0) {
    return "paid" as FinanceInvoiceRecord["status"];
  }
  if (roundedPaid > 0) {
    return "partially_paid" as FinanceInvoiceRecord["status"];
  }
  if (previousStatus === "draft") {
    return "draft" as FinanceInvoiceRecord["status"];
  }
  if (dueDate < today) {
    return "overdue" as FinanceInvoiceRecord["status"];
  }
  return "sent" as FinanceInvoiceRecord["status"];
}

function refreshInvoiceBalances(db: Database.Database, invoiceId: number) {
  const invoice = db.prepare(
    `
      SELECT id, total, due_date AS dueDate, status
      FROM finance_invoices
      WHERE id = @id
      LIMIT 1
    `,
  ).get({ id: invoiceId }) as
    | {
      id: number;
      total: number;
      dueDate: string;
      status: FinanceInvoiceRecord["status"];
    }
    | undefined;
  if (!invoice) {
    throw new Error("Invoice not found.");
  }
  if (invoice.status === "void") {
    return;
  }

  const paymentRow = db.prepare(
    `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM finance_payments
      WHERE related_invoice_id = @invoiceId
        AND status = 'posted'
    `,
  ).get({ invoiceId }) as { total: number } | undefined;

  const receiptRow = db.prepare(
    `
      SELECT COALESCE(SUM(amount_received), 0) AS total
      FROM finance_receipts
      WHERE related_invoice_id = @invoiceId
        AND status = 'issued'
    `,
  ).get({ invoiceId }) as { total: number } | undefined;

  const paidAmount = normalizeNumber(Number(paymentRow?.total || 0) + Number(receiptRow?.total || 0));
  const total = normalizeNumber(Number(invoice.total || 0));
  const balanceDue = normalizeNumber(Math.max(0, total - paidAmount));
  const nextStatus = computeInvoiceStatus(invoice.status, invoice.dueDate, total, paidAmount);

  db.prepare(
    `
      UPDATE finance_invoices
      SET paid_amount = @paidAmount,
          balance_due = @balanceDue,
          status = @status,
          updated_at = @updatedAt
      WHERE id = @id
    `,
  ).run({
    id: invoiceId,
    paidAmount,
    balanceDue,
    status: nextStatus,
    updatedAt: nowIso(),
  });
}

function markOverdueInvoices(db: Database.Database) {
  db.prepare(
    `
      UPDATE finance_invoices
      SET status = 'overdue',
          updated_at = @updatedAt
      WHERE status IN ('sent', 'partially_paid')
        AND balance_due > 0
        AND due_date < @today
    `,
  ).run({
    updatedAt: nowIso(),
    today: todayIsoDate(),
  });
}

function getInvoiceRowById(db: Database.Database, invoiceId: number) {
  return db.prepare(
    `
      SELECT
        i.id,
        i.invoice_number AS invoiceNumber,
        i.contact_id AS contactId,
        c.name AS contactName,
        c.emails_json AS contactEmailsJson,
        i.category AS baseCategory,
        COALESCE(i.display_category, CASE WHEN i.category = 'Donations' THEN 'Donation' ELSE i.category END) AS category,
        i.issue_date AS issueDate,
        i.due_date AS dueDate,
        i.currency,
        i.subtotal,
        i.tax,
        i.total,
        i.paid_amount AS paidAmount,
        i.balance_due AS balanceDue,
        i.status,
        i.notes,
        i.pdf_stored_path AS pdfStoredPath,
        i.pdf_file_id AS pdfFileId,
        i.emailed_at AS emailedAt,
        i.last_sent_to AS lastSentTo,
        i.void_reason AS voidReason,
        i.created_by_user_id AS createdBy,
        u.full_name AS createdByName,
        i.created_at AS createdAt,
        i.updated_at AS updatedAt
      FROM finance_invoices i
      JOIN finance_contacts c ON c.id = i.contact_id
      JOIN portal_users u ON u.id = i.created_by_user_id
      WHERE i.id = @invoiceId
      LIMIT 1
    `,
  ).get({ invoiceId }) as
    | {
      id: number;
      invoiceNumber: string;
      contactId: number;
      contactName: string;
      contactEmailsJson: string;
      baseCategory: FinanceBaseIncomeCategory;
      category: string;
      issueDate: string;
      dueDate: string;
      currency: string;
      subtotal: number;
      tax: number;
      total: number;
      paidAmount: number;
      balanceDue: number;
      status: string;
      notes: string | null;
      pdfStoredPath: string | null;
      pdfFileId: number | null;
      emailedAt: string | null;
      lastSentTo: string | null;
      voidReason: string | null;
      createdBy: number;
      createdByName: string | null;
      createdAt: string;
      updatedAt: string;
    }
    | undefined;
}

function getReceiptRowById(db: Database.Database, receiptId: number) {
  return db.prepare(
    `
      SELECT
        r.id,
        r.receipt_number AS receiptNumber,
        r.contact_id AS contactId,
        r.category AS baseCategory,
        COALESCE(r.display_category, CASE WHEN r.category = 'Donations' THEN 'Donation' ELSE r.category END) AS category,
        r.received_from AS receivedFrom,
        r.receipt_date AS receiptDate,
        r.currency,
        r.amount_received AS amountReceived,
        r.payment_method AS paymentMethod,
        r.reference_no AS referenceNo,
        r.related_invoice_id AS relatedInvoiceId,
        r.description,
        r.notes,
        r.status,
        r.pdf_stored_path AS pdfStoredPath,
        r.pdf_file_id AS pdfFileId,
        r.emailed_at AS emailedAt,
        r.last_sent_to AS lastSentTo,
        r.void_reason AS voidReason,
        r.created_by_user_id AS createdBy,
        u.full_name AS createdByName,
        r.created_at AS createdAt
      FROM finance_receipts r
      JOIN portal_users u ON u.id = r.created_by_user_id
      WHERE r.id = @receiptId
      LIMIT 1
    `,
  ).get({ receiptId }) as
    | {
      id: number;
      receiptNumber: string;
      contactId: number;
      baseCategory: FinanceBaseIncomeCategory;
      category: string;
      receivedFrom: string;
      receiptDate: string;
      currency: string;
      amountReceived: number;
      paymentMethod: string;
      referenceNo: string | null;
      relatedInvoiceId: number | null;
      description: string | null;
      notes: string | null;
      status: string;
      pdfStoredPath: string | null;
      pdfFileId: number | null;
      emailedAt: string | null;
      lastSentTo: string | null;
      voidReason: string | null;
      createdBy: number;
      createdByName: string | null;
      createdAt: string;
    }
    | undefined;
}

function logFinanceEmail(
  db: Database.Database,
  input: {
    recordType: "invoice" | "receipt";
    recordId: number;
    toEmail: string;
    ccEmail?: string | null;
    subject: string;
    result: FinanceEmailResult;
    actor: FinanceActor;
  },
) {
  db.prepare(
    `
      INSERT INTO finance_email_logs (
        record_type,
        record_id,
        to_email,
        cc_email,
        subject,
        status,
        provider_message,
        created_by_user_id,
        created_at
      ) VALUES (
        @recordType,
        @recordId,
        @toEmail,
        @ccEmail,
        @subject,
        @status,
        @providerMessage,
        @createdBy,
        @createdAt
      )
    `,
  ).run({
    recordType: input.recordType,
    recordId: input.recordId,
    toEmail: input.toEmail,
    ccEmail: input.ccEmail || null,
    subject: input.subject,
    status: input.result.status,
    providerMessage: input.result.providerMessage || null,
    createdBy: input.actor.userId,
    createdAt: nowIso(),
  });
}

function contactEmailsById(db: Database.Database, contactId: number) {
  const row = db.prepare(
    `
      SELECT emails_json AS emailsJson
      FROM finance_contacts
      WHERE id = @id
      LIMIT 1
    `,
  ).get({ id: contactId }) as { emailsJson: string } | undefined;
  return sanitizeEmailList(parseJsonArray(row?.emailsJson));
}

function parseLineItems(input: FinanceInvoiceLineItemInput[]) {
  const items = (input || [])
    .map((item) => ({
      description: String(item.description || "").trim(),
      qty: Number(item.qty || 0),
      unitPrice: Number(item.unitPrice || 0),
    }))
    .filter((item) => item.description.length > 0 && Number.isFinite(item.qty) && Number.isFinite(item.unitPrice));

  if (items.length === 0) {
    throw new Error("Invoice requires at least one valid line item.");
  }

  return items.map((item) => ({
    ...item,
    amount: normalizeNumber(item.qty * item.unitPrice),
  }));
}

export function getSignedFinanceFileUrl(fileId: number, expiresInSeconds = 60 * 60) {
  ensureFinanceSchema();
  const expires = Math.floor(Date.now() / 1000) + Math.max(60, expiresInSeconds);
  const payload = `${fileId}:${expires}`;
  const signature = crypto.createHmac("sha256", FINANCE_FILE_SECRET).update(payload).digest("hex");
  return `/api/portal/finance/files/${fileId}?expires=${expires}&sig=${signature}`;
}

export function verifyFinanceFileSignature(fileId: number, expiresRaw: string | null, sigRaw: string | null) {
  if (!expiresRaw || !sigRaw) {
    return false;
  }
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const payload = `${fileId}:${expires}`;
  const expected = crypto.createHmac("sha256", FINANCE_FILE_SECRET).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigRaw));
  } catch {
    return false;
  }
}

export function listFinanceContacts() {
  ensureFinanceSchema();
  const rows = getDb().prepare(
    `
      SELECT
        id,
        name,
        emails_json AS emailsJson,
        phone,
        address,
        contact_type AS contactType,
        created_at AS createdAt
      FROM finance_contacts
      ORDER BY created_at DESC
    `,
  ).all() as Array<{
    id: number;
    name: string;
    emailsJson: string;
    phone: string | null;
    address: string | null;
    contactType: string;
    createdAt: string;
  }>;

  return rows.map(parseContactRow);
}

export function createFinanceContact(input: FinanceContactInput, actor: FinanceActor): FinanceContactRecord {
  ensureFinanceSchema();
  const db = getDb();
  const emails = sanitizeEmailList(input.emails || []);
  if (!input.name?.trim()) {
    throw new Error("Contact name is required.");
  }
  if (emails.length === 0) {
    throw new Error("At least one contact email is required.");
  }

  const result = db.prepare(
    `
      INSERT INTO finance_contacts (
        name,
        emails_json,
        phone,
        whatsapp,
        address,
        contact_type,
        created_at
      ) VALUES (
        @name,
        @emailsJson,
        @phone,
        @whatsapp,
        @address,
        @contactType,
        @createdAt
      )
    `,
  ).run({
    name: input.name.trim(),
    emailsJson: JSON.stringify(emails),
    phone: input.phone?.trim() || null,
    whatsapp: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    contactType: input.contactType,
    createdAt: nowIso(),
  });

  const row = db.prepare(
    `
      SELECT
        id,
        name,
        emails_json AS emailsJson,
        phone,
        address,
        contact_type AS contactType,
        created_at AS createdAt
      FROM finance_contacts
      WHERE id = @id
      LIMIT 1
    `,
  ).get({ id: Number(result.lastInsertRowid) }) as {
    id: number;
    name: string;
    emailsJson: string;
    phone: string | null;
    address: string | null;
    contactType: string;
    createdAt: string;
  };

  appendAudit(actor, "create", "finance_contacts", row.id, `Created finance contact ${row.name}`);
  return parseContactRow(row);
}

export function getFinanceSettings(): FinanceSettingsRecord {
  ensureFinanceSchema();
  return getFinanceSettingsRow(getDb());
}

export function updateFinanceSettings(
  updates: Partial<FinanceSettingsRecord>,
  actor: FinanceActor,
): FinanceSettingsRecord {
  ensureFinanceSchema();
  const db = getDb();
  const current = getFinanceSettingsRow(db);
  const next: FinanceSettingsRecord = {
    fromEmail: updates.fromEmail ?? current.fromEmail,
    ccFinanceEmail: updates.ccFinanceEmail ?? current.ccFinanceEmail,
    invoicePrefix: updates.invoicePrefix?.trim() || current.invoicePrefix,
    receiptPrefix: updates.receiptPrefix?.trim() || current.receiptPrefix,
    expensePrefix: updates.expensePrefix?.trim() || current.expensePrefix,
    categorySubcategories: updates.categorySubcategories || current.categorySubcategories,
    invoiceEmailTemplate: updates.invoiceEmailTemplate || current.invoiceEmailTemplate,
    receiptEmailTemplate: updates.receiptEmailTemplate || current.receiptEmailTemplate,
    paymentInstructions: updates.paymentInstructions ?? current.paymentInstructions,
  };

  db.prepare(
    `
      UPDATE finance_settings
      SET from_email = @fromEmail,
          cc_finance_email = @ccFinanceEmail,
          invoice_prefix = @invoicePrefix,
          receipt_prefix = @receiptPrefix,
          expense_prefix = @expensePrefix,
          subcategories_json = @subcategoriesJson,
          invoice_email_template = @invoiceEmailTemplate,
          receipt_email_template = @receiptEmailTemplate,
          payment_instructions = @paymentInstructions,
          updated_at = @updatedAt
      WHERE id = 1
    `,
  ).run({
    fromEmail: next.fromEmail || null,
    ccFinanceEmail: next.ccFinanceEmail || null,
    invoicePrefix: next.invoicePrefix,
    receiptPrefix: next.receiptPrefix,
    expensePrefix: next.expensePrefix,
    subcategoriesJson: JSON.stringify(next.categorySubcategories || {}),
    invoiceEmailTemplate: next.invoiceEmailTemplate,
    receiptEmailTemplate: next.receiptEmailTemplate,
    paymentInstructions: next.paymentInstructions,
    updatedAt: nowIso(),
  });

  appendAudit(actor, "update", "finance_settings", 1, "Updated finance settings");
  return getFinanceSettingsRow(db);
}

export function createFinanceInvoice(input: FinanceInvoiceInput, actor: FinanceActor): FinanceInvoiceRecord {
  ensureFinanceSchema();
  const db = getDb();
  const settings = getFinanceSettingsRow(db);
  const displayCategory = normalizeFinanceIncomeCategory(input.category);
  const baseCategory = mapFinanceIncomeToBaseCategory(displayCategory);
  const lineItems = parseLineItems(input.lineItems);
  const subtotal = normalizeNumber(lineItems.reduce((sum, item) => sum + item.amount, 0));
  const tax = normalizeNumber(Number(input.tax || 0));
  const total = normalizeNumber(subtotal + tax);
  const issueDate = input.issueDate || todayIsoDate();
  const dueDate = input.dueDate || issueDate;

  const tx = db.transaction(() => {
    getInvoiceContact(db, input.contactId);
    const invoiceNumber = nextNumberFor(
      db,
      "finance_invoices",
      "invoice_number",
      settings.invoicePrefix || "ORBF-INV",
      issueDate,
    );
    const insert = db.prepare(
      `
        INSERT INTO finance_invoices (
          invoice_number,
          contact_id,
          category,
          display_category,
          issue_date,
          due_date,
          currency,
          subtotal,
          tax,
          total,
          paid_amount,
          balance_due,
          status,
          notes,
          created_by_user_id,
          created_at,
          updated_at
        ) VALUES (
          @invoiceNumber,
          @contactId,
          @category,
          @displayCategory,
          @issueDate,
          @dueDate,
          @currency,
          @subtotal,
          @tax,
          @total,
          0,
          @total,
          'draft',
          @notes,
          @createdBy,
          @createdAt,
          @updatedAt
        )
      `,
    ).run({
      invoiceNumber,
      contactId: input.contactId,
      category: baseCategory,
      displayCategory,
      issueDate,
      dueDate,
      currency: normalizeCurrency(input.currency),
      subtotal,
      tax,
      total,
      notes: input.notes?.trim() || null,
      createdBy: actor.userId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    const invoiceId = Number(insert.lastInsertRowid);
    const insertItem = db.prepare(
      `
        INSERT INTO finance_invoice_items (
          invoice_id,
          description,
          qty,
          unit_price,
          amount,
          created_at
        ) VALUES (
          @invoiceId,
          @description,
          @qty,
          @unitPrice,
          @amount,
          @createdAt
        )
      `,
    );
    lineItems.forEach((item) => {
      insertItem.run({
        invoiceId,
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        amount: item.amount,
        createdAt: nowIso(),
      });
    });

    appendAudit(
      actor,
      "create",
      "finance_invoices",
      invoiceId,
      `Created invoice ${invoiceNumber} (${displayCategory}, ${normalizeCurrency(input.currency)} ${total})`,
    );
    return invoiceId;
  });

  const invoiceId = tx();
  const row = getInvoiceRowById(db, invoiceId);
  if (!row) {
    throw new Error("Failed to load invoice after creation.");
  }
  return buildInvoiceRecord(db, row);
}

export function updateFinanceInvoiceDraft(
  invoiceId: number,
  updates: Partial<FinanceInvoiceInput>,
  actor: FinanceActor,
) {
  ensureFinanceSchema();
  const db = getDb();
  const current = getInvoiceRowById(db, invoiceId);
  if (!current) {
    throw new Error("Invoice not found.");
  }
  if (current.status !== "draft") {
    throw new Error("Only draft invoices can be edited. Void and recreate if changes are required.");
  }

  const nextLineItems = updates.lineItems ? parseLineItems(updates.lineItems) : parseInvoiceLineItemRows(
    db.prepare(
      `
      SELECT id, description, qty, unit_price AS unitPrice, amount
      FROM finance_invoice_items
      WHERE invoice_id = @invoiceId
      ORDER BY id ASC
    `,
    ).all({ invoiceId }) as Array<{ id: number; description: string; qty: number; unitPrice: number; amount: number }>,
  );

  const subtotal = normalizeNumber(nextLineItems.reduce((sum, item) => sum + item.amount, 0));
  const tax = updates.tax !== undefined ? normalizeNumber(Number(updates.tax || 0)) : normalizeNumber(Number(current.tax));
  const total = normalizeNumber(subtotal + tax);
  const nextDisplayCategory = updates.category
    ? normalizeFinanceIncomeCategory(updates.category)
    : normalizeFinanceIncomeCategory(current.category);
  const nextBaseCategory = mapFinanceIncomeToBaseCategory(nextDisplayCategory);

  const tx = db.transaction(() => {
    db.prepare(
      `
        UPDATE finance_invoices
        SET contact_id = @contactId,
            category = @category,
            display_category = @displayCategory,
            issue_date = @issueDate,
            due_date = @dueDate,
            currency = @currency,
            subtotal = @subtotal,
            tax = @tax,
            total = @total,
            balance_due = @balanceDue,
            notes = @notes,
            updated_at = @updatedAt
        WHERE id = @invoiceId
      `,
    ).run({
      invoiceId,
      contactId: updates.contactId ?? current.contactId,
      category: nextBaseCategory,
      displayCategory: nextDisplayCategory,
      issueDate: updates.issueDate ?? current.issueDate,
      dueDate: updates.dueDate ?? current.dueDate,
      currency: normalizeCurrency(updates.currency ?? current.currency),
      subtotal,
      tax,
      total,
      balanceDue: total,
      notes: updates.notes !== undefined ? updates.notes?.trim() || null : current.notes || null,
      updatedAt: nowIso(),
    });

    if (updates.lineItems) {
      db.prepare("DELETE FROM finance_invoice_items WHERE invoice_id = @invoiceId").run({ invoiceId });
      const insertItem = db.prepare(
        `
          INSERT INTO finance_invoice_items (
            invoice_id,
            description,
            qty,
            unit_price,
            amount,
            created_at
          ) VALUES (
            @invoiceId,
            @description,
            @qty,
            @unitPrice,
            @amount,
            @createdAt
          )
        `,
      );
      nextLineItems.forEach((item) => {
        insertItem.run({
          invoiceId,
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          amount: item.amount,
          createdAt: nowIso(),
        });
      });
    }

    appendAudit(actor, "update", "finance_invoices", invoiceId, `Updated draft invoice ${current.invoiceNumber}`);
  });
  tx();

  const row = getInvoiceRowById(db, invoiceId);
  if (!row) {
    throw new Error("Failed to reload invoice.");
  }
  return buildInvoiceRecord(db, row);
}

export function listFinanceInvoices(filters?: {
  status?: FinanceInvoiceRecord["status"];
  category?: Exclude<FinanceCategory, "Expense">;
  fromDate?: string;
  toDate?: string;
}) {
  ensureFinanceSchema();
  const db = getDb();
  markOverdueInvoices(db);
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (filters?.status) {
    where.push("i.status = @status");
    params.status = filters.status;
  }
  if (filters?.category) {
    try {
      where.push("COALESCE(i.display_category, CASE WHEN i.category = 'Donations' THEN 'Donation' ELSE i.category END) = @category");
      params.category = normalizeFinanceIncomeCategory(filters.category);
    } catch {
      where.push("1 = 0");
    }
  }
  if (filters?.fromDate) {
    where.push("i.issue_date >= @fromDate");
    params.fromDate = filters.fromDate;
  }
  if (filters?.toDate) {
    where.push("i.issue_date <= @toDate");
    params.toDate = filters.toDate;
  }

  const sql = `
    SELECT
      i.id,
      i.invoice_number AS invoiceNumber,
      i.contact_id AS contactId,
      c.name AS contactName,
      c.emails_json AS contactEmailsJson,
      i.category AS baseCategory,
      COALESCE(i.display_category, CASE WHEN i.category = 'Donations' THEN 'Donation' ELSE i.category END) AS category,
      i.issue_date AS issueDate,
      i.due_date AS dueDate,
      i.currency,
      i.subtotal,
      i.tax,
      i.total,
      i.paid_amount AS paidAmount,
      i.balance_due AS balanceDue,
      i.status,
      i.notes,
      i.pdf_stored_path AS pdfStoredPath,
      i.pdf_file_id AS pdfFileId,
      i.emailed_at AS emailedAt,
      i.last_sent_to AS lastSentTo,
      i.void_reason AS voidReason,
      i.created_by_user_id AS createdBy,
      u.full_name AS createdByName,
      i.created_at AS createdAt,
      i.updated_at AS updatedAt
    FROM finance_invoices i
    JOIN finance_contacts c ON c.id = i.contact_id
    JOIN portal_users u ON u.id = i.created_by_user_id
    ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY i.created_at DESC
  `;
  const rows = db.prepare(sql).all(params) as Array<{
    id: number;
    invoiceNumber: string;
    contactId: number;
    contactName: string;
    contactEmailsJson: string;
    baseCategory: FinanceBaseIncomeCategory;
    category: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    subtotal: number;
    tax: number;
    total: number;
    paidAmount: number;
    balanceDue: number;
    status: string;
    notes: string | null;
    pdfStoredPath: string | null;
    pdfFileId: number | null;
    emailedAt: string | null;
    lastSentTo: string | null;
    voidReason: string | null;
    createdBy: number;
    createdByName: string | null;
    createdAt: string;
    updatedAt: string;
  }>;

  return rows.map((row) => buildInvoiceRecord(db, row));
}

export function getFinanceInvoiceById(invoiceId: number) {
  ensureFinanceSchema();
  const db = getDb();
  markOverdueInvoices(db);
  const row = getInvoiceRowById(db, invoiceId);
  if (!row) {
    return null;
  }
  return buildInvoiceRecord(db, row);
}

export function voidFinanceInvoice(invoiceId: number, reason: string, actor: FinanceActor) {
  ensureFinanceSchema();
  const cleanReason = reason?.trim();
  if (!cleanReason) {
    throw new Error("Void reason is required.");
  }
  const db = getDb();
  const row = getInvoiceRowById(db, invoiceId);
  if (!row) {
    throw new Error("Invoice not found.");
  }
  if (row.status === "void") {
    throw new Error("Invoice already void.");
  }

  const tx = db.transaction(() => {
    db.prepare(
      `
        UPDATE finance_invoices
        SET status = 'void',
            void_reason = @reason,
            balance_due = 0,
            updated_at = @updatedAt
        WHERE id = @invoiceId
      `,
    ).run({
      invoiceId,
      reason: cleanReason,
      updatedAt: nowIso(),
    });
    appendAudit(actor, "void", "finance_invoices", invoiceId, `Voided invoice ${row.invoiceNumber}: ${cleanReason}`);
  });
  tx();

  const updated = getInvoiceRowById(db, invoiceId);
  if (!updated) {
    throw new Error("Failed to reload invoice.");
  }
  return buildInvoiceRecord(db, updated);
}

export async function sendFinanceInvoice(
  invoiceId: number,
  actor: FinanceActor,
  options?: { to?: string[]; cc?: string[] },
) {
  ensureFinanceSchema();
  const db = getDb();
  const settings = getFinanceSettingsRow(db);
  const row = getInvoiceRowById(db, invoiceId);
  if (!row) {
    throw new Error("Invoice not found.");
  }
  if (row.status === "void") {
    throw new Error("Cannot send a void invoice.");
  }

  const invoice = buildInvoiceRecord(db, row);
  const contact = getInvoiceContact(db, invoice.contactId);
  const explicitTo = options?.to?.length ? options.to : [];
  let to = sanitizeEmailList(explicitTo.length > 0 ? explicitTo : contact.emails.slice(0, 1));
  if (to.length === 0 && explicitTo.length === 0) {
    to = sanitizeEmailList(contact.emails);
  }
  const cc = sanitizeEmailList([
    ...(options?.cc || []),
    ...(settings.ccFinanceEmail ? [settings.ccFinanceEmail] : []),
    ...REQUIRED_INVOICE_CC,
  ]);

  if (to.length === 0) {
    throw new Error("Invoice contact has no valid email address.");
  }

  const pdf = await awaitInvoicePdf(db, invoice, contact.name, contact.emails, settings.paymentInstructions);
  const htmlBodyRaw = renderTemplate(settings.invoiceEmailTemplate, {
    contactName: contact.name,
    invoiceNumber: invoice.invoiceNumber,
    currency: invoice.currency,
    total: invoice.total.toLocaleString(),
    dueDate: invoice.dueDate,
    paymentInstructions: settings.paymentInstructions || "",
  }).replace(/\n/g, "<br/>") +
    `<br/><br/>${officialContact.address}<br/>${officialContact.postalAddress}<br/>Email: ${officialContact.email}<br/>Phone: ${officialContact.phoneDisplay}`;

  const subject = `Invoice ${invoice.invoiceNumber} • Ozeki Reading Bridge Foundation`;
  const result = await sendFinanceMail({
    to,
    cc,
    subject,
    html: htmlBodyRaw,
    text: htmlBodyRaw.replace(/<br\s*\/?>/g, "\n"),
    attachments: [{ filename: pdf.fileName, path: pdf.storedPath, contentType: "application/pdf" }],
  });

  db.prepare(
    `
      UPDATE finance_invoices
      SET status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
          emailed_at = @emailedAt,
          last_sent_to = @lastSentTo,
          pdf_stored_path = @pdfPath,
          pdf_file_id = @pdfFileId,
          updated_at = @updatedAt
      WHERE id = @invoiceId
    `,
  ).run({
    invoiceId,
    emailedAt: nowIso(),
    lastSentTo: to.join(", "),
    pdfPath: pdf.storedPath,
    pdfFileId: pdf.fileId,
    updatedAt: nowIso(),
  });

  logFinanceEmail(db, {
    recordType: "invoice",
    recordId: invoiceId,
    toEmail: to.join(", "),
    ccEmail: cc.join(", "),
    subject,
    result,
    actor,
  });
  appendAudit(actor, "send", "finance_invoices", invoiceId, `Sent invoice email (${result.status}) to ${to.join(", ")}`);

  refreshInvoiceBalances(db, invoiceId);
  const reloaded = getInvoiceRowById(db, invoiceId);
  if (!reloaded) {
    throw new Error("Failed to reload invoice.");
  }

  return {
    invoice: buildInvoiceRecord(db, reloaded),
    email: result,
  };
}

async function awaitInvoicePdf(
  db: Database.Database,
  invoice: FinanceInvoiceRecord,
  contactName: string,
  contactEmails: string[],
  paymentInstructions: string,
) {
  const pdf = await generateInvoicePdfFile({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    category: invoice.category,
    contactName,
    contactEmails,
    lineItems: invoice.lineItems,
    subtotal: invoice.subtotal,
    tax: invoice.tax || 0,
    total: invoice.total,
    notes: invoice.notes,
    paymentInstructions,
  });
  const file = createFinanceFileRecordInternal(db, {
    sourceType: "invoice_pdf",
    sourceId: invoice.id,
    fileName: pdf.fileName,
    storedPath: pdf.storedPath,
    mimeType: "application/pdf",
    sizeBytes: 0,
    uploadedBy: invoice.createdBy,
  });
  return { ...pdf, fileId: file.id };
}

export async function recordFinancePayment(
  input: FinancePaymentInput,
  actor: FinanceActor,
  evidenceFileIds?: number[],
) {
  ensureFinanceSchema();
  const db = getDb();
  const invoiceRow = getInvoiceRowById(db, input.relatedInvoiceId);
  if (!invoiceRow) {
    throw new Error("Invoice not found.");
  }
  if (invoiceRow.status === "void") {
    throw new Error("Cannot record payment on a void invoice.");
  }

  const tx = db.transaction(() => {
    const insert = db.prepare(
      `
        INSERT INTO finance_payments (
          related_invoice_id,
          date,
          amount,
          currency,
          method,
          reference,
          notes,
          status,
          created_by_user_id,
          created_at
        ) VALUES (
          @relatedInvoiceId,
          @date,
          @amount,
          @currency,
          @method,
          @reference,
          @notes,
          'posted',
          @createdBy,
          @createdAt
        )
      `,
    ).run({
      relatedInvoiceId: input.relatedInvoiceId,
      date: input.date || todayIsoDate(),
      amount: normalizeNumber(input.amount),
      currency: normalizeCurrency(invoiceRow.currency),
      method: input.method,
      reference: input.reference?.trim() || null,
      notes: input.notes?.trim() || null,
      createdBy: actor.userId,
      createdAt: nowIso(),
    });
    const paymentId = Number(insert.lastInsertRowid);

    createLedgerEntry(db, {
      txnType: "money_in",
      category: invoiceRow.baseCategory,
      displayCategory: normalizeFinanceIncomeCategory(invoiceRow.category),
      date: input.date || todayIsoDate(),
      currency: normalizeCurrency(invoiceRow.currency),
      amount: normalizeNumber(input.amount),
      counterpartyContactId: invoiceRow.contactId,
      sourceType: "invoice_payment",
      sourceId: paymentId,
      notes: input.notes,
      evidenceFileIds: evidenceFileIds || [],
      postedStatus: "posted",
      actor,
    });

    refreshInvoiceBalances(db, input.relatedInvoiceId);
    appendAudit(actor, "post_payment", "finance_payments", paymentId, `Recorded payment for invoice ${invoiceRow.invoiceNumber}`);
    return paymentId;
  });

  const paymentId = tx();
  const payment = getFinancePaymentById(paymentId);
  if (!payment) {
    throw new Error("Failed to load payment.");
  }

  let updatedInvoiceRow = getInvoiceRowById(db, input.relatedInvoiceId);
  if (!updatedInvoiceRow) {
    throw new Error("Failed to reload invoice.");
  }

  let autoReceipt: FinanceReceiptRecord | null = null;
  if (updatedInvoiceRow.status === "paid") {
    autoReceipt = await ensureLinkedReceiptForPaidInvoice(db, updatedInvoiceRow, input, actor);
    const refreshedInvoice = getInvoiceRowById(db, input.relatedInvoiceId);
    if (refreshedInvoice) {
      updatedInvoiceRow = refreshedInvoice;
    }
  }

  return {
    payment,
    invoice: buildInvoiceRecord(db, updatedInvoiceRow),
    autoReceipt,
  };
}

export function voidFinancePayment(paymentId: number, reason: string, actor: FinanceActor) {
  ensureFinanceSchema();
  if (!reason?.trim()) {
    throw new Error("Void reason is required.");
  }

  const db = getDb();
  const row = db.prepare(
    `
      SELECT id, related_invoice_id AS relatedInvoiceId, status
      FROM finance_payments
      WHERE id = @id
      LIMIT 1
    `,
  ).get({ id: paymentId }) as
    | { id: number; relatedInvoiceId: number; status: FinancePostedStatus }
    | undefined;
  if (!row) {
    throw new Error("Payment not found.");
  }
  if (row.status === "void") {
    throw new Error("Payment is already void.");
  }

  const tx = db.transaction(() => {
    db.prepare(
      `
        UPDATE finance_payments
        SET status = 'void',
            void_reason = @reason
        WHERE id = @id
      `,
    ).run({ id: paymentId, reason: reason.trim() });
    voidLedgerEntriesForSource(db, "invoice_payment", paymentId, reason.trim(), actor);
    refreshInvoiceBalances(db, row.relatedInvoiceId);
    appendAudit(actor, "void_payment", "finance_payments", paymentId, `Voided payment: ${reason.trim()}`);
  });
  tx();
  return getFinancePaymentById(paymentId);
}

export function getFinancePaymentById(paymentId: number): FinancePaymentRecord | null {
  ensureFinanceSchema();
  const row = getDb().prepare(
    `
      SELECT
        p.id,
        p.related_invoice_id AS relatedInvoiceId,
        p.date,
        p.amount,
        p.currency,
        p.method,
        p.reference,
        p.notes,
        p.status,
        p.void_reason AS voidReason,
        p.created_by_user_id AS createdBy,
        u.full_name AS createdByName,
        p.created_at AS createdAt
      FROM finance_payments p
      JOIN portal_users u ON u.id = p.created_by_user_id
      WHERE p.id = @paymentId
      LIMIT 1
    `,
  ).get({ paymentId }) as
    | {
      id: number;
      relatedInvoiceId: number;
      date: string;
      amount: number;
      currency: string;
      method: string;
      reference: string | null;
      notes: string | null;
      status: string;
      voidReason: string | null;
      createdBy: number;
      createdByName: string | null;
      createdAt: string;
    }
    | undefined;
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    relatedInvoiceId: row.relatedInvoiceId,
    date: row.date,
    amount: normalizeNumber(row.amount),
    currency: normalizeCurrency(row.currency),
    method: row.method as FinancePaymentRecord["method"],
    reference: row.reference || undefined,
    notes: row.notes || undefined,
    status: row.status as FinancePostedStatus,
    voidReason: row.voidReason || undefined,
    createdBy: row.createdBy,
    createdByName: row.createdByName || undefined,
    createdAt: row.createdAt,
  };
}

export function listFinancePayments(filters?: { invoiceId?: number; status?: FinancePostedStatus }) {
  ensureFinanceSchema();
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (filters?.invoiceId) {
    where.push("p.related_invoice_id = @invoiceId");
    params.invoiceId = filters.invoiceId;
  }
  if (filters?.status) {
    where.push("p.status = @status");
    params.status = filters.status;
  }
  const rows = getDb().prepare(
    `
      SELECT
        p.id,
        p.related_invoice_id AS relatedInvoiceId,
        p.date,
        p.amount,
        p.currency,
        p.method,
        p.reference,
        p.notes,
        p.status,
        p.void_reason AS voidReason,
        p.created_by_user_id AS createdBy,
        u.full_name AS createdByName,
        p.created_at AS createdAt
      FROM finance_payments p
      JOIN portal_users u ON u.id = p.created_by_user_id
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY p.created_at DESC
    `,
  ).all(params) as Array<{
    id: number;
    relatedInvoiceId: number;
    date: string;
    amount: number;
    currency: string;
    method: string;
    reference: string | null;
    notes: string | null;
    status: string;
    voidReason: string | null;
    createdBy: number;
    createdByName: string | null;
    createdAt: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    relatedInvoiceId: row.relatedInvoiceId,
    date: row.date,
    amount: normalizeNumber(row.amount),
    currency: normalizeCurrency(row.currency),
    method: row.method as FinancePaymentRecord["method"],
    reference: row.reference || undefined,
    notes: row.notes || undefined,
    status: row.status as FinancePostedStatus,
    voidReason: row.voidReason || undefined,
    createdBy: row.createdBy,
    createdByName: row.createdByName || undefined,
    createdAt: row.createdAt,
  }));
}

export function createFinanceReceipt(input: FinanceReceiptInput, actor: FinanceActor): FinanceReceiptRecord {
  ensureFinanceSchema();
  const db = getDb();
  const settings = getFinanceSettingsRow(db);
  getInvoiceContact(db, input.contactId);
  const displayCategory = normalizeFinanceIncomeCategory(input.category);
  const baseCategory = mapFinanceIncomeToBaseCategory(displayCategory);

  const receiptDate = input.receiptDate || todayIsoDate();
  const receiptNumber = nextNumberFor(
    db,
    "finance_receipts",
    "receipt_number",
    settings.receiptPrefix || "ORBF-RCT",
    receiptDate,
  );

  const result = db.prepare(
    `
      INSERT INTO finance_receipts (
        receipt_number,
        contact_id,
        category,
        display_category,
        received_from,
        receipt_date,
        currency,
        amount_received,
        payment_method,
        reference_no,
        related_invoice_id,
        description,
        notes,
        status,
        created_by_user_id,
        created_at
      ) VALUES (
        @receiptNumber,
        @contactId,
        @category,
        @displayCategory,
        @receivedFrom,
        @receiptDate,
        @currency,
        @amountReceived,
        @paymentMethod,
        @referenceNo,
        @relatedInvoiceId,
        @description,
        @notes,
        'draft',
        @createdBy,
        @createdAt
      )
    `,
  ).run({
    receiptNumber,
    contactId: input.contactId,
    category: baseCategory,
    displayCategory,
    receivedFrom: input.receivedFrom.trim(),
    receiptDate,
    currency: normalizeCurrency(input.currency),
    amountReceived: normalizeNumber(input.amountReceived),
    paymentMethod: input.paymentMethod,
    referenceNo: input.referenceNo?.trim() || null,
    relatedInvoiceId: input.relatedInvoiceId ?? null,
    description: input.description?.trim() || null,
    notes: input.notes?.trim() || null,
    createdBy: actor.userId,
    createdAt: nowIso(),
  });

  const receiptId = Number(result.lastInsertRowid);
  appendAudit(actor, "create", "finance_receipts", receiptId, `Created receipt ${receiptNumber}`);
  const row = getReceiptRowById(db, receiptId);
  if (!row) {
    throw new Error("Failed to load receipt.");
  }
  return buildReceiptRecord(row);
}

export function listFinanceReceipts(filters?: {
  status?: FinanceReceiptRecord["status"];
  category?: Exclude<FinanceCategory, "Expense">;
  fromDate?: string;
  toDate?: string;
}) {
  ensureFinanceSchema();
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (filters?.status) {
    where.push("r.status = @status");
    params.status = filters.status;
  }
  if (filters?.category) {
    try {
      where.push("COALESCE(r.display_category, CASE WHEN r.category = 'Donations' THEN 'Donation' ELSE r.category END) = @category");
      params.category = normalizeFinanceIncomeCategory(filters.category);
    } catch {
      where.push("1 = 0");
    }
  }
  if (filters?.fromDate) {
    where.push("r.receipt_date >= @fromDate");
    params.fromDate = filters.fromDate;
  }
  if (filters?.toDate) {
    where.push("r.receipt_date <= @toDate");
    params.toDate = filters.toDate;
  }
  const rows = getDb().prepare(
    `
      SELECT
        r.id,
        r.receipt_number AS receiptNumber,
        r.contact_id AS contactId,
        r.category AS baseCategory,
        COALESCE(r.display_category, CASE WHEN r.category = 'Donations' THEN 'Donation' ELSE r.category END) AS category,
        r.received_from AS receivedFrom,
        r.receipt_date AS receiptDate,
        r.currency,
        r.amount_received AS amountReceived,
        r.payment_method AS paymentMethod,
        r.reference_no AS referenceNo,
        r.related_invoice_id AS relatedInvoiceId,
        r.description,
        r.notes,
        r.status,
        r.pdf_stored_path AS pdfStoredPath,
        r.pdf_file_id AS pdfFileId,
        r.emailed_at AS emailedAt,
        r.last_sent_to AS lastSentTo,
        r.void_reason AS voidReason,
        r.created_by_user_id AS createdBy,
        u.full_name AS createdByName,
        r.created_at AS createdAt
      FROM finance_receipts r
      JOIN portal_users u ON u.id = r.created_by_user_id
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY r.created_at DESC
    `,
  ).all(params) as Array<{
    id: number;
    receiptNumber: string;
    contactId: number;
    baseCategory: FinanceBaseIncomeCategory;
    category: string;
    receivedFrom: string;
    receiptDate: string;
    currency: string;
    amountReceived: number;
    paymentMethod: string;
    referenceNo: string | null;
    relatedInvoiceId: number | null;
    description: string | null;
    notes: string | null;
    status: string;
    pdfStoredPath: string | null;
    pdfFileId: number | null;
    emailedAt: string | null;
    lastSentTo: string | null;
    voidReason: string | null;
    createdBy: number;
    createdByName: string | null;
    createdAt: string;
  }>;
  return rows.map(buildReceiptRecord);
}

async function ensureReceiptPdfArtifact(
  db: Database.Database,
  receiptRow: ReceiptRow,
  uploadedBy: number,
) {
  if (receiptRow.pdfFileId && receiptRow.pdfStoredPath) {
    return {
      row: receiptRow,
      pdf: {
        fileId: receiptRow.pdfFileId,
        storedPath: receiptRow.pdfStoredPath,
        fileName: path.basename(receiptRow.pdfStoredPath),
      },
    };
  }

  const relatedInvoice = receiptRow.relatedInvoiceId ? getInvoiceRowById(db, receiptRow.relatedInvoiceId) : undefined;
  const pdf = await generateReceiptPdfFile({
    receiptNumber: receiptRow.receiptNumber,
    receiptDate: receiptRow.receiptDate,
    currency: normalizeCurrency(receiptRow.currency),
    category: normalizeFinanceIncomeCategory(receiptRow.category),
    receivedFrom: receiptRow.receivedFrom,
    amount: normalizeNumber(receiptRow.amountReceived),
    paymentMethod: receiptRow.paymentMethod,
    referenceNo: receiptRow.referenceNo || undefined,
    relatedInvoiceNumber: relatedInvoice?.invoiceNumber,
    description: receiptRow.description || undefined,
  });

  const file = createFinanceFileRecordInternal(db, {
    sourceType: "receipt_pdf",
    sourceId: receiptRow.id,
    fileName: pdf.fileName,
    storedPath: pdf.storedPath,
    mimeType: "application/pdf",
    sizeBytes: 0,
    uploadedBy,
  });

  db.prepare(
    `
      UPDATE finance_receipts
      SET pdf_stored_path = @pdfPath,
          pdf_file_id = @pdfFileId
      WHERE id = @receiptId
    `,
  ).run({
    receiptId: receiptRow.id,
    pdfPath: pdf.storedPath,
    pdfFileId: file.id,
  });

  const refreshed = getReceiptRowById(db, receiptRow.id);
  if (!refreshed) {
    throw new Error("Failed to reload receipt PDF.");
  }
  return {
    row: refreshed,
    pdf: {
      fileId: file.id,
      storedPath: pdf.storedPath,
      fileName: pdf.fileName,
    },
  };
}

async function ensureLinkedReceiptForPaidInvoice(
  db: Database.Database,
  invoiceRow: InvoiceRow,
  payment: FinancePaymentInput,
  actor: FinanceActor,
) {
  const existing = db.prepare(
    `
      SELECT id
      FROM finance_receipts
      WHERE related_invoice_id = @invoiceId
        AND status != 'void'
      ORDER BY CASE WHEN status = 'issued' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 1
    `,
  ).get({ invoiceId: invoiceRow.id }) as { id: number } | undefined;

  let targetRow: ReceiptRow | undefined;
  if (existing) {
    targetRow = getReceiptRowById(db, existing.id);
  } else {
    const contact = getInvoiceContact(db, invoiceRow.contactId);
    const created = createFinanceReceipt(
      {
        contactId: invoiceRow.contactId,
        category: normalizeFinanceIncomeCategory(invoiceRow.category),
        receivedFrom: contact.name,
        receiptDate: payment.date || todayIsoDate(),
        currency: normalizeCurrency(invoiceRow.currency),
        amountReceived: normalizeNumber(invoiceRow.total),
        paymentMethod: payment.method,
        referenceNo: payment.reference,
        relatedInvoiceId: invoiceRow.id,
        notes: payment.notes || `Auto-generated when invoice ${invoiceRow.invoiceNumber} was paid in full.`,
      },
      actor,
    );
    targetRow = getReceiptRowById(db, created.id);
  }

  if (!targetRow) {
    return null;
  }
  const ensured = await ensureReceiptPdfArtifact(db, targetRow, actor.userId);
  return buildReceiptRecord(ensured.row);
}

export async function issueFinanceReceipt(
  receiptId: number,
  actor: FinanceActor,
  options?: { sendEmail?: boolean; to?: string[]; cc?: string[]; ensurePdf?: boolean },
) {
  ensureFinanceSchema();
  const db = getDb();
  const row = getReceiptRowById(db, receiptId);
  if (!row) {
    throw new Error("Receipt not found.");
  }
  if (row.status === "void") {
    throw new Error("Cannot issue a void receipt.");
  }
  if (row.status === "issued") {
    const existingIssued = options?.ensurePdf ? (await ensureReceiptPdfArtifact(db, row, actor.userId)).row : row;
    return {
      receipt: buildReceiptRecord(existingIssued),
      email: null as FinanceEmailResult | null,
    };
  }

  const tx = db.transaction(() => {
    db.prepare(
      `
        UPDATE finance_receipts
        SET status = 'issued'
        WHERE id = @receiptId
      `,
    ).run({ receiptId });

    createLedgerEntry(db, {
      txnType: "money_in",
      category: row.baseCategory,
      displayCategory: normalizeFinanceIncomeCategory(row.category),
      date: row.receiptDate,
      currency: normalizeCurrency(row.currency),
      amount: normalizeNumber(row.amountReceived),
      counterpartyContactId: row.contactId,
      sourceType: "receipt",
      sourceId: receiptId,
      notes: row.notes || undefined,
      postedStatus: "posted",
      actor,
    });

    if (row.relatedInvoiceId) {
      refreshInvoiceBalances(db, row.relatedInvoiceId);
    }

    appendAudit(actor, "issue", "finance_receipts", receiptId, `Issued receipt ${row.receiptNumber}`);
  });
  tx();

  let updatedRow = getReceiptRowById(db, receiptId);
  if (!updatedRow) {
    throw new Error("Failed to reload issued receipt.");
  }
  if (options?.ensurePdf) {
    updatedRow = (await ensureReceiptPdfArtifact(db, updatedRow, actor.userId)).row;
  }

  let emailResult: FinanceEmailResult | null = null;
  if (options?.sendEmail !== false) {
    const sent = await sendFinanceReceipt(receiptId, actor, {
      to: options?.to,
      cc: options?.cc,
    });
    emailResult = sent.email;
  }

  return {
    receipt: buildReceiptRecord(updatedRow),
    email: emailResult,
  };
}

export async function sendFinanceReceipt(
  receiptId: number,
  actor: FinanceActor,
  options?: { to?: string[]; cc?: string[] },
) {
  ensureFinanceSchema();
  const db = getDb();
  const settings = getFinanceSettingsRow(db);
  const row = getReceiptRowById(db, receiptId);
  if (!row) {
    throw new Error("Receipt not found.");
  }
  if (row.status === "void") {
    throw new Error("Cannot send a void receipt.");
  }
  const contact = getInvoiceContact(db, row.contactId);
  const to = sanitizeEmailList(options?.to?.length ? options.to : contact.emails);
  if (to.length === 0) {
    throw new Error("Receipt contact has no valid email address.");
  }
  const cc = sanitizeEmailList([
    ...(options?.cc || []),
    ...(settings.ccFinanceEmail ? [settings.ccFinanceEmail] : []),
  ]);

  const artifact = await ensureReceiptPdfArtifact(db, row, actor.userId);

  const subject = `Receipt ${artifact.row.receiptNumber} • Ozeki Reading Bridge Foundation`;
  const description = (artifact.row.description || "").trim();
  const hasDescriptionToken = /\{\{\s*(description|descriptionLine)\s*\}\}/.test(settings.receiptEmailTemplate);
  let renderedTemplate = renderTemplate(settings.receiptEmailTemplate, {
    contactName: contact.name,
    receiptNumber: artifact.row.receiptNumber,
    currency: normalizeCurrency(artifact.row.currency),
    amount: normalizeNumber(artifact.row.amountReceived).toLocaleString(),
    receiptDate: artifact.row.receiptDate,
    description,
    descriptionLine: description ? `Description: ${description}` : "",
  });
  if (description && !hasDescriptionToken) {
    renderedTemplate += `\nDescription: ${description}`;
  }
  const htmlBodyRaw = renderedTemplate.replace(/\n/g, "<br/>") +
    `<br/><br/>${officialContact.address}<br/>${officialContact.postalAddress}<br/>Email: ${officialContact.email}<br/>Phone: ${officialContact.phoneDisplay}`;

  const result = await sendFinanceMail({
    to,
    cc,
    subject,
    html: htmlBodyRaw,
    text: htmlBodyRaw.replace(/<br\s*\/?>/g, "\n"),
    attachments: [{
      filename: artifact.pdf.fileName,
      path: artifact.pdf.storedPath,
      contentType: "application/pdf",
    }],
  });

  db.prepare(
    `
      UPDATE finance_receipts
      SET emailed_at = @emailedAt,
          last_sent_to = @lastSentTo,
          pdf_stored_path = @pdfPath,
          pdf_file_id = @pdfFileId
      WHERE id = @receiptId
    `,
  ).run({
    receiptId,
    emailedAt: nowIso(),
    lastSentTo: to.join(", "),
    pdfPath: artifact.pdf.storedPath,
    pdfFileId: artifact.pdf.fileId,
  });

  logFinanceEmail(db, {
    recordType: "receipt",
    recordId: receiptId,
    toEmail: to.join(", "),
    ccEmail: cc.join(", "),
    subject,
    result,
    actor,
  });
  appendAudit(actor, "send", "finance_receipts", receiptId, `Sent receipt email (${result.status}) to ${to.join(", ")}`);

  const refreshed = getReceiptRowById(db, receiptId);
  if (!refreshed) {
    throw new Error("Failed to reload receipt.");
  }
  return { receipt: buildReceiptRecord(refreshed), email: result };
}

export function voidFinanceReceipt(receiptId: number, reason: string, actor: FinanceActor) {
  ensureFinanceSchema();
  const cleanReason = reason?.trim();
  if (!cleanReason) {
    throw new Error("Void reason is required.");
  }
  const db = getDb();
  const row = getReceiptRowById(db, receiptId);
  if (!row) {
    throw new Error("Receipt not found.");
  }
  if (row.status === "void") {
    throw new Error("Receipt already void.");
  }

  const tx = db.transaction(() => {
    db.prepare(
      `
        UPDATE finance_receipts
        SET status = 'void',
            void_reason = @reason
        WHERE id = @receiptId
      `,
    ).run({ receiptId, reason: cleanReason });

    voidLedgerEntriesForSource(db, "receipt", receiptId, cleanReason, actor);
    if (row.relatedInvoiceId) {
      refreshInvoiceBalances(db, row.relatedInvoiceId);
    }
    appendAudit(actor, "void", "finance_receipts", receiptId, `Voided receipt: ${cleanReason}`);
  });
  tx();

  const updated = getReceiptRowById(db, receiptId);
  if (!updated) {
    throw new Error("Failed to reload receipt.");
  }
  return buildReceiptRecord(updated);
}

export function createFinanceExpense(input: FinanceExpenseInput, actor: FinanceActor) {
  ensureFinanceSchema();
  const db = getDb();
  const settings = getFinanceSettingsRow(db);
  const expenseNumber = nextNumberFor(
    db,
    "finance_expenses",
    "expense_number",
    settings.expensePrefix || "ORBF-EXP",
    input.date || todayIsoDate(),
  );
  const result = db.prepare(
    `
      INSERT INTO finance_expenses (
        expense_number,
        vendor_name,
        date,
        category,
        subcategory,
        amount,
        currency,
        payment_method,
        description,
        notes,
        status,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        @expenseNumber,
        @vendorName,
        @date,
        'Expense',
        @subcategory,
        @amount,
        @currency,
        @paymentMethod,
        @description,
        @notes,
        'draft',
        @createdBy,
        @createdAt,
        @updatedAt
      )
    `,
  ).run({
    expenseNumber,
    vendorName: input.vendorName.trim(),
    date: input.date || todayIsoDate(),
    subcategory: input.subcategory?.trim() || null,
    amount: normalizeNumber(Number(input.amount)),
    currency: normalizeCurrency(input.currency),
    paymentMethod: input.paymentMethod,
    description: input.description.trim(),
    notes: input.notes?.trim() || null,
    createdBy: actor.userId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  const expenseId = Number(result.lastInsertRowid);
  appendAudit(actor, "create", "finance_expenses", expenseId, `Created expense ${expenseNumber}`);
  const row = getFinanceExpenseById(expenseId);
  if (!row) {
    throw new Error("Failed to load expense.");
  }
  return row;
}

export function postFinanceExpense(expenseId: number, actor: FinanceActor) {
  ensureFinanceSchema();
  const db = getDb();
  const row = db.prepare(
    `
      SELECT
        e.id,
        e.expense_number AS expenseNumber,
        e.vendor_name AS vendorName,
        e.date,
        e.subcategory,
        e.amount,
        e.currency,
        e.payment_method AS paymentMethod,
        e.description,
        e.notes,
        e.status,
        e.void_reason AS voidReason,
        e.created_by_user_id AS createdBy,
        u.full_name AS createdByName,
        e.created_at AS createdAt
      FROM finance_expenses e
      JOIN portal_users u ON u.id = e.created_by_user_id
      WHERE e.id = @expenseId
      LIMIT 1
    `,
  ).get({ expenseId }) as
    | {
      id: number;
      expenseNumber: string;
      vendorName: string;
      date: string;
      subcategory: string | null;
      amount: number;
      currency: string;
      paymentMethod: string;
      description: string;
      notes: string | null;
      status: string;
      voidReason: string | null;
      createdBy: number;
      createdByName: string | null;
      createdAt: string;
    }
    | undefined;
  if (!row) {
    throw new Error("Expense not found.");
  }
  if (row.status === "void") {
    throw new Error("Cannot post a void expense.");
  }
  if (row.status === "posted") {
    return buildExpenseRecord(row);
  }

  const fileCount = db.prepare(
    `
      SELECT COUNT(*) AS count
      FROM finance_files
      WHERE source_type = 'expense'
        AND source_id = @expenseId
    `,
  ).get({ expenseId }) as { count: number } | undefined;
  if (!fileCount || Number(fileCount.count) <= 0) {
    throw new Error("Receipt evidence upload is required before posting an expense.");
  }

  const fileRows = db.prepare(
    `
      SELECT id
      FROM finance_files
      WHERE source_type = 'expense'
        AND source_id = @expenseId
      ORDER BY id ASC
    `,
  ).all({ expenseId }) as Array<{ id: number }>;

  const tx = db.transaction(() => {
    db.prepare(
      `
        UPDATE finance_expenses
        SET status = 'posted',
            updated_at = @updatedAt
        WHERE id = @expenseId
      `,
    ).run({ expenseId, updatedAt: nowIso() });

    createLedgerEntry(db, {
      txnType: "money_out",
      category: "Expense",
      subcategory: row.subcategory || undefined,
      date: row.date,
      currency: normalizeCurrency(row.currency),
      amount: normalizeNumber(row.amount),
      sourceType: "expense",
      sourceId: expenseId,
      notes: row.notes || row.description || undefined,
      evidenceFileIds: fileRows.map((item) => item.id),
      postedStatus: "posted",
      actor,
    });

    appendAudit(actor, "post", "finance_expenses", expenseId, `Posted expense ${row.expenseNumber}`);
  });
  tx();

  const updated = getFinanceExpenseById(expenseId);
  if (!updated) {
    throw new Error("Failed to reload expense.");
  }
  return updated;
}

export function voidFinanceExpense(expenseId: number, reason: string, actor: FinanceActor) {
  ensureFinanceSchema();
  const cleanReason = reason?.trim();
  if (!cleanReason) {
    throw new Error("Void reason is required.");
  }
  const db = getDb();
  const current = getFinanceExpenseById(expenseId);
  if (!current) {
    throw new Error("Expense not found.");
  }
  if (current.status === "void") {
    throw new Error("Expense already void.");
  }

  const tx = db.transaction(() => {
    db.prepare(
      `
        UPDATE finance_expenses
        SET status = 'void',
            void_reason = @reason,
            updated_at = @updatedAt
        WHERE id = @expenseId
      `,
    ).run({ expenseId, reason: cleanReason, updatedAt: nowIso() });
    voidLedgerEntriesForSource(db, "expense", expenseId, cleanReason, actor);
    appendAudit(actor, "void", "finance_expenses", expenseId, `Voided expense: ${cleanReason}`);
  });
  tx();

  const updated = getFinanceExpenseById(expenseId);
  if (!updated) {
    throw new Error("Failed to reload expense.");
  }
  return updated;
}

export function getFinanceExpenseById(expenseId: number): FinanceExpenseRecord | null {
  ensureFinanceSchema();
  const row = getDb().prepare(
    `
      SELECT
        e.id,
        e.expense_number AS expenseNumber,
        e.vendor_name AS vendorName,
        e.date,
        e.subcategory,
        e.amount,
        e.currency,
        e.payment_method AS paymentMethod,
        e.description,
        e.notes,
        e.status,
        e.void_reason AS voidReason,
        e.created_by_user_id AS createdBy,
        u.full_name AS createdByName,
        e.created_at AS createdAt
      FROM finance_expenses e
      JOIN portal_users u ON u.id = e.created_by_user_id
      WHERE e.id = @expenseId
      LIMIT 1
    `,
  ).get({ expenseId }) as
    | {
      id: number;
      expenseNumber: string;
      vendorName: string;
      date: string;
      subcategory: string | null;
      amount: number;
      currency: string;
      paymentMethod: string;
      description: string;
      notes: string | null;
      status: string;
      voidReason: string | null;
      createdBy: number;
      createdByName: string | null;
      createdAt: string;
    }
    | undefined;
  if (!row) {
    return null;
  }
  return buildExpenseRecord(row);
}

export function listFinanceExpenses(filters?: {
  status?: FinancePostedStatus;
  fromDate?: string;
  toDate?: string;
  subcategory?: string;
}) {
  ensureFinanceSchema();
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (filters?.status) {
    where.push("e.status = @status");
    params.status = filters.status;
  }
  if (filters?.subcategory) {
    where.push("e.subcategory = @subcategory");
    params.subcategory = filters.subcategory;
  }
  if (filters?.fromDate) {
    where.push("e.date >= @fromDate");
    params.fromDate = filters.fromDate;
  }
  if (filters?.toDate) {
    where.push("e.date <= @toDate");
    params.toDate = filters.toDate;
  }
  const rows = getDb().prepare(
    `
      SELECT
        e.id,
        e.expense_number AS expenseNumber,
        e.vendor_name AS vendorName,
        e.date,
        e.subcategory,
        e.amount,
        e.currency,
        e.payment_method AS paymentMethod,
        e.description,
        e.notes,
        e.status,
        e.void_reason AS voidReason,
        e.created_by_user_id AS createdBy,
        u.full_name AS createdByName,
        e.created_at AS createdAt
      FROM finance_expenses e
      JOIN portal_users u ON u.id = e.created_by_user_id
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY e.created_at DESC
    `,
  ).all(params) as Array<{
    id: number;
    expenseNumber: string;
    vendorName: string;
    date: string;
    subcategory: string | null;
    amount: number;
    currency: string;
    paymentMethod: string;
    description: string;
    notes: string | null;
    status: string;
    voidReason: string | null;
    createdBy: number;
    createdByName: string | null;
    createdAt: string;
  }>;
  return rows.map(buildExpenseRecord);
}

export async function createFinanceFileRecord(
  input: {
    sourceType: FinanceFileRecord["sourceType"];
    sourceId: number;
    fileName: string;
    bytes: Buffer;
    mimeType: string;
  },
  actor: FinanceActor,
) {
  ensureFinanceSchema();
  const folder = path.join(process.cwd(), "data", "finance", "uploads", input.sourceType);
  await fs.mkdir(folder, { recursive: true });
  const ext = path.extname(input.fileName || "").toLowerCase();
  const safeName = path.basename(input.fileName || "file", ext).replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80);
  const storedName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName || "file"}${ext}`;
  const storedPath = path.join(folder, storedName);
  await fs.writeFile(storedPath, input.bytes);
  const record = createFinanceFileRecordInternal(getDb(), {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    fileName: input.fileName || storedName,
    storedPath,
    mimeType: input.mimeType || "application/octet-stream",
    sizeBytes: input.bytes.byteLength,
    uploadedBy: actor.userId,
  });
  appendAudit(actor, "upload", "finance_files", record.id, `Uploaded file ${record.fileName} (${record.sourceType})`);
  return record;
}

function createFinanceFileRecordInternal(
  db: Database.Database,
  input: {
    sourceType: FinanceFileRecord["sourceType"];
    sourceId: number;
    fileName: string;
    storedPath: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: number;
  },
) {
  const result = db.prepare(
    `
      INSERT INTO finance_files (
        source_type,
        source_id,
        file_name,
        stored_path,
        mime_type,
        size_bytes,
        uploaded_by_user_id,
        created_at
      ) VALUES (
        @sourceType,
        @sourceId,
        @fileName,
        @storedPath,
        @mimeType,
        @sizeBytes,
        @uploadedBy,
        @createdAt
      )
    `,
  ).run({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    fileName: input.fileName,
    storedPath: input.storedPath,
    mimeType: input.mimeType,
    sizeBytes: Number(input.sizeBytes || 0),
    uploadedBy: input.uploadedBy,
    createdAt: nowIso(),
  });
  return getFinanceFileById(Number(result.lastInsertRowid));
}

export function getFinanceFileById(fileId: number): FinanceFileRecord {
  ensureFinanceSchema();
  const row = getDb().prepare(
    `
      SELECT
        id,
        source_type AS sourceType,
        source_id AS sourceId,
        file_name AS fileName,
        stored_path AS storedPath,
        mime_type AS mimeType,
        size_bytes AS sizeBytes,
        uploaded_by_user_id AS uploadedBy,
        created_at AS createdAt
      FROM finance_files
      WHERE id = @id
      LIMIT 1
    `,
  ).get({ id: fileId }) as
    | {
      id: number;
      sourceType: FinanceFileRecord["sourceType"];
      sourceId: number;
      fileName: string;
      storedPath: string;
      mimeType: string;
      sizeBytes: number;
      uploadedBy: number;
      createdAt: string;
    }
    | undefined;

  if (!row) {
    throw new Error("File not found.");
  }
  return {
    id: row.id,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    fileName: row.fileName,
    storedPath: row.storedPath,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
    signedUrl: getSignedFinanceFileUrl(row.id),
  };
}

export function listFinanceFilesBySource(sourceType: string, sourceId: number) {
  ensureFinanceSchema();
  const rows = getDb().prepare(
    `
      SELECT
        id,
        source_type AS sourceType,
        source_id AS sourceId,
        file_name AS fileName,
        stored_path AS storedPath,
        mime_type AS mimeType,
        size_bytes AS sizeBytes,
        uploaded_by_user_id AS uploadedBy,
        created_at AS createdAt
      FROM finance_files
      WHERE source_type = @sourceType
        AND source_id = @sourceId
      ORDER BY id DESC
    `,
  ).all({ sourceType, sourceId }) as Array<{
    id: number;
    sourceType: FinanceFileRecord["sourceType"];
    sourceId: number;
    fileName: string;
    storedPath: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: number;
    createdAt: string;
  }>;
  return rows.map((row) => ({
    ...row,
    signedUrl: getSignedFinanceFileUrl(row.id),
  }));
}

export function listFinanceLedgerTransactions(filters?: {
  txnType?: "money_in" | "money_out";
  category?: FinanceCategory;
  postedStatus?: FinancePostedStatus;
  fromDate?: string;
  toDate?: string;
}) {
  ensureFinanceSchema();
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (filters?.txnType) {
    where.push("l.txn_type = @txnType");
    params.txnType = filters.txnType;
  }
  if (filters?.category) {
    where.push("COALESCE(l.display_category, CASE WHEN l.category = 'Donations' THEN 'Donation' ELSE l.category END) = @category");
    params.category = filters.category;
  }
  if (filters?.postedStatus) {
    where.push("l.posted_status = @postedStatus");
    params.postedStatus = filters.postedStatus;
  }
  if (filters?.fromDate) {
    where.push("l.date >= @fromDate");
    params.fromDate = filters.fromDate;
  }
  if (filters?.toDate) {
    where.push("l.date <= @toDate");
    params.toDate = filters.toDate;
  }
  const rows = getDb().prepare(
    `
      SELECT
        l.id,
        l.txn_type AS txnType,
        COALESCE(l.display_category, CASE WHEN l.category = 'Donations' THEN 'Donation' ELSE l.category END) AS category,
        l.subcategory,
        l.date,
        l.currency,
        l.amount,
        l.counterparty_contact_id AS counterpartyContactId,
        c.name AS counterpartyName,
        l.source_type AS sourceType,
        l.source_id AS sourceId,
        l.notes,
        l.evidence_file_ids_json AS evidenceFileIdsJson,
        l.posted_status AS postedStatus,
        l.posted_at AS postedAt,
        l.void_reason AS voidReason,
        l.created_by_user_id AS createdBy,
        u.full_name AS createdByName,
        l.created_at AS createdAt
      FROM finance_transactions_ledger l
      LEFT JOIN finance_contacts c ON c.id = l.counterparty_contact_id
      JOIN portal_users u ON u.id = l.created_by_user_id
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY l.date DESC, l.id DESC
    `,
  ).all(params) as Array<{
    id: number;
    txnType: "money_in" | "money_out";
    category: string;
    subcategory: string | null;
    date: string;
    currency: string;
    amount: number;
    counterpartyContactId: number | null;
    counterpartyName: string | null;
    sourceType: FinanceTransactionSourceType;
    sourceId: number;
    notes: string | null;
    evidenceFileIdsJson: string;
    postedStatus: FinancePostedStatus;
    postedAt: string | null;
    voidReason: string | null;
    createdBy: number;
    createdByName: string | null;
    createdAt: string;
  }>;

  return rows.map((row) => {
    const ids = parseJsonArray(row.evidenceFileIdsJson).map((item) => Number(item)).filter((item) => Number.isFinite(item));
    let evidenceFiles = ids
      .map((id) => {
        try {
          return getFinanceFileById(id);
        } catch {
          return null;
        }
      })
      .filter((item): item is FinanceFileRecord => Boolean(item));

    if (evidenceFiles.length === 0) {
      if (row.sourceType === "invoice_payment") {
        evidenceFiles = listFinanceFilesBySource("payment_evidence", row.sourceId);
      } else if (row.sourceType === "expense") {
        evidenceFiles = listFinanceFilesBySource("expense", row.sourceId);
      }
    }

    return {
      id: row.id,
      txnType: row.txnType,
      category: row.category === "Expense" ? "Expense" : normalizeFinanceIncomeCategory(row.category),
      subcategory: row.subcategory || undefined,
      date: row.date,
      currency: normalizeCurrency(row.currency),
      amount: normalizeNumber(row.amount),
      counterpartyContactId: row.counterpartyContactId ?? undefined,
      counterpartyName: row.counterpartyName || undefined,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      notes: row.notes || undefined,
      evidenceFiles,
      postedStatus: row.postedStatus,
      postedAt: row.postedAt || undefined,
      voidReason: row.voidReason || undefined,
      createdBy: row.createdBy,
      createdByName: row.createdByName || undefined,
      createdAt: row.createdAt,
    } as FinanceLedgerTransactionRecord;
  });
}

export function getFinanceDashboardSummary(month = todayIsoDate().slice(0, 7), currency: FinanceCurrency = "UGX"): FinanceDashboardSummary {
  ensureFinanceSchema();
  const db = getDb();
  markOverdueInvoices(db);
  const window = getMonthWindow(month);

  const totals = db.prepare(
    `
      SELECT
        COALESCE(SUM(CASE WHEN txn_type = 'money_in' THEN amount ELSE 0 END), 0) AS moneyIn,
        COALESCE(SUM(CASE WHEN txn_type = 'money_out' THEN amount ELSE 0 END), 0) AS moneyOut
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND currency = @currency
        AND date >= @fromDate
        AND date < @toDate
    `,
  ).get({
    currency,
    fromDate: window.from,
    toDate: window.to,
  }) as { moneyIn: number; moneyOut: number } | undefined;

  const outstanding = db.prepare(
    `
      SELECT
        COUNT(*) AS count,
        COALESCE(SUM(balance_due), 0) AS total
      FROM finance_invoices
      WHERE status IN ('sent', 'overdue', 'partially_paid')
        AND currency = @currency
    `,
  ).get({ currency }) as { count: number; total: number } | undefined;

  const breakdownRows = db.prepare(
    `
      SELECT
        COALESCE(display_category, CASE WHEN category = 'Donations' THEN 'Donation' ELSE category END) AS category,
        COALESCE(SUM(amount), 0) AS amount
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND txn_type = 'money_in'
        AND currency = @currency
        AND date >= @fromDate
        AND date < @toDate
      GROUP BY COALESCE(display_category, CASE WHEN category = 'Donations' THEN 'Donation' ELSE category END)
    `,
  ).all({
    currency,
    fromDate: window.from,
    toDate: window.to,
  }) as Array<{ category: string; amount: number }>;
  const categoryBreakdown = createFinanceIncomeBreakdownZero();
  breakdownRows.forEach((row) => {
    try {
      const category = normalizeFinanceIncomeCategory(row.category);
      categoryBreakdown[category] = normalizeNumber(row.amount);
    } catch {
      // Ignore unrecognized historical categories.
    }
  });

  const moneyIn = normalizeNumber(Number(totals?.moneyIn || 0));
  const moneyOut = normalizeNumber(Number(totals?.moneyOut || 0));
  return {
    month: window.month,
    currency,
    moneyIn,
    moneyOut,
    net: normalizeNumber(moneyIn - moneyOut),
    outstandingInvoiceCount: Number(outstanding?.count || 0),
    outstandingInvoiceTotal: normalizeNumber(Number(outstanding?.total || 0)),
    categoryBreakdown,
  };
}

export function listFinanceMonthlyStatements() {
  ensureFinanceSchema();
  const rows = getDb().prepare(
    `
      SELECT
        s.id,
        s.month,
        s.period_type AS periodType,
        s.currency,
        s.total_money_in AS totalMoneyIn,
        s.total_money_out AS totalMoneyOut,
        s.net,
        s.breakdown_json AS breakdownJson,
        s.generated_by_user_id AS generatedBy,
        u.full_name AS generatedByName,
        s.generated_at AS generatedAt,
        s.pdf_file_id AS pdfFileId,
        s.balance_sheet_pdf_file_id AS balanceSheetPdfFileId,
        s.statement_of_financial_position_pdf_file_id AS statementOfFinancialPositionPdfFileId,
        s.income_statement_pdf_file_id AS incomeStatementPdfFileId
      FROM finance_monthly_statements s
      JOIN portal_users u ON u.id = s.generated_by_user_id
      ORDER BY s.generated_at DESC, s.month DESC, s.currency ASC
    `,
  ).all() as Array<{
    id: number;
    month: string;
    periodType: string;
    currency: string;
    totalMoneyIn: number;
    totalMoneyOut: number;
    net: number;
    breakdownJson: string;
    generatedBy: number;
    generatedByName: string | null;
    generatedAt: string;
    pdfFileId: number | null;
    balanceSheetPdfFileId: number | null;
    statementOfFinancialPositionPdfFileId: number | null;
    incomeStatementPdfFileId: number | null;
  }>;

  return rows.map((row) => {
    let breakdown: Record<FinanceCategory, number> = {
      ...createFinanceIncomeBreakdownZero(),
      Expense: 0,
    };
    try {
      const parsed = JSON.parse(row.breakdownJson || "{}") as Record<string, number>;
      const income = createFinanceIncomeBreakdownZero();
      FINANCE_INCOME_CATEGORIES.forEach((category) => {
        income[category] = normalizeNumber(Number(parsed[category] || 0));
      });
      // Backward compatibility for previously stored "Donations".
      income.Donation = normalizeNumber(income.Donation + Number(parsed.Donations || 0));
      breakdown = {
        ...income,
        Expense: normalizeNumber(Number(parsed.Expense || 0)),
      };
    } catch {
      breakdown = {
        ...createFinanceIncomeBreakdownZero(),
        Expense: 0,
      };
    }
    return {
      id: row.id,
      month: row.month,
      periodType: normalizeStatementPeriodType(row.periodType),
      currency: normalizeCurrency(row.currency),
      totalMoneyIn: normalizeNumber(row.totalMoneyIn),
      totalMoneyOut: normalizeNumber(row.totalMoneyOut),
      net: normalizeNumber(row.net),
      breakdownByCategory: breakdown,
      generatedAt: row.generatedAt,
      generatedBy: row.generatedBy,
      generatedByName: row.generatedByName || undefined,
      pdfFileId: row.pdfFileId ?? undefined,
      pdfUrl: row.pdfFileId ? getSignedFinanceFileUrl(row.pdfFileId) : undefined,
      balanceSheetPdfFileId: row.balanceSheetPdfFileId ?? undefined,
      statementOfFinancialPositionPdfFileId: row.statementOfFinancialPositionPdfFileId ?? undefined,
      incomeStatementPdfFileId: row.incomeStatementPdfFileId ?? undefined,
      balanceSheetPdfUrl: row.balanceSheetPdfFileId ? getSignedFinanceFileUrl(row.balanceSheetPdfFileId) : undefined,
      statementOfFinancialPositionPdfUrl: row.statementOfFinancialPositionPdfFileId
        ? getSignedFinanceFileUrl(row.statementOfFinancialPositionPdfFileId)
        : undefined,
      incomeStatementPdfUrl: row.incomeStatementPdfFileId ? getSignedFinanceFileUrl(row.incomeStatementPdfFileId) : undefined,
    } as FinanceMonthlyStatementRecord;
  });
}

export async function generateFinanceMonthlyStatement(
  periodInput: FinanceStatementPeriodInput | string,
  currency: FinanceCurrency,
  actor: FinanceActor,
) {
  ensureFinanceSchema();
  const db = getDb();
  const window = periodWindowFromInput(periodInput);

  const totals = db.prepare(
    `
      SELECT
        COALESCE(SUM(CASE WHEN txn_type = 'money_in' THEN amount ELSE 0 END), 0) AS totalMoneyIn,
        COALESCE(SUM(CASE WHEN txn_type = 'money_out' THEN amount ELSE 0 END), 0) AS totalMoneyOut
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND currency = @currency
        AND date >= @fromDate
        AND date < @toDate
    `,
  ).get({
    currency,
    fromDate: window.from,
    toDate: window.to,
  }) as { totalMoneyIn: number; totalMoneyOut: number } | undefined;

  const breakdownRows = db.prepare(
    `
      SELECT
        COALESCE(display_category, CASE WHEN category = 'Donations' THEN 'Donation' ELSE category END) AS category,
        COALESCE(SUM(amount), 0) AS amount
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND currency = @currency
        AND date >= @fromDate
        AND date < @toDate
      GROUP BY COALESCE(display_category, CASE WHEN category = 'Donations' THEN 'Donation' ELSE category END)
    `,
  ).all({
    currency,
    fromDate: window.from,
    toDate: window.to,
  }) as Array<{ category: string; amount: number }>;

  const breakdownByCategory: Record<FinanceCategory, number> = {
    ...createFinanceIncomeBreakdownZero(),
    Expense: 0,
  };
  breakdownRows.forEach((row) => {
    if (row.category === "Expense") {
      breakdownByCategory.Expense = normalizeNumber(Number(row.amount || 0));
      return;
    }
    try {
      const normalizedCategory = normalizeFinanceIncomeCategory(row.category);
      breakdownByCategory[normalizedCategory] = normalizeNumber(Number(row.amount || 0));
    } catch {
      // Ignore unexpected historical category names.
    }
  });

  const totalMoneyIn = normalizeNumber(Number(totals?.totalMoneyIn || 0));
  const totalMoneyOut = normalizeNumber(Number(totals?.totalMoneyOut || 0));
  const net = normalizeNumber(totalMoneyIn - totalMoneyOut);

  const topIncome = db.prepare(
    `
      SELECT
        source_type AS label,
        amount
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND txn_type = 'money_in'
        AND currency = @currency
        AND date >= @fromDate
        AND date < @toDate
      ORDER BY amount DESC
      LIMIT 10
    `,
  ).all({
    currency,
    fromDate: window.from,
    toDate: window.to,
  }) as Array<{ label: string; amount: number }>;

  const topExpenses = db.prepare(
    `
      SELECT
        COALESCE(subcategory, source_type) AS label,
        amount
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND txn_type = 'money_out'
        AND currency = @currency
        AND date >= @fromDate
        AND date < @toDate
      ORDER BY amount DESC
      LIMIT 10
    `,
  ).all({
    currency,
    fromDate: window.from,
    toDate: window.to,
  }) as Array<{ label: string; amount: number }>;

  const upsert = db.prepare(
    `
      INSERT INTO finance_monthly_statements (
        month,
        period_type,
        currency,
        total_money_in,
        total_money_out,
        net,
        breakdown_json,
        generated_by_user_id,
        generated_at
      ) VALUES (
        @month,
        @periodType,
        @currency,
        @totalMoneyIn,
        @totalMoneyOut,
        @net,
        @breakdownJson,
        @generatedBy,
        @generatedAt
      )
      ON CONFLICT(month, currency)
      DO UPDATE SET
        period_type = excluded.period_type,
        total_money_in = excluded.total_money_in,
        total_money_out = excluded.total_money_out,
        net = excluded.net,
        breakdown_json = excluded.breakdown_json,
        generated_by_user_id = excluded.generated_by_user_id,
        generated_at = excluded.generated_at
    `,
  ).run({
    month: window.month,
    periodType: window.periodType,
    currency,
    totalMoneyIn,
    totalMoneyOut,
    net,
    breakdownJson: JSON.stringify(breakdownByCategory),
    generatedBy: actor.userId,
    generatedAt: nowIso(),
  });

  const statementRow = db.prepare(
    `
      SELECT id
      FROM finance_monthly_statements
      WHERE month = @month
        AND currency = @currency
      LIMIT 1
    `,
  ).get({ month: window.month, currency }) as { id: number } | undefined;
  if (!statementRow) {
    throw new Error("Failed to generate monthly statement.");
  }

  const statement: FinanceMonthlyStatementRecord = {
    id: statementRow.id,
    month: window.month,
    periodType: window.periodType,
    currency,
    totalMoneyIn,
    totalMoneyOut,
    net,
    breakdownByCategory,
    generatedAt: nowIso(),
    generatedBy: actor.userId,
    generatedByName: actor.userName,
  };

  const position = deriveStatementOfFinancialPosition(db, currency, window);
  const income = deriveIncomeStatement(db, currency, window);
  const [balancePdf, positionPdf, incomePdf] = await Promise.all([
    generateStatementPdfFile({
      documentType: "balance_sheet",
      statement,
      position,
      income,
      topIncome,
      topExpenses,
    }),
    generateStatementPdfFile({
      documentType: "statement_of_financial_position",
      statement,
      position,
      income,
      topIncome,
      topExpenses,
    }),
    generateStatementPdfFile({
      documentType: "income_statement",
      statement,
      position,
      income,
      topIncome,
      topExpenses,
    }),
  ]);
  const balanceFile = createFinanceFileRecordInternal(db, {
    sourceType: "statement_pdf",
    sourceId: statement.id,
    fileName: balancePdf.fileName,
    storedPath: balancePdf.storedPath,
    mimeType: "application/pdf",
    sizeBytes: 0,
    uploadedBy: actor.userId,
  });
  const positionFile = createFinanceFileRecordInternal(db, {
    sourceType: "statement_pdf",
    sourceId: statement.id,
    fileName: positionPdf.fileName,
    storedPath: positionPdf.storedPath,
    mimeType: "application/pdf",
    sizeBytes: 0,
    uploadedBy: actor.userId,
  });
  const incomeFile = createFinanceFileRecordInternal(db, {
    sourceType: "statement_pdf",
    sourceId: statement.id,
    fileName: incomePdf.fileName,
    storedPath: incomePdf.storedPath,
    mimeType: "application/pdf",
    sizeBytes: 0,
    uploadedBy: actor.userId,
  });
  db.prepare(
    `
      UPDATE finance_monthly_statements
      SET pdf_stored_path = @pdfStoredPath,
          pdf_file_id = @pdfFileId,
          balance_sheet_pdf_file_id = @balanceSheetPdfFileId,
          statement_of_financial_position_pdf_file_id = @statementOfFinancialPositionPdfFileId,
          income_statement_pdf_file_id = @incomeStatementPdfFileId
      WHERE id = @statementId
    `,
  ).run({
    statementId: statement.id,
    pdfStoredPath: balancePdf.storedPath,
    pdfFileId: balanceFile.id,
    balanceSheetPdfFileId: balanceFile.id,
    statementOfFinancialPositionPdfFileId: positionFile.id,
    incomeStatementPdfFileId: incomeFile.id,
  });

  appendAudit(actor, "generate_statement", "finance_monthly_statements", statement.id, `Generated statement ${window.month} (${currency})`);
  return {
    ...statement,
    pdfFileId: balanceFile.id,
    pdfUrl: getSignedFinanceFileUrl(balanceFile.id),
    balanceSheetPdfFileId: balanceFile.id,
    statementOfFinancialPositionPdfFileId: positionFile.id,
    incomeStatementPdfFileId: incomeFile.id,
    balanceSheetPdfUrl: getSignedFinanceFileUrl(balanceFile.id),
    statementOfFinancialPositionPdfUrl: getSignedFinanceFileUrl(positionFile.id),
    incomeStatementPdfUrl: getSignedFinanceFileUrl(incomeFile.id),
  } as FinanceMonthlyStatementRecord;
}

export function listFinanceEmailLogs(limit = 200): FinanceEmailLogEntry[] {
  ensureFinanceSchema();
  const rows = getDb().prepare(
    `
      SELECT
        l.id,
        l.record_type AS recordType,
        l.record_id AS recordId,
        l.to_email AS toEmail,
        l.cc_email AS ccEmail,
        l.subject,
        l.status,
        l.provider_message AS providerMessage,
        l.created_by_user_id AS createdBy,
        l.created_at AS createdAt
      FROM finance_email_logs l
      ORDER BY l.created_at DESC
      LIMIT @limit
    `,
  ).all({ limit: Math.min(Math.max(1, limit), 1000) }) as Array<{
    id: number;
    recordType: "invoice" | "receipt";
    recordId: number;
    toEmail: string;
    ccEmail: string | null;
    subject: string;
    status: "sent" | "failed" | "skipped";
    providerMessage: string | null;
    createdBy: number;
    createdAt: string;
  }>;
  return rows;
}

export function exportFinanceRowsToCsv(rows: Array<Record<string, unknown>>, columns: string[]) {
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
  };
  const header = columns.join(",");
  const body = rows
    .map((row) => columns.map((column) => escape(row[column])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

/* ════════════════════════════════════════════════════════════════════════════
   V2 FEATURE 1 — BANK / CASH RECONCILIATION
   ════════════════════════════════════════════════════════════════════════════ */

export function createStatementLine(
  actor: FinanceActor,
  input: {
    accountType: FinanceStatementAccountType;
    date: string;
    amount: number;
    currency: FinanceCurrency;
    reference?: string;
    description?: string;
  },
): FinanceStatementLineRecord {
  ensureFinanceSchema();
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO finance_statement_lines (account_type, date, amount, currency, reference, description, created_by_user_id, created_at)
     VALUES (@accountType, @date, @amount, @currency, @reference, @description, @userId, @now)`,
  ).run({
    accountType: input.accountType,
    date: input.date,
    amount: normalizeNumber(input.amount),
    currency: input.currency || "UGX",
    reference: input.reference || null,
    description: input.description || null,
    userId: actor.userId,
    now: nowIso(),
  });
  const id = Number(result.lastInsertRowid);
  appendAudit(actor, "create_statement_line", "finance_statement_lines", id, `Created statement line: ${input.accountType} ${input.currency} ${input.amount}`);
  return getStatementLineById(id)!;
}

function getStatementLineById(id: number): FinanceStatementLineRecord | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT id, account_type AS accountType, date, amount, currency, reference, description,
            match_status AS matchStatus, matched_amount AS matchedAmount,
            created_by_user_id AS createdBy, created_at AS createdAt
     FROM finance_statement_lines WHERE id = @id`,
  ).get({ id }) as {
    id: number; accountType: string; date: string; amount: number; currency: string;
    reference: string | null; description: string | null; matchStatus: string;
    matchedAmount: number; createdBy: number; createdAt: string;
  } | undefined;
  if (!row) return null;
  return {
    id: row.id,
    accountType: row.accountType as FinanceStatementAccountType,
    date: row.date,
    amount: normalizeNumber(row.amount),
    currency: normalizeCurrency(row.currency),
    reference: row.reference || undefined,
    description: row.description || undefined,
    matchStatus: row.matchStatus as FinanceMatchStatus,
    matchedAmount: normalizeNumber(row.matchedAmount),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export function listStatementLines(filters?: {
  accountType?: FinanceStatementAccountType;
  matchStatus?: FinanceMatchStatus;
  month?: string;
}): FinanceStatementLineRecord[] {
  ensureFinanceSchema();
  const db = getDb();
  let sql = `SELECT id, account_type AS accountType, date, amount, currency, reference, description,
                    match_status AS matchStatus, matched_amount AS matchedAmount,
                    created_by_user_id AS createdBy, created_at AS createdAt
             FROM finance_statement_lines WHERE 1=1`;
  const params: Record<string, unknown> = {};
  if (filters?.accountType) {
    sql += " AND account_type = @accountType";
    params.accountType = filters.accountType;
  }
  if (filters?.matchStatus) {
    sql += " AND match_status = @matchStatus";
    params.matchStatus = filters.matchStatus;
  }
  if (filters?.month) {
    sql += " AND date LIKE @monthPrefix";
    params.monthPrefix = `${filters.month}%`;
  }
  sql += " ORDER BY date DESC, id DESC";
  const rows = db.prepare(sql).all(params) as Array<{
    id: number; accountType: string; date: string; amount: number; currency: string;
    reference: string | null; description: string | null; matchStatus: string;
    matchedAmount: number; createdBy: number; createdAt: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    accountType: row.accountType as FinanceStatementAccountType,
    date: row.date,
    amount: normalizeNumber(row.amount),
    currency: normalizeCurrency(row.currency),
    reference: row.reference || undefined,
    description: row.description || undefined,
    matchStatus: row.matchStatus as FinanceMatchStatus,
    matchedAmount: normalizeNumber(row.matchedAmount),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  }));
}

export function matchStatementLineToLedger(
  actor: FinanceActor,
  statementLineId: number,
  ledgerTxnId: number,
  matchedAmount: number,
): FinanceReconciliationMatchRecord {
  ensureFinanceSchema();
  const db = getDb();
  const amt = normalizeNumber(matchedAmount);
  const result = db.prepare(
    `INSERT INTO finance_reconciliation_matches (statement_line_id, ledger_txn_id, matched_amount, created_by_user_id, created_at)
     VALUES (@slId, @ltId, @amt, @userId, @now)`,
  ).run({ slId: statementLineId, ltId: ledgerTxnId, amt, userId: actor.userId, now: nowIso() });
  const matchId = Number(result.lastInsertRowid);

  /* update statement line matched_amount and status */
  const line = getStatementLineById(statementLineId);
  if (line) {
    const newMatchedAmt = normalizeNumber(line.matchedAmount + amt);
    const absAmount = Math.abs(line.amount);
    const newStatus: FinanceMatchStatus = newMatchedAmt >= absAmount ? "matched" : "partial";
    db.prepare(`UPDATE finance_statement_lines SET matched_amount = @ma, match_status = @ms WHERE id = @id`)
      .run({ ma: newMatchedAmt, ms: newStatus, id: statementLineId });
  }

  appendAudit(actor, "reconciliation_match", "finance_reconciliation_matches", matchId,
    `Matched stmt line ${statementLineId} to ledger ${ledgerTxnId} for ${amt}`);

  const row = db.prepare(
    `SELECT id, statement_line_id AS statementLineId, ledger_txn_id AS ledgerTxnId,
            matched_amount AS matchedAmount, created_by_user_id AS createdBy, created_at AS createdAt
     FROM finance_reconciliation_matches WHERE id = @id`,
  ).get({ id: matchId }) as {
    id: number; statementLineId: number; ledgerTxnId: number;
    matchedAmount: number; createdBy: number; createdAt: string;
  };
  return {
    id: row.id,
    statementLineId: row.statementLineId,
    ledgerTxnId: row.ledgerTxnId,
    matchedAmount: normalizeNumber(row.matchedAmount),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export function unmatchStatementLine(actor: FinanceActor, matchId: number) {
  ensureFinanceSchema();
  const db = getDb();
  const match = db.prepare(
    `SELECT id, statement_line_id AS slId, matched_amount AS amt FROM finance_reconciliation_matches WHERE id = @id`,
  ).get({ id: matchId }) as { id: number; slId: number; amt: number } | undefined;
  if (!match) return;

  db.prepare(`DELETE FROM finance_reconciliation_matches WHERE id = @id`).run({ id: matchId });

  /* recalculate statement line */
  const totalMatched = db.prepare(
    `SELECT COALESCE(SUM(matched_amount), 0) AS total FROM finance_reconciliation_matches WHERE statement_line_id = @slId`,
  ).get({ slId: match.slId }) as { total: number };
  const line = getStatementLineById(match.slId);
  if (line) {
    const newAmt = normalizeNumber(totalMatched.total);
    const absAmount = Math.abs(line.amount);
    const newStatus: FinanceMatchStatus = newAmt <= 0 ? "unmatched" : newAmt >= absAmount ? "matched" : "partial";
    db.prepare(`UPDATE finance_statement_lines SET matched_amount = @ma, match_status = @ms WHERE id = @id`)
      .run({ ma: newAmt, ms: newStatus, id: match.slId });
  }

  appendAudit(actor, "reconciliation_unmatch", "finance_reconciliation_matches", matchId,
    `Unmatched reconciliation match ${matchId}`);
}

export function autoSuggestMatches(statementLineId: number): Array<{
  ledgerTxnId: number; date: string; amount: number; currency: string;
  counterpartyName: string | null; notes: string | null; score: number;
}> {
  ensureFinanceSchema();
  const db = getDb();
  const line = getStatementLineById(statementLineId);
  if (!line) return [];

  const absAmt = Math.abs(line.amount);
  const amtLo = normalizeNumber(absAmt * 0.95);
  const amtHi = normalizeNumber(absAmt * 1.05);

  /* find unmatched/partial ledger txns within ±3 days and ±5% amount */
  const rows = db.prepare(
    `SELECT l.id AS ledgerTxnId, l.date, l.amount, l.currency,
            l.counterparty_contact_id, l.notes,
            (SELECT name FROM finance_contacts WHERE id = l.counterparty_contact_id) AS counterpartyName
     FROM finance_transactions_ledger l
     WHERE l.posted_status = 'posted'
       AND l.currency = @currency
       AND ABS(l.amount) BETWEEN @amtLo AND @amtHi
       AND l.date BETWEEN date(@date, '-3 days') AND date(@date, '+3 days')
       AND l.id NOT IN (SELECT ledger_txn_id FROM finance_reconciliation_matches)
     ORDER BY ABS(ABS(l.amount) - @absAmt) ASC
     LIMIT 20`,
  ).all({
    currency: line.currency,
    amtLo,
    amtHi,
    date: line.date,
    absAmt,
  }) as Array<{
    ledgerTxnId: number; date: string; amount: number; currency: string;
    counterpartyName: string | null; notes: string | null;
  }>;

  return rows.map((r) => {
    let score = 50; /* base */
    const amtDiff = Math.abs(Math.abs(r.amount) - absAmt) / absAmt;
    score += Math.round((1 - amtDiff) * 30);
    if (line.reference && r.notes && r.notes.toLowerCase().includes(line.reference.toLowerCase())) {
      score += 20;
    }
    return { ...r, score: Math.min(score, 100) };
  });
}

export function getReconciliationSummary(month: string, currency: FinanceCurrency) {
  ensureFinanceSchema();
  const db = getDb();
  const stmtRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
     FROM finance_statement_lines WHERE date LIKE @mp AND currency = @c`,
  ).get({ mp: `${month}%`, c: currency }) as { total: number; cnt: number };

  const ledgerRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
     FROM finance_transactions_ledger WHERE date LIKE @mp AND currency = @c AND posted_status = 'posted'`,
  ).get({ mp: `${month}%`, c: currency }) as { total: number; cnt: number };

  const matchedRow = db.prepare(
    `SELECT COALESCE(SUM(rm.matched_amount), 0) AS total
     FROM finance_reconciliation_matches rm
     JOIN finance_statement_lines sl ON sl.id = rm.statement_line_id
     WHERE sl.date LIKE @mp AND sl.currency = @c`,
  ).get({ mp: `${month}%`, c: currency }) as { total: number };

  const unmatchedStmt = db.prepare(
    `SELECT COUNT(*) AS cnt FROM finance_statement_lines WHERE date LIKE @mp AND currency = @c AND match_status = 'unmatched'`,
  ).get({ mp: `${month}%`, c: currency }) as { cnt: number };

  const unmatchedLedger = db.prepare(
    `SELECT COUNT(*) AS cnt FROM finance_transactions_ledger
     WHERE date LIKE @mp AND currency = @c AND posted_status = 'posted'
       AND id NOT IN (SELECT ledger_txn_id FROM finance_reconciliation_matches)`,
  ).get({ mp: `${month}%`, c: currency }) as { cnt: number };

  return {
    month,
    currency,
    statementTotal: normalizeNumber(stmtRow.total),
    ledgerTotal: normalizeNumber(ledgerRow.total),
    matchedTotal: normalizeNumber(matchedRow.total),
    unmatchedStatementCount: unmatchedStmt.cnt,
    unmatchedLedgerCount: unmatchedLedger.cnt,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   V2 FEATURE 2 — PAYMENT ALLOCATION
   ════════════════════════════════════════════════════════════════════════════ */

export function allocatePayment(
  actor: FinanceActor,
  paymentId: number,
  invoiceId: number,
  amount: number,
): FinancePaymentAllocationRecord {
  ensureFinanceSchema();
  const db = getDb();
  const amt = normalizeNumber(amount);

  /* Validate: sum of existing allocations + new must not exceed payment amount */
  const payment = db.prepare(`SELECT amount FROM finance_payments WHERE id = @id AND status != 'void'`).get({ id: paymentId }) as { amount: number } | undefined;
  if (!payment) throw new Error("Payment not found or voided.");

  const existingSum = db.prepare(
    `SELECT COALESCE(SUM(allocated_amount), 0) AS total FROM finance_payment_allocations WHERE payment_id = @pid`,
  ).get({ pid: paymentId }) as { total: number };

  if (normalizeNumber(existingSum.total + amt) > normalizeNumber(payment.amount)) {
    throw new Error(`Allocation exceeds payment amount. Available: ${normalizeNumber(payment.amount - existingSum.total)}`);
  }

  /* Validate: allocation doesn't exceed invoice balance_due */
  const invoice = db.prepare(`SELECT balance_due FROM finance_invoices WHERE id = @id AND status != 'void'`).get({ id: invoiceId }) as { balance_due: number } | undefined;
  if (!invoice) throw new Error("Invoice not found or voided.");
  if (amt > normalizeNumber(invoice.balance_due)) {
    throw new Error(`Allocation exceeds invoice balance due (${normalizeNumber(invoice.balance_due)}).`);
  }

  const result = db.prepare(
    `INSERT INTO finance_payment_allocations (payment_id, invoice_id, allocated_amount, created_by_user_id, created_at)
     VALUES (@pid, @iid, @amt, @uid, @now)`,
  ).run({ pid: paymentId, iid: invoiceId, amt, uid: actor.userId, now: nowIso() });
  const allocId = Number(result.lastInsertRowid);

  /* Recalculate invoice status */
  recalculateInvoiceFromAllocations(db, invoiceId);

  appendAudit(actor, "allocate_payment", "finance_payment_allocations", allocId,
    `Allocated ${amt} from payment ${paymentId} to invoice ${invoiceId}`);

  return getPaymentAllocationById(db, allocId)!;
}

export function deallocatePayment(actor: FinanceActor, allocationId: number) {
  ensureFinanceSchema();
  const db = getDb();
  const alloc = db.prepare(
    `SELECT id, payment_id AS pid, invoice_id AS iid, allocated_amount AS amt
     FROM finance_payment_allocations WHERE id = @id`,
  ).get({ id: allocationId }) as { id: number; pid: number; iid: number; amt: number } | undefined;
  if (!alloc) throw new Error("Allocation not found.");

  db.prepare(`DELETE FROM finance_payment_allocations WHERE id = @id`).run({ id: allocationId });
  recalculateInvoiceFromAllocations(db, alloc.iid);

  appendAudit(actor, "deallocate_payment", "finance_payment_allocations", allocationId,
    `Deallocated ${alloc.amt} from payment ${alloc.pid} off invoice ${alloc.iid}`);
}

export function listPaymentAllocations(paymentId: number): FinancePaymentAllocationRecord[] {
  ensureFinanceSchema();
  const db = getDb();
  return db.prepare(
    `SELECT pa.id, pa.payment_id AS paymentId, pa.invoice_id AS invoiceId,
            pa.allocated_amount AS allocatedAmount, i.invoice_number AS invoiceNumber,
            pa.created_by_user_id AS createdBy, pa.created_at AS createdAt
     FROM finance_payment_allocations pa
     LEFT JOIN finance_invoices i ON i.id = pa.invoice_id
     WHERE pa.payment_id = @pid ORDER BY pa.id ASC`,
  ).all({ pid: paymentId }) as FinancePaymentAllocationRecord[];
}

export function listInvoiceAllocations(invoiceId: number): FinancePaymentAllocationRecord[] {
  ensureFinanceSchema();
  const db = getDb();
  return db.prepare(
    `SELECT pa.id, pa.payment_id AS paymentId, pa.invoice_id AS invoiceId,
            pa.allocated_amount AS allocatedAmount, i.invoice_number AS invoiceNumber,
            pa.created_by_user_id AS createdBy, pa.created_at AS createdAt
     FROM finance_payment_allocations pa
     LEFT JOIN finance_invoices i ON i.id = pa.invoice_id
     WHERE pa.invoice_id = @iid ORDER BY pa.id ASC`,
  ).all({ iid: invoiceId }) as FinancePaymentAllocationRecord[];
}

function getPaymentAllocationById(db: import("better-sqlite3").Database, id: number): FinancePaymentAllocationRecord | null {
  const row = db.prepare(
    `SELECT pa.id, pa.payment_id AS paymentId, pa.invoice_id AS invoiceId,
            pa.allocated_amount AS allocatedAmount, i.invoice_number AS invoiceNumber,
            pa.created_by_user_id AS createdBy, pa.created_at AS createdAt
     FROM finance_payment_allocations pa
     LEFT JOIN finance_invoices i ON i.id = pa.invoice_id
     WHERE pa.id = @id`,
  ).get({ id }) as FinancePaymentAllocationRecord | undefined;
  return row || null;
}

function recalculateInvoiceFromAllocations(db: import("better-sqlite3").Database, invoiceId: number) {
  const allocs = db.prepare(
    `SELECT COALESCE(SUM(allocated_amount), 0) AS total FROM finance_payment_allocations WHERE invoice_id = @iid`,
  ).get({ iid: invoiceId }) as { total: number };

  const invoice = db.prepare(`SELECT total FROM finance_invoices WHERE id = @id`).get({ id: invoiceId }) as { total: number } | undefined;
  if (!invoice) return;

  const paidAmount = normalizeNumber(allocs.total);
  const balanceDue = normalizeNumber(invoice.total - paidAmount);
  let status: string;
  if (paidAmount <= 0) status = "draft";
  else if (balanceDue <= 0) status = "paid";
  else status = "partially_paid";

  db.prepare(
    `UPDATE finance_invoices SET paid_amount = @pa, balance_due = @bd, status = @st, updated_at = @now WHERE id = @id`,
  ).run({ pa: paidAmount, bd: balanceDue, st: status, id: invoiceId, now: nowIso() });
}

/* ════════════════════════════════════════════════════════════════════════════
   V2 FEATURE 3 — BUDGETS (monthly by subcategory)
   ════════════════════════════════════════════════════════════════════════════ */

export function upsertMonthlyBudget(
  actor: FinanceActor,
  input: { month: string; currency: FinanceCurrency; subcategory: string; budgetAmount: number },
): FinanceBudgetMonthlyRecord {
  ensureFinanceSchema();
  const db = getDb();
  const amt = normalizeNumber(input.budgetAmount);
  db.prepare(
    `INSERT INTO finance_budgets_monthly (month, currency, subcategory, budget_amount, created_by_user_id, created_at, updated_at)
     VALUES (@month, @currency, @subcategory, @amt, @uid, @now, @now)
     ON CONFLICT(month, currency, subcategory) DO UPDATE SET budget_amount = @amt, updated_at = @now`,
  ).run({
    month: input.month,
    currency: input.currency,
    subcategory: input.subcategory,
    amt,
    uid: actor.userId,
    now: nowIso(),
  });

  const row = db.prepare(
    `SELECT id, month, currency, subcategory, budget_amount AS budgetAmount,
            created_by_user_id AS createdBy, created_at AS createdAt, updated_at AS updatedAt
     FROM finance_budgets_monthly WHERE month = @m AND currency = @c AND subcategory = @s`,
  ).get({ m: input.month, c: input.currency, s: input.subcategory }) as FinanceBudgetMonthlyRecord;

  appendAudit(actor, "upsert_budget", "finance_budgets_monthly", row.id,
    `Budget ${input.month} ${input.subcategory}: ${input.currency} ${amt}`);

  return row;
}

export function listMonthlyBudgets(month: string, currency?: FinanceCurrency): FinanceBudgetMonthlyRecord[] {
  ensureFinanceSchema();
  const db = getDb();
  let sql = `SELECT id, month, currency, subcategory, budget_amount AS budgetAmount,
                    created_by_user_id AS createdBy, created_at AS createdAt, updated_at AS updatedAt
             FROM finance_budgets_monthly WHERE month = @month`;
  const params: Record<string, unknown> = { month };
  if (currency) {
    sql += " AND currency = @currency";
    params.currency = currency;
  }
  sql += " ORDER BY subcategory ASC";
  return db.prepare(sql).all(params) as FinanceBudgetMonthlyRecord[];
}

export function getBudgetVsActual(month: string, currency: FinanceCurrency): FinanceBudgetVsActualLine[] {
  ensureFinanceSchema();
  const db = getDb();
  const budgets = listMonthlyBudgets(month, currency);

  /* Actual spend from ledger for this month/currency */
  const actuals = db.prepare(
    `SELECT COALESCE(subcategory, 'Other') AS subcategory, SUM(amount) AS total
     FROM finance_transactions_ledger
     WHERE txn_type = 'money_out' AND posted_status = 'posted'
       AND date LIKE @mp AND currency = @c
     GROUP BY COALESCE(subcategory, 'Other')`,
  ).all({ mp: `${month}%`, c: currency }) as Array<{ subcategory: string; total: number }>;
  const actualMap = new Map(actuals.map((a) => [a.subcategory, normalizeNumber(a.total)]));

  /* Merge: all budget subcategories + any actuals not in budget */
  const seen = new Set<string>();
  const lines: FinanceBudgetVsActualLine[] = [];

  for (const b of budgets) {
    seen.add(b.subcategory);
    const actual = actualMap.get(b.subcategory) || 0;
    const variance = normalizeNumber(b.budgetAmount - actual);
    lines.push({
      subcategory: b.subcategory,
      budgetAmount: b.budgetAmount,
      actualAmount: actual,
      variance,
      variancePct: b.budgetAmount > 0 ? normalizeNumber((variance / b.budgetAmount) * 100) : null,
    });
  }

  for (const [subcat, actual] of actualMap) {
    if (!seen.has(subcat)) {
      lines.push({
        subcategory: subcat,
        budgetAmount: 0,
        actualAmount: actual,
        variance: normalizeNumber(-actual),
        variancePct: null,
      });
    }
  }

  return lines.sort((a, b) => a.subcategory.localeCompare(b.subcategory));
}

/* ════════════════════════════════════════════════════════════════════════════
   V2 FEATURE 4 — RESTRICTED / EARMARKED FUNDS
   ════════════════════════════════════════════════════════════════════════════ */

export function getRestrictedFundsSummary(currency?: FinanceCurrency): FinanceRestrictedBalanceLine[] {
  ensureFinanceSchema();
  const db = getDb();
  let currFilter = "";
  const params: Record<string, unknown> = {};
  if (currency) {
    currFilter = " AND currency = @c";
    params.c = currency;
  }

  /* Money in: restricted receipts posted to ledger */
  const inRows = db.prepare(
    `SELECT restricted_program AS program, restricted_geo_scope AS geoScope,
            restricted_geo_id AS geoId, currency,
            SUM(amount) AS total
     FROM finance_transactions_ledger
     WHERE txn_type = 'money_in' AND posted_status = 'posted'
       AND restricted_flag = 1 ${currFilter}
     GROUP BY restricted_program, restricted_geo_scope, restricted_geo_id, currency`,
  ).all(params) as Array<{
    program: string; geoScope: string | null; geoId: number | null;
    currency: string; total: number;
  }>;

  /* Money out: restricted expenses posted to ledger */
  const outRows = db.prepare(
    `SELECT restricted_program AS program, restricted_geo_scope AS geoScope,
            restricted_geo_id AS geoId, currency,
            SUM(amount) AS total
     FROM finance_transactions_ledger
     WHERE txn_type = 'money_out' AND posted_status = 'posted'
       AND restricted_flag = 1 ${currFilter}
     GROUP BY restricted_program, restricted_geo_scope, restricted_geo_id, currency`,
  ).all(params) as Array<{
    program: string; geoScope: string | null; geoId: number | null;
    currency: string; total: number;
  }>;

  /* Build map: key = program|geoScope|geoId|currency */
  const map = new Map<string, FinanceRestrictedBalanceLine>();
  const key = (p: string, gs: string | null, gi: number | null, c: string) =>
    `${p}|${gs ?? ""}|${gi ?? ""}|${c}`;

  for (const row of inRows) {
    const k = key(row.program, row.geoScope, row.geoId, row.currency);
    map.set(k, {
      program: row.program as FinanceRestrictedProgram,
      geoScope: row.geoScope || undefined,
      geoId: row.geoId || undefined,
      totalIn: normalizeNumber(row.total),
      totalOut: 0,
      remaining: normalizeNumber(row.total),
      currency: normalizeCurrency(row.currency),
    });
  }

  for (const row of outRows) {
    const k = key(row.program, row.geoScope, row.geoId, row.currency);
    const existing = map.get(k);
    if (existing) {
      existing.totalOut = normalizeNumber(row.total);
      existing.remaining = normalizeNumber(existing.totalIn - existing.totalOut);
    } else {
      map.set(k, {
        program: row.program as FinanceRestrictedProgram,
        geoScope: row.geoScope || undefined,
        geoId: row.geoId || undefined,
        totalIn: 0,
        totalOut: normalizeNumber(row.total),
        remaining: normalizeNumber(-row.total),
        currency: normalizeCurrency(row.currency),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.program.localeCompare(b.program));
}

/* ========================================================
   12. FINANCIAL TRANSPARENCY HUB
======================================================== */

function logFinanceTransparencyAudit(actor: FinanceActor, action: string, table: string, id: number, details: string) {
  logAuditEvent(actor.userId, actor.userName, action, table, id, null, null, details, null);
}

export function listFinancePublicSnapshots(filters?: { publishedOnly?: boolean }) {
  ensureFinanceSchema();
  const where: string[] = [];
  if (filters?.publishedOnly) {
    where.push("status = 'published'");
  }
  const sql = `
    SELECT * FROM finance_public_snapshots
    ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY fy DESC, quarter DESC, generated_at DESC
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = getDb().prepare(sql).all() as any[];
  return rows.map(r => ({
    id: r.id,
    fy: r.fy,
    quarter: r.quarter,
    currency: normalizeCurrency(r.currency),
    snapshotType: r.snapshot_type,
    status: r.status,
    totalIncome: normalizeNumber(r.total_income),
    totalExpenditure: normalizeNumber(r.total_expenditure),
    net: normalizeNumber(r.net),
    programPct: r.program_pct,
    adminPct: r.admin_pct,
    categoryBreakdownJson: r.category_breakdown_json,
    restrictedSummaryJson: r.restricted_summary_json,
    pdfFileId: r.pdf_file_id,
    storedPath: r.stored_path,
    publishConfirmation: r.publish_confirmation,
    publishedAt: r.published_at,
    publishedByUserId: r.published_by_user_id,
    archivedAt: r.archived_at,
    generatedByUserId: r.generated_by_user_id,
    generatedAt: r.generated_at,
  }));
}

function getAggregatedLedgerData(fromDate: string, toDate: string, currency: string) {
  const incomes = listFinanceLedgerTransactions({ txnType: "money_in", fromDate, toDate })
    .filter(t => t.postedStatus === "posted" && t.currency === currency);
  const expenses = listFinanceLedgerTransactions({ txnType: "money_out", fromDate, toDate })
    .filter(t => t.postedStatus === "posted" && t.currency === currency && t.category === "Expense");

  let totalIncome = 0;
  const incomeBreakdown: Record<string, number> = {};
  for (const t of incomes) {
    totalIncome += Math.abs(t.amount);
    const cat = t.category || "Other";
    incomeBreakdown[cat] = (incomeBreakdown[cat] || 0) + Math.abs(t.amount);
  }

  let totalExpenditure = 0;
  let adminTotal = 0;
  let programTotal = 0;
  const expBreakdown: Record<string, number> = {};

  for (const t of expenses) {
    const amt = Math.abs(t.amount);
    totalExpenditure += amt;
    const sub = t.subcategory || "Other";
    expBreakdown[sub] = (expBreakdown[sub] || 0) + amt;

    if (sub.toLowerCase().includes("admin") || sub.toLowerCase().includes("office")) {
      adminTotal += amt;
    } else {
      programTotal += amt;
    }
  }

  const categoryBreakdownJson = JSON.stringify({
    income: Object.entries(incomeBreakdown).map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount),
    expenditure: Object.entries(expBreakdown).map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount),
  });

  const net = totalIncome - totalExpenditure;
  const programPct = totalExpenditure > 0 ? Math.round((programTotal / totalExpenditure) * 100) : null;
  const adminPct = totalExpenditure > 0 ? Math.round((adminTotal / totalExpenditure) * 100) : null;

  return { totalIncome, totalExpenditure, net, programPct, adminPct, categoryBreakdownJson };
}

export function generatePublicSnapshot(
  actor: FinanceActor,
  opts: {
    fy: number;
    quarter?: "Q1" | "Q2" | "Q3" | "Q4";
    currency: FinanceCurrency;
  }
) {
  ensureFinanceSchema();
  const db = getDb();

  // Define date range (Assuming standard Jul 1 - Jun 30 FY, FY2025 = Jul '24 - Jun '25)
  // Or standard calendar. Let's use calendar for simplicity unless specified.
  // Actually, standard UG NGO FY is often Jul-Jun. Let's do calendar year for simplicity for now,
  // or simple check. We'll use calendar year.
  let fromDate = `${opts.fy}-01-01`;
  let toDate = `${opts.fy}-12-31`;

  if (opts.quarter) {
    if (opts.quarter === "Q1") { fromDate = `${opts.fy}-01-01`; toDate = `${opts.fy}-03-31`; }
    else if (opts.quarter === "Q2") { fromDate = `${opts.fy}-04-01`; toDate = `${opts.fy}-06-30`; }
    else if (opts.quarter === "Q3") { fromDate = `${opts.fy}-07-01`; toDate = `${opts.fy}-09-30`; }
    else if (opts.quarter === "Q4") { fromDate = `${opts.fy}-10-01`; toDate = `${opts.fy}-12-31`; }
  }

  const agg = getAggregatedLedgerData(fromDate, toDate, opts.currency);
  const restrictedSummaryJson = JSON.stringify(getRestrictedFundsSummary(opts.currency));

  let existingId: number | null = null;
  try {
    const ex = db.prepare(`SELECT id FROM finance_public_snapshots WHERE fy = ? AND currency = ? AND coalesce(quarter, '') = ?`).get(opts.fy, opts.currency, opts.quarter || "") as unknown;
    if (ex) existingId = (ex as { id: number }).id;
  } catch (_err) {
    // ignore
  }

  let newId: number;
  if (existingId) {
    db.prepare(`
      UPDATE finance_public_snapshots SET
        status = 'draft',
        total_income = @totalIncome,
        total_expenditure = @totalExpenditure,
        net = @net,
        program_pct = @programPct,
        admin_pct = @adminPct,
        category_breakdown_json = @categoryBreakdownJson,
        restricted_summary_json = @restrictedSummaryJson,
        generated_by_user_id = @generatedByUserId,
        generated_at = @generatedAt
      WHERE id = @id
    `).run({
      id: existingId,
      ...agg,
      restrictedSummaryJson,
      generatedByUserId: actor.userId,
      generatedAt: nowIso(),
    });
    newId = existingId;
  } else {
    const res = db.prepare(`
      INSERT INTO finance_public_snapshots (
        fy, quarter, currency, snapshot_type, status,
        total_income, total_expenditure, net,
        program_pct, admin_pct, category_breakdown_json, restricted_summary_json,
        generated_by_user_id, generated_at
      ) VALUES (
        @fy, @quarter, @currency, @snapshotType, 'draft',
        @totalIncome, @totalExpenditure, @net,
        @programPct, @adminPct, @categoryBreakdownJson, @restrictedSummaryJson,
        @generatedByUserId, @generatedAt
      )
    `).run({
      fy: opts.fy,
      quarter: opts.quarter || null,
      currency: opts.currency,
      snapshotType: opts.quarter ? "quarterly" : "fy",
      ...agg,
      restrictedSummaryJson,
      generatedByUserId: actor.userId,
      generatedAt: nowIso(),
    });
    newId = res.lastInsertRowid as number;
  }

  logFinanceTransparencyAudit(actor, "Generated public snapshot draft", "finance_public_snapshots", newId, `FY ${opts.fy}, Quarter ${opts.quarter || 'N/A'}`);
  return newId;
}

export function publishPublicSnapshot(actor: FinanceActor, snapshotId: number, confirmation: string) {
  ensureFinanceSchema();
  if (confirmation !== "PUBLISH FY SNAPSHOT" && confirmation !== "PUBLISH QUARTERLY SNAPSHOT") {
    throw new Error("Invalid confirmation text.");
  }
  getDb().prepare(`
    UPDATE finance_public_snapshots SET
      status = 'published',
      publish_confirmation = ?,
      published_by_user_id = ?,
      published_at = ?
    WHERE id = ?
  `).run(confirmation, actor.userId, nowIso(), snapshotId);
  logFinanceTransparencyAudit(actor, "Published financial snapshot", "finance_public_snapshots", snapshotId, "");
}

export function archivePublicSnapshot(actor: FinanceActor, snapshotId: number) {
  ensureFinanceSchema();
  getDb().prepare(`
    UPDATE finance_public_snapshots SET
      status = 'archived',
      archived_at = ?
    WHERE id = ?
  `).run(nowIso(), snapshotId);
  logFinanceTransparencyAudit(actor, "Archived financial snapshot", "finance_public_snapshots", snapshotId, "");
}

export function updatePublicSnapshotStorage(snapshotId: number, storedPath: string) {
  ensureFinanceSchema();
  getDb().prepare(`UPDATE finance_public_snapshots SET stored_path = ? WHERE id = ?`).run(storedPath, snapshotId);
}

// Audited Statements
export function listFinanceAuditedStatements(filters?: { publishedOnly?: boolean }) {
  ensureFinanceSchema();
  const where: string[] = [];
  if (filters?.publishedOnly) {
    where.push("status = 'published'");
  }
  const sql = `
    SELECT * FROM finance_audited_statements
    ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY fy DESC, uploaded_at DESC
  `;
  const rows = getDb().prepare(sql).all() as Array<Record<string, unknown>>;
  return rows.map(r => ({
    id: r.id,
    fy: r.fy,
    auditorName: r.auditor_name,
    auditCompletedDate: r.audit_completed_date,
    status: r.status,
    storedPath: r.stored_path,
    originalFilename: r.original_filename,
    notes: r.notes,
    publishConfirmation: r.publish_confirmation,
    publishedAt: r.published_at,
    publishedByUserId: r.published_by_user_id,
    archivedAt: r.archived_at,
    uploadedByUserId: r.uploaded_by_user_id,
    uploadedAt: r.uploaded_at,
  }));
}

export function uploadAuditedStatement(
  actor: FinanceActor,
  opts: {
    fy: number;
    auditorName?: string;
    auditCompletedDate?: string;
    storedPath: string;
    originalFilename: string;
    notes?: string;
  }
) {
  ensureFinanceSchema();
  const res = getDb().prepare(`
    INSERT INTO finance_audited_statements (
      fy, auditor_name, audit_completed_date, status,
      stored_path, original_filename, notes,
      uploaded_by_user_id, uploaded_at
    ) VALUES (
      @fy, @auditorName, @auditCompletedDate, 'private_uploaded',
      @storedPath, @originalFilename, @notes,
      @uploadedByUserId, @uploadedAt
    )
  `).run({
    fy: opts.fy,
    auditorName: opts.auditorName || null,
    auditCompletedDate: opts.auditCompletedDate || null,
    storedPath: opts.storedPath,
    originalFilename: opts.originalFilename,
    notes: opts.notes || null,
    uploadedByUserId: actor.userId,
    uploadedAt: nowIso(),
  });
  logFinanceTransparencyAudit(actor, "Uploaded audited statement", "finance_audited_statements", res.lastInsertRowid as number, "");
  return res.lastInsertRowid as number;
}

export function publishAuditedStatement(actor: FinanceActor, statementId: number, confirmation: string) {
  ensureFinanceSchema();
  if (confirmation !== "PUBLISH AUDITED STATEMENTS") {
    throw new Error("Invalid confirmation text.");
  }
  getDb().prepare(`
    UPDATE finance_audited_statements SET
      status = 'published',
      publish_confirmation = ?,
      published_by_user_id = ?,
      published_at = ?
    WHERE id = ?
  `).run(confirmation, actor.userId, nowIso(), statementId);
  logFinanceTransparencyAudit(actor, "Published audited statement", "finance_audited_statements", statementId, "");
}

export function archiveAuditedStatement(actor: FinanceActor, statementId: number) {
  ensureFinanceSchema();
  getDb().prepare(`
    UPDATE finance_audited_statements SET
      status = 'archived',
      archived_at = ?
    WHERE id = ?
  `).run(nowIso(), statementId);
  logFinanceTransparencyAudit(actor, "Archived audited statement", "finance_audited_statements", statementId, "");
}
