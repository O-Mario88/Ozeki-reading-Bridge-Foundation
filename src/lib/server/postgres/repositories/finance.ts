import crypto from "node:crypto";
import { createFinanceIncomeBreakdownZero, FINANCE_INCOME_CATEGORIES, normalizeFinanceIncomeCategory } from "@/lib/finance-categories";
import { getDefaultFinanceFromEmail, resolveFinanceFromEmail } from "@/lib/finance-email";
import { queryPostgres } from "@/lib/server/postgres/client";
import type {
  FinanceAuditComplianceCheckRecord,
  FinanceAuditExceptionRecord,
  FinanceBudgetMonthlyRecord,
  FinanceCategory,
  FinanceContactRecord,
  FinanceCurrency,
  FinanceDashboardSummary,
  FinanceEmailLogEntry,
  FinanceExpenseRecord,
  FinanceExpenseReceiptRecord,
  FinanceExpenseStatus,
  FinanceFileRecord,
  FinanceInvoiceLineItemRecord,
  FinanceInvoiceRecord,
  FinanceMonthlyStatementRecord,
  FinancePostedStatus,
  FinanceReceiptRecord,
  FinanceReceiptRegistryRecord,
  FinanceRestrictedBalanceLine,
  FinanceSettingsRecord,
  FinanceStatementAccountType,
  FinanceStatementLineRecord,
  FinanceTransactionSourceType,
  FinanceLedgerTransactionRecord,
  FinanceTxnRiskScoreRecord,
} from "@/lib/types";

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

const DEFAULT_PAYMENT_INSTRUCTIONS = [
  "Payments can be made via bank transfer or mobile money.",
  "Bank Name: Equity Bank.",
  "Account Number: 1007203565985.",
  "Account Name: Ozeki Reading Bridge Foundation.",
  "Contact support@ozekiread.org for account details.",
].join(" ");

const DEFAULT_AUDIT_SETTINGS = {
  cashThresholdUgx: 2_000_000,
  cashThresholdUsd: 500,
  backdateDaysLimit: 30,
  allowReceiptMismatchOverride: true,
  allowReceiptReuseOverride: false,
  outlierMultiplier: 3,
} as const;

const FINANCE_FILE_SECRET =
  process.env.FINANCE_FILE_SIGNING_SECRET ||
  process.env.PORTAL_PASSWORD_SALT ||
  "orbf-finance-files-secret";

type FinanceStatementPeriodType = "monthly" | "quarterly" | "fiscal_year";

export type FinanceInvoiceFilters = {
  status?: FinanceInvoiceRecord["status"];
  category?: Exclude<FinanceCategory, "Expense">;
  fromDate?: string;
  toDate?: string;
};

export type FinanceReceiptFilters = {
  status?: FinanceReceiptRecord["status"];
  category?: Exclude<FinanceCategory, "Expense">;
  fromDate?: string;
  toDate?: string;
};

export type FinanceExpenseFilters = {
  status?: FinanceExpenseStatus;
  fromDate?: string;
  toDate?: string;
  subcategory?: string;
};

export type FinanceLedgerFilters = {
  txnType?: FinanceLedgerTransactionRecord["txnType"];
  category?: FinanceCategory;
  postedStatus?: FinancePostedStatus;
  fromDate?: string;
  toDate?: string;
};

export type FinanceAuditExceptionFilters = {
  month?: string;
  entityType?: FinanceAuditExceptionRecord["entityType"];
  severity?: FinanceAuditExceptionRecord["severity"];
  status?: FinanceAuditExceptionRecord["status"];
  ruleCode?: string;
  category?: FinanceCategory;
  subcategory?: string;
  paymentMethod?: FinanceExpenseRecord["paymentMethod"];
  currency?: FinanceCurrency;
  createdBy?: number;
};

function normalizeCurrency(value: string | undefined | null): FinanceCurrency {
  return String(value || "").toUpperCase() === "USD" ? "USD" : "UGX";
}

function normalizeStatementPeriodType(value: string | undefined | null): FinanceStatementPeriodType {
  if (value === "quarterly" || value === "fiscal_year") {
    return value;
  }
  return "monthly";
}

function normalizeNumber(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100) / 100;
}

function normalizeInteger(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(numeric));
}

function toBooleanFlag(value: unknown, fallback = false) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  const text = String(value).trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
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

function getSignedFinanceFileUrl(fileId: number, expiresInSeconds = 60 * 60) {
  const expires = Math.floor(Date.now() / 1000) + Math.max(60, expiresInSeconds);
  const payload = `${fileId}:${expires}`;
  const signature = crypto.createHmac("sha256", FINANCE_FILE_SECRET).update(payload).digest("hex");
  return `/api/portal/finance/files/${fileId}?expires=${expires}&sig=${signature}`;
}

function getMonthWindow(month: string) {
  const safe = /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const from = `${safe}-01`;
  const [yearRaw, monthRaw] = safe.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw);
  const nextMonth = monthIndex === 12 ? `${year + 1}-01` : `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return {
    month: safe,
    from,
    to: `${nextMonth}-01`,
  };
}

function mapFinanceFileRecord(row: Record<string, unknown>): FinanceFileRecord {
  const id = Number(row.id);
  return {
    id,
    sourceType: String(row.sourceType ?? "payment_evidence") as FinanceFileRecord["sourceType"],
    sourceId: Number(row.sourceId ?? 0),
    fileName: String(row.fileName ?? ""),
    storedPath: String(row.storedPath ?? ""),
    mimeType: String(row.mimeType ?? "application/octet-stream"),
    sizeBytes: Number(row.sizeBytes ?? 0),
    uploadedBy: Number(row.uploadedBy ?? 0),
    createdAt: String(row.createdAt ?? new Date(0).toISOString()),
    signedUrl: getSignedFinanceFileUrl(id),
  };
}

export async function getFinanceFileByIdPostgres(fileId: number): Promise<FinanceFileRecord> {
  const result = await queryPostgres(
    `
      SELECT
        id,
        source_type AS "sourceType",
        source_id AS "sourceId",
        file_name AS "fileName",
        stored_path AS "storedPath",
        mime_type AS "mimeType",
        size_bytes AS "sizeBytes",
        uploaded_by_user_id AS "uploadedBy",
        created_at AS "createdAt"
      FROM finance_files
      WHERE id = $1
      LIMIT 1
    `,
    [fileId],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error("File not found.");
  }
  return mapFinanceFileRecord(row);
}

export async function listFinanceFilesBySourcePostgres(
  sourceType: string,
  sourceId: number,
): Promise<FinanceFileRecord[]> {
  const result = await queryPostgres(
    `
      SELECT
        id,
        source_type AS "sourceType",
        source_id AS "sourceId",
        file_name AS "fileName",
        stored_path AS "storedPath",
        mime_type AS "mimeType",
        size_bytes AS "sizeBytes",
        uploaded_by_user_id AS "uploadedBy",
        created_at AS "createdAt"
      FROM finance_files
      WHERE source_type = $1
        AND source_id = $2
      ORDER BY id DESC
    `,
    [sourceType, sourceId],
  );
  return result.rows.map((row) => mapFinanceFileRecord(row as Record<string, unknown>));
}

function mapFinanceContactRecord(row: Record<string, unknown>): FinanceContactRecord {
  return {
    id: Number(row.id ?? 0),
    name: String(row.name ?? ""),
    emails: parseJsonArray(String(row.emailsJson ?? "[]")),
    phone: row.phone ? String(row.phone) : undefined,
    address: row.address ? String(row.address) : undefined,
    contactType: String(row.contactType ?? "other") as FinanceContactRecord["contactType"],
    createdAt: String(row.createdAt ?? new Date(0).toISOString()),
  };
}

export async function listFinanceContactsPostgres() {
  const result = await queryPostgres(
    `
      SELECT
        id,
        name,
        emails_json AS "emailsJson",
        phone,
        address,
        contact_type AS "contactType",
        created_at AS "createdAt"
      FROM finance_contacts
      ORDER BY created_at DESC
    `,
  );
  return result.rows.map((row) => mapFinanceContactRecord(row as Record<string, unknown>));
}

export async function getFinanceSettingsPostgres(): Promise<FinanceSettingsRecord> {
  const result = await queryPostgres(
    `
      SELECT
        from_email AS "fromEmail",
        cc_finance_email AS "ccFinanceEmail",
        invoice_prefix AS "invoicePrefix",
        receipt_prefix AS "receiptPrefix",
        expense_prefix AS "expensePrefix",
        subcategories_json AS "subcategoriesJson",
        invoice_email_template AS "invoiceEmailTemplate",
        receipt_email_template AS "receiptEmailTemplate",
        payment_instructions AS "paymentInstructions",
        cash_threshold_ugx AS "cashThresholdUgx",
        cash_threshold_usd AS "cashThresholdUsd",
        backdate_days_limit AS "backdateDaysLimit",
        allow_receipt_mismatch_override AS "allowReceiptMismatchOverride",
        allow_receipt_reuse_override AS "allowReceiptReuseOverride",
        outlier_multiplier AS "outlierMultiplier"
      FROM finance_settings
      WHERE id = 1
      LIMIT 1
    `,
  );

  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    return {
      fromEmail: resolveFinanceFromEmail(getDefaultFinanceFromEmail()),
      ccFinanceEmail: null,
      invoicePrefix: "INV",
      receiptPrefix: "RCT",
      expensePrefix: "EXP",
      categorySubcategories: { ...DEFAULT_CATEGORY_SUBCATEGORIES },
      invoiceEmailTemplate: DEFAULT_INVOICE_TEMPLATE,
      receiptEmailTemplate: DEFAULT_RECEIPT_TEMPLATE,
      paymentInstructions: DEFAULT_PAYMENT_INSTRUCTIONS,
      cashThresholdUgx: DEFAULT_AUDIT_SETTINGS.cashThresholdUgx,
      cashThresholdUsd: DEFAULT_AUDIT_SETTINGS.cashThresholdUsd,
      backdateDaysLimit: DEFAULT_AUDIT_SETTINGS.backdateDaysLimit,
      allowReceiptMismatchOverride: DEFAULT_AUDIT_SETTINGS.allowReceiptMismatchOverride,
      allowReceiptReuseOverride: DEFAULT_AUDIT_SETTINGS.allowReceiptReuseOverride,
      outlierMultiplier: DEFAULT_AUDIT_SETTINGS.outlierMultiplier,
    };
  }

  let categorySubcategories: Record<string, string[]> = { ...DEFAULT_CATEGORY_SUBCATEGORIES };
  try {
    const parsed = JSON.parse(String(row.subcategoriesJson ?? "{}")) as Record<string, unknown>;
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
    fromEmail: row.fromEmail ? String(row.fromEmail) : resolveFinanceFromEmail(getDefaultFinanceFromEmail()),
    ccFinanceEmail: row.ccFinanceEmail ? String(row.ccFinanceEmail) : null,
    invoicePrefix: String(row.invoicePrefix ?? "INV"),
    receiptPrefix: String(row.receiptPrefix ?? "RCT"),
    expensePrefix: String(row.expensePrefix ?? "EXP"),
    categorySubcategories,
    invoiceEmailTemplate: String(row.invoiceEmailTemplate ?? DEFAULT_INVOICE_TEMPLATE),
    receiptEmailTemplate: String(row.receiptEmailTemplate ?? DEFAULT_RECEIPT_TEMPLATE),
    paymentInstructions: String(row.paymentInstructions ?? DEFAULT_PAYMENT_INSTRUCTIONS),
    cashThresholdUgx: normalizeNumber(row.cashThresholdUgx ?? DEFAULT_AUDIT_SETTINGS.cashThresholdUgx),
    cashThresholdUsd: normalizeNumber(row.cashThresholdUsd ?? DEFAULT_AUDIT_SETTINGS.cashThresholdUsd),
    backdateDaysLimit: normalizeInteger(
      row.backdateDaysLimit,
      DEFAULT_AUDIT_SETTINGS.backdateDaysLimit,
    ),
    allowReceiptMismatchOverride: toBooleanFlag(
      row.allowReceiptMismatchOverride,
      DEFAULT_AUDIT_SETTINGS.allowReceiptMismatchOverride,
    ),
    allowReceiptReuseOverride: toBooleanFlag(
      row.allowReceiptReuseOverride,
      DEFAULT_AUDIT_SETTINGS.allowReceiptReuseOverride,
    ),
    outlierMultiplier:
      Number(row.outlierMultiplier ?? DEFAULT_AUDIT_SETTINGS.outlierMultiplier) > 0
        ? Number(row.outlierMultiplier)
        : DEFAULT_AUDIT_SETTINGS.outlierMultiplier,
  };
}

type InvoiceRow = Record<string, unknown> & {
  id: number;
  invoiceNumber: string;
  contactId: number;
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
  pdfFileId: number | null;
  emailedAt: string | null;
  lastSentTo: string | null;
  voidReason: string | null;
  createdBy: number;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

type ReceiptRow = Record<string, unknown> & {
  id: number;
  receiptNumber: string;
  contactId: number;
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
  pdfFileId: number | null;
  emailedAt: string | null;
  lastSentTo: string | null;
  voidReason: string | null;
  createdBy: number;
  createdByName: string | null;
  createdAt: string;
};

const INVOICE_SELECT = `
  SELECT
    i.id,
    i.invoice_number AS "invoiceNumber",
    i.contact_id AS "contactId",
    COALESCE(i.display_category, CASE WHEN i.category = 'Donations' THEN 'Donation' ELSE i.category END) AS category,
    i.issue_date AS "issueDate",
    i.due_date AS "dueDate",
    i.currency,
    i.subtotal,
    i.tax,
    i.total,
    i.paid_amount AS "paidAmount",
    i.balance_due AS "balanceDue",
    i.status,
    i.notes,
    i.pdf_file_id AS "pdfFileId",
    i.emailed_at AS "emailedAt",
    i.last_sent_to AS "lastSentTo",
    i.void_reason AS "voidReason",
    i.created_by_user_id AS "createdBy",
    u.full_name AS "createdByName",
    i.created_at AS "createdAt",
    i.updated_at AS "updatedAt"
  FROM finance_invoices i
  JOIN finance_contacts c ON c.id = i.contact_id
  JOIN portal_users u ON u.id = i.created_by_user_id
`;

async function listInvoiceLineItemsByInvoiceIds(
  invoiceIds: number[],
): Promise<Map<number, FinanceInvoiceLineItemRecord[]>> {
  if (invoiceIds.length === 0) {
    return new Map();
  }
  const result = await queryPostgres(
    `
      SELECT
        id,
        invoice_id AS "invoiceId",
        description,
        qty,
        unit_price AS "unitPrice",
        amount
      FROM finance_invoice_items
      WHERE invoice_id = ANY($1::int[])
      ORDER BY invoice_id ASC, id ASC
    `,
    [invoiceIds],
  );
  const itemMap = new Map<number, FinanceInvoiceLineItemRecord[]>();
  for (const row of result.rows as Array<Record<string, unknown>>) {
    const invoiceId = Number(row.invoiceId ?? 0);
    const items = itemMap.get(invoiceId) ?? [];
    items.push({
      id: Number(row.id ?? 0),
      description: String(row.description ?? ""),
      qty: normalizeNumber(row.qty),
      unitPrice: normalizeNumber(row.unitPrice),
      amount: normalizeNumber(row.amount),
    });
    itemMap.set(invoiceId, items);
  }
  return itemMap;
}

async function listLatestLinkedReceiptsByInvoiceIds(
  invoiceIds: number[],
): Promise<Map<number, FinanceInvoiceRecord["linkedReceipt"]>> {
  if (invoiceIds.length === 0) {
    return new Map();
  }
  const result = await queryPostgres(
    `
      SELECT DISTINCT ON (related_invoice_id)
        related_invoice_id AS "invoiceId",
        id,
        receipt_number AS "receiptNumber",
        status,
        amount_received AS "amountReceived",
        receipt_date AS "receiptDate",
        pdf_file_id AS "pdfFileId",
        emailed_at AS "emailedAt",
        last_sent_to AS "lastSentTo"
      FROM finance_receipts
      WHERE related_invoice_id = ANY($1::int[])
        AND status != 'void'
      ORDER BY related_invoice_id, CASE WHEN status = 'issued' THEN 0 ELSE 1 END, created_at DESC
    `,
    [invoiceIds],
  );
  const receiptMap = new Map<number, FinanceInvoiceRecord["linkedReceipt"]>();
  for (const row of result.rows as Array<Record<string, unknown>>) {
    const pdfFileId = row.pdfFileId === null || row.pdfFileId === undefined ? undefined : Number(row.pdfFileId);
    receiptMap.set(Number(row.invoiceId ?? 0), {
      id: Number(row.id ?? 0),
      receiptNumber: String(row.receiptNumber ?? ""),
      status: String(row.status ?? "draft") as FinanceReceiptRecord["status"],
      amountReceived: normalizeNumber(row.amountReceived),
      receiptDate: String(row.receiptDate ?? ""),
      pdfFileId,
      pdfUrl: pdfFileId ? getSignedFinanceFileUrl(pdfFileId) : undefined,
      emailedAt: row.emailedAt ? String(row.emailedAt) : undefined,
      lastSentTo: row.lastSentTo ? String(row.lastSentTo) : undefined,
    });
  }
  return receiptMap;
}

function mapFinanceInvoiceRecord(
  row: InvoiceRow,
  lineItems: FinanceInvoiceLineItemRecord[],
  linkedReceipt: FinanceInvoiceRecord["linkedReceipt"],
): FinanceInvoiceRecord {
  const pdfFileId = row.pdfFileId === null || row.pdfFileId === undefined ? undefined : Number(row.pdfFileId);
  return {
    id: Number(row.id),
    invoiceNumber: String(row.invoiceNumber),
    contactId: Number(row.contactId),
    category: normalizeFinanceIncomeCategory(String(row.category)),
    issueDate: String(row.issueDate),
    dueDate: String(row.dueDate),
    currency: normalizeCurrency(row.currency),
    lineItems,
    subtotal: normalizeNumber(row.subtotal),
    tax: normalizeNumber(row.tax),
    total: normalizeNumber(row.total),
    paidAmount: normalizeNumber(row.paidAmount),
    balanceDue: normalizeNumber(row.balanceDue),
    status: String(row.status) as FinanceInvoiceRecord["status"],
    notes: row.notes ? String(row.notes) : undefined,
    pdfFileId,
    pdfUrl: pdfFileId ? getSignedFinanceFileUrl(pdfFileId) : undefined,
    emailedAt: row.emailedAt ? String(row.emailedAt) : undefined,
    lastSentTo: row.lastSentTo ? String(row.lastSentTo) : undefined,
    voidReason: row.voidReason ? String(row.voidReason) : undefined,
    createdBy: Number(row.createdBy),
    createdByName: row.createdByName ? String(row.createdByName) : undefined,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    linkedReceipt,
  };
}

export async function listFinanceInvoicesPostgres(filters: FinanceInvoiceFilters = {}) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    params.push(filters.status);
    clauses.push(`i.status = $${params.length}`);
  }
  if (filters.category) {
    params.push(normalizeFinanceIncomeCategory(filters.category));
    clauses.push(
      `COALESCE(i.display_category, CASE WHEN i.category = 'Donations' THEN 'Donation' ELSE i.category END) = $${params.length}`,
    );
  }
  if (filters.fromDate) {
    params.push(filters.fromDate);
    clauses.push(`i.issue_date >= $${params.length}`);
  }
  if (filters.toDate) {
    params.push(filters.toDate);
    clauses.push(`i.issue_date <= $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(`${INVOICE_SELECT} ${whereClause} ORDER BY i.created_at DESC`, params);
  const rows = result.rows as InvoiceRow[];
  const invoiceIds = rows.map((row) => Number(row.id));
  const [itemMap, linkedReceiptMap] = await Promise.all([
    listInvoiceLineItemsByInvoiceIds(invoiceIds),
    listLatestLinkedReceiptsByInvoiceIds(invoiceIds),
  ]);
  return rows.map((row) =>
    mapFinanceInvoiceRecord(row, itemMap.get(Number(row.id)) ?? [], linkedReceiptMap.get(Number(row.id))),
  );
}

export async function getFinanceInvoiceByIdPostgres(invoiceId: number) {
  const result = await queryPostgres(`${INVOICE_SELECT} WHERE i.id = $1 LIMIT 1`, [invoiceId]);
  const row = result.rows[0] as InvoiceRow | undefined;
  if (!row) {
    return null;
  }
  const [itemMap, linkedReceiptMap] = await Promise.all([
    listInvoiceLineItemsByInvoiceIds([invoiceId]),
    listLatestLinkedReceiptsByInvoiceIds([invoiceId]),
  ]);
  return mapFinanceInvoiceRecord(row, itemMap.get(invoiceId) ?? [], linkedReceiptMap.get(invoiceId));
}

const RECEIPT_SELECT = `
  SELECT
    r.id,
    r.receipt_number AS "receiptNumber",
    r.contact_id AS "contactId",
    COALESCE(r.display_category, CASE WHEN r.category = 'Donations' THEN 'Donation' ELSE r.category END) AS category,
    r.received_from AS "receivedFrom",
    r.receipt_date AS "receiptDate",
    r.currency,
    r.amount_received AS "amountReceived",
    r.payment_method AS "paymentMethod",
    r.reference_no AS "referenceNo",
    r.related_invoice_id AS "relatedInvoiceId",
    r.description,
    r.notes,
    r.status,
    r.pdf_file_id AS "pdfFileId",
    r.emailed_at AS "emailedAt",
    r.last_sent_to AS "lastSentTo",
    r.void_reason AS "voidReason",
    r.created_by_user_id AS "createdBy",
    u.full_name AS "createdByName",
    r.created_at AS "createdAt"
  FROM finance_receipts r
  JOIN portal_users u ON u.id = r.created_by_user_id
`;

function mapFinanceReceiptRecord(row: ReceiptRow): FinanceReceiptRecord {
  const pdfFileId = row.pdfFileId === null || row.pdfFileId === undefined ? undefined : Number(row.pdfFileId);
  return {
    id: Number(row.id),
    receiptNumber: String(row.receiptNumber),
    contactId: Number(row.contactId),
    category: normalizeFinanceIncomeCategory(String(row.category)),
    receivedFrom: String(row.receivedFrom),
    receiptDate: String(row.receiptDate),
    currency: normalizeCurrency(row.currency),
    amountReceived: normalizeNumber(row.amountReceived),
    paymentMethod: String(row.paymentMethod) as FinanceReceiptRecord["paymentMethod"],
    referenceNo: row.referenceNo ? String(row.referenceNo) : undefined,
    relatedInvoiceId:
      row.relatedInvoiceId === null || row.relatedInvoiceId === undefined
        ? undefined
        : Number(row.relatedInvoiceId),
    description: row.description ? String(row.description) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    status: String(row.status) as FinanceReceiptRecord["status"],
    pdfFileId,
    pdfUrl: pdfFileId ? getSignedFinanceFileUrl(pdfFileId) : undefined,
    emailedAt: row.emailedAt ? String(row.emailedAt) : undefined,
    lastSentTo: row.lastSentTo ? String(row.lastSentTo) : undefined,
    voidReason: row.voidReason ? String(row.voidReason) : undefined,
    createdBy: Number(row.createdBy),
    createdByName: row.createdByName ? String(row.createdByName) : undefined,
    createdAt: String(row.createdAt),
  };
}

export async function listFinanceReceiptsPostgres(filters: FinanceReceiptFilters = {}) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    params.push(filters.status);
    clauses.push(`r.status = $${params.length}`);
  }
  if (filters.category) {
    params.push(normalizeFinanceIncomeCategory(filters.category));
    clauses.push(
      `COALESCE(r.display_category, CASE WHEN r.category = 'Donations' THEN 'Donation' ELSE r.category END) = $${params.length}`,
    );
  }
  if (filters.fromDate) {
    params.push(filters.fromDate);
    clauses.push(`r.receipt_date >= $${params.length}`);
  }
  if (filters.toDate) {
    params.push(filters.toDate);
    clauses.push(`r.receipt_date <= $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(`${RECEIPT_SELECT} ${whereClause} ORDER BY r.created_at DESC`, params);
  return (result.rows as ReceiptRow[]).map((row) => mapFinanceReceiptRecord(row));
}

export async function getFinanceReceiptByIdPostgres(receiptId: number) {
  const result = await queryPostgres(`${RECEIPT_SELECT} WHERE r.id = $1 LIMIT 1`, [receiptId]);
  const row = result.rows[0] as ReceiptRow | undefined;
  return row ? mapFinanceReceiptRecord(row) : null;
}

type ExpenseRow = Record<string, unknown> & {
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
  submittedAt: string | null;
  submittedBy: number | null;
  submittedByName: string | null;
  postedAt: string | null;
  postedBy: number | null;
  postedByName: string | null;
  mismatchOverrideReason: string | null;
  mismatchOverrideBy: number | null;
  mismatchOverrideByName: string | null;
  mismatchOverrideAt: string | null;
  createdBy: number;
  createdByName: string | null;
  createdAt: string;
};

const EXPENSE_SELECT = `
  SELECT
    e.id,
    e.expense_number AS "expenseNumber",
    e.vendor_name AS "vendorName",
    e.date,
    e.subcategory,
    e.amount,
    e.currency,
    e.payment_method AS "paymentMethod",
    e.description,
    e.notes,
    e.status,
    e.void_reason AS "voidReason",
    e.submitted_at AS "submittedAt",
    e.submitted_by_user_id AS "submittedBy",
    su.full_name AS "submittedByName",
    e.posted_at AS "postedAt",
    e.posted_by_user_id AS "postedBy",
    pu.full_name AS "postedByName",
    e.mismatch_override_reason AS "mismatchOverrideReason",
    e.mismatch_override_by AS "mismatchOverrideBy",
    mu.full_name AS "mismatchOverrideByName",
    e.mismatch_override_at AS "mismatchOverrideAt",
    e.created_by_user_id AS "createdBy",
    cu.full_name AS "createdByName",
    e.created_at AS "createdAt"
  FROM finance_expenses e
  JOIN portal_users cu ON cu.id = e.created_by_user_id
  LEFT JOIN portal_users su ON su.id = e.submitted_by_user_id
  LEFT JOIN portal_users pu ON pu.id = e.posted_by_user_id
  LEFT JOIN portal_users mu ON mu.id = e.mismatch_override_by
`;

function mapFinanceExpenseRecord(row: ExpenseRow): FinanceExpenseRecord {
  return {
    id: Number(row.id),
    expenseNumber: String(row.expenseNumber),
    vendorName: String(row.vendorName),
    date: String(row.date),
    category: "Expense",
    subcategory: row.subcategory ? String(row.subcategory) : undefined,
    amount: normalizeNumber(row.amount),
    currency: normalizeCurrency(row.currency),
    paymentMethod: String(row.paymentMethod) as FinanceExpenseRecord["paymentMethod"],
    description: String(row.description),
    notes: row.notes ? String(row.notes) : undefined,
    status: String(row.status) as FinanceExpenseStatus,
    voidReason: row.voidReason ? String(row.voidReason) : undefined,
    submittedAt: row.submittedAt ? String(row.submittedAt) : undefined,
    submittedBy: row.submittedBy === null || row.submittedBy === undefined ? undefined : Number(row.submittedBy),
    submittedByName: row.submittedByName ? String(row.submittedByName) : undefined,
    postedAt: row.postedAt ? String(row.postedAt) : undefined,
    postedBy: row.postedBy === null || row.postedBy === undefined ? undefined : Number(row.postedBy),
    postedByName: row.postedByName ? String(row.postedByName) : undefined,
    mismatchOverrideReason: row.mismatchOverrideReason ? String(row.mismatchOverrideReason) : undefined,
    mismatchOverrideBy:
      row.mismatchOverrideBy === null || row.mismatchOverrideBy === undefined
        ? undefined
        : Number(row.mismatchOverrideBy),
    mismatchOverrideByName: row.mismatchOverrideByName ? String(row.mismatchOverrideByName) : undefined,
    mismatchOverrideAt: row.mismatchOverrideAt ? String(row.mismatchOverrideAt) : undefined,
    createdBy: Number(row.createdBy),
    createdByName: row.createdByName ? String(row.createdByName) : undefined,
    createdAt: String(row.createdAt),
  };
}

export async function listFinanceExpensesPostgres(filters: FinanceExpenseFilters = {}) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    params.push(filters.status);
    clauses.push(`e.status = $${params.length}`);
  }
  if (filters.subcategory) {
    params.push(filters.subcategory);
    clauses.push(`e.subcategory = $${params.length}`);
  }
  if (filters.fromDate) {
    params.push(filters.fromDate);
    clauses.push(`e.date >= $${params.length}`);
  }
  if (filters.toDate) {
    params.push(filters.toDate);
    clauses.push(`e.date <= $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(`${EXPENSE_SELECT} ${whereClause} ORDER BY e.created_at DESC`, params);
  return (result.rows as ExpenseRow[]).map((row) => mapFinanceExpenseRecord(row));
}

export async function getFinanceExpenseByIdPostgres(expenseId: number) {
  const result = await queryPostgres(`${EXPENSE_SELECT} WHERE e.id = $1 LIMIT 1`, [expenseId]);
  const row = result.rows[0] as ExpenseRow | undefined;
  return row ? mapFinanceExpenseRecord(row) : null;
}

export async function submitFinanceExpensePostgres(expenseId: number, actor: { id?: number; userId?: number; fullName?: string; userName?: string; role?: string }): Promise<FinanceExpenseRecord> {
  const current = await getFinanceExpenseByIdPostgres(expenseId);
  if (!current) {
    throw new Error("Expense not found.");
  }
  
  // Create a modified copy of the record with submitted status
  return {
    ...current,
    status: "submitted",
    submittedAt: new Date().toISOString(),
    submittedBy: actor.id ?? actor.userId,
  };
}

export async function listFinanceExpenseReceiptsPostgres(expenseId?: number) {
  const params: unknown[] = [];
  const whereClause = Number.isFinite(expenseId)
    ? (() => {
      params.push(Number(expenseId));
      return `WHERE er.expense_id = $${params.length}`;
    })()
    : "";
  const result = await queryPostgres(
    `
      SELECT
        er.id,
        er.expense_id AS "expenseId",
        er.file_id AS "fileId",
        er.file_hash_sha256 AS "fileHashSha256",
        er.vendor_name AS "vendorName",
        er.receipt_date AS "receiptDate",
        er.receipt_amount AS "receiptAmount",
        er.currency,
        er.reference_no AS "referenceNo",
        er.uploaded_by_user_id AS "uploadedBy",
        u.full_name AS "uploadedByName",
        er.uploaded_at AS "uploadedAt",
        f.file_name AS "fileName"
      FROM finance_expense_receipts er
      JOIN portal_users u ON u.id = er.uploaded_by_user_id
      LEFT JOIN finance_files f ON f.id = er.file_id
      ${whereClause}
      ORDER BY er.uploaded_at DESC, er.id DESC
    `,
    params,
  );
  return result.rows.map((row) => {
    const record = row as Record<string, unknown>;
    const fileId = Number(record.fileId ?? 0);
    return {
      id: Number(record.id ?? 0),
      expenseId: Number(record.expenseId ?? 0),
      fileId,
      fileUrl: getSignedFinanceFileUrl(fileId),
      fileName: record.fileName ? String(record.fileName) : undefined,
      fileHashSha256: String(record.fileHashSha256 ?? ""),
      vendorName: String(record.vendorName ?? ""),
      receiptDate: String(record.receiptDate ?? ""),
      receiptAmount: normalizeNumber(record.receiptAmount),
      currency: normalizeCurrency(String(record.currency ?? "UGX")),
      referenceNo: record.referenceNo ? String(record.referenceNo) : undefined,
      uploadedBy: Number(record.uploadedBy ?? 0),
      uploadedByName: record.uploadedByName ? String(record.uploadedByName) : undefined,
      uploadedAt: String(record.uploadedAt ?? new Date(0).toISOString()),
    } satisfies FinanceExpenseReceiptRecord;
  });
}

export async function listFinanceLedgerTransactionsPostgres(filters: FinanceLedgerFilters = {}) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.txnType) {
    params.push(filters.txnType);
    clauses.push(`l.txn_type = $${params.length}`);
  }
  if (filters.category) {
    params.push(filters.category);
    clauses.push(
      `COALESCE(l.display_category, CASE WHEN l.category = 'Donations' THEN 'Donation' ELSE l.category END) = $${params.length}`,
    );
  }
  if (filters.postedStatus) {
    params.push(filters.postedStatus);
    clauses.push(`l.posted_status = $${params.length}`);
  }
  if (filters.fromDate) {
    params.push(filters.fromDate);
    clauses.push(`l.date >= $${params.length}`);
  }
  if (filters.toDate) {
    params.push(filters.toDate);
    clauses.push(`l.date <= $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `
      SELECT
        l.id,
        l.txn_type AS "txnType",
        COALESCE(l.display_category, CASE WHEN l.category = 'Donations' THEN 'Donation' ELSE l.category END) AS category,
        l.subcategory,
        l.date,
        l.currency,
        l.amount,
        l.counterparty_contact_id AS "counterpartyContactId",
        c.name AS "counterpartyName",
        l.source_type AS "sourceType",
        l.source_id AS "sourceId",
        l.notes,
        l.evidence_file_ids_json AS "evidenceFileIdsJson",
        l.posted_status AS "postedStatus",
        l.posted_at AS "postedAt",
        l.void_reason AS "voidReason",
        l.created_by_user_id AS "createdBy",
        u.full_name AS "createdByName",
        l.created_at AS "createdAt"
      FROM finance_transactions_ledger l
      LEFT JOIN finance_contacts c ON c.id = l.counterparty_contact_id
      JOIN portal_users u ON u.id = l.created_by_user_id
      ${whereClause}
      ORDER BY l.date DESC, l.id DESC
    `,
    params,
  );

  return Promise.all(
    result.rows.map(async (row) => {
      const record = row as Record<string, unknown>;
      const directFileIds = parseJsonArray(String(record.evidenceFileIdsJson ?? "[]"))
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item));

      const resolvedEvidenceFiles = await Promise.all(
        directFileIds.map(async (fileId) => {
          try {
            return await getFinanceFileByIdPostgres(fileId);
          } catch {
            return null;
          }
        }),
      );
      let evidenceFiles: FinanceFileRecord[] = resolvedEvidenceFiles.filter(
        (item): item is FinanceFileRecord => Boolean(item),
      );

      if (evidenceFiles.length === 0) {
        const sourceType = String(record.sourceType ?? "");
        const sourceId = Number(record.sourceId ?? 0);
        if (sourceType === "invoice_payment") {
          evidenceFiles = await listFinanceFilesBySourcePostgres("payment_evidence", sourceId);
        } else if (sourceType === "expense") {
          evidenceFiles = await listFinanceFilesBySourcePostgres("expense", sourceId);
        }
      }

      return {
        id: Number(record.id ?? 0),
        txnType: String(record.txnType ?? "money_in") as FinanceLedgerTransactionRecord["txnType"],
        category:
          String(record.category ?? "Expense") === "Expense"
            ? "Expense"
            : normalizeFinanceIncomeCategory(String(record.category ?? "Donation")),
        subcategory: record.subcategory ? String(record.subcategory) : undefined,
        date: String(record.date ?? ""),
        currency: normalizeCurrency(String(record.currency ?? "UGX")),
        amount: normalizeNumber(record.amount),
        counterpartyContactId:
          record.counterpartyContactId === null || record.counterpartyContactId === undefined
            ? undefined
            : Number(record.counterpartyContactId),
        counterpartyName: record.counterpartyName ? String(record.counterpartyName) : undefined,
        sourceType: String(record.sourceType ?? "receipt") as FinanceTransactionSourceType,
        sourceId: Number(record.sourceId ?? 0),
        notes: record.notes ? String(record.notes) : undefined,
        evidenceFiles,
        postedStatus: String(record.postedStatus ?? "posted") as FinancePostedStatus,
        postedAt: record.postedAt ? String(record.postedAt) : undefined,
        voidReason: record.voidReason ? String(record.voidReason) : undefined,
        createdBy: Number(record.createdBy ?? 0),
        createdByName: record.createdByName ? String(record.createdByName) : undefined,
        createdAt: String(record.createdAt ?? new Date(0).toISOString()),
      } satisfies FinanceLedgerTransactionRecord;
    }),
  );
}

export async function getFinanceDashboardSummaryPostgres(
  month = new Date().toISOString().slice(0, 7),
  currency: FinanceCurrency = "UGX",
): Promise<FinanceDashboardSummary> {
  const window = getMonthWindow(month);
  const totalsResult = await queryPostgres(
    `
      SELECT
        COALESCE(SUM(CASE WHEN txn_type = 'money_in' THEN amount ELSE 0 END), 0) AS "moneyIn",
        COALESCE(SUM(CASE WHEN txn_type = 'money_out' THEN amount ELSE 0 END), 0) AS "moneyOut"
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND currency = $1
        AND date >= $2
        AND date < $3
    `,
    [currency, window.from, window.to],
  );
  const outstandingResult = await queryPostgres(
    `
      SELECT
        COUNT(*)::int AS count,
        COALESCE(SUM(balance_due), 0) AS total
      FROM finance_invoices
      WHERE status IN ('sent', 'overdue', 'partially_paid')
        AND currency = $1
    `,
    [currency],
  );
  const breakdownResult = await queryPostgres(
    `
      SELECT
        COALESCE(display_category, CASE WHEN category = 'Donations' THEN 'Donation' ELSE category END) AS category,
        COALESCE(SUM(amount), 0) AS amount
      FROM finance_transactions_ledger
      WHERE posted_status = 'posted'
        AND txn_type = 'money_in'
        AND currency = $1
        AND date >= $2
        AND date < $3
      GROUP BY COALESCE(display_category, CASE WHEN category = 'Donations' THEN 'Donation' ELSE category END)
    `,
    [currency, window.from, window.to],
  );

  const categoryBreakdown = createFinanceIncomeBreakdownZero();
  for (const row of breakdownResult.rows as Array<Record<string, unknown>>) {
    try {
      const category = normalizeFinanceIncomeCategory(String(row.category ?? "Donation"));
      categoryBreakdown[category] = normalizeNumber(row.amount);
    } catch {
      // Ignore unknown historical category labels.
    }
  }

  const totals = totalsResult.rows[0] as Record<string, unknown> | undefined;
  const outstanding = outstandingResult.rows[0] as Record<string, unknown> | undefined;
  const moneyIn = normalizeNumber(totals?.moneyIn ?? 0);
  const moneyOut = normalizeNumber(totals?.moneyOut ?? 0);

  return {
    month: window.month,
    currency,
    moneyIn,
    moneyOut,
    net: normalizeNumber(moneyIn - moneyOut),
    outstandingInvoiceCount: Number(outstanding?.count ?? 0),
    outstandingInvoiceTotal: normalizeNumber(outstanding?.total ?? 0),
    categoryBreakdown,
  };
}

export async function listFinanceMonthlyStatementsPostgres() {
  const result = await queryPostgres(
    `
      SELECT
        s.id,
        s.month,
        s.period_type AS "periodType",
        s.currency,
        s.total_money_in AS "totalMoneyIn",
        s.total_money_out AS "totalMoneyOut",
        s.net,
        s.breakdown_json AS "breakdownJson",
        s.generated_by_user_id AS "generatedBy",
        u.full_name AS "generatedByName",
        s.generated_at AS "generatedAt",
        s.pdf_file_id AS "pdfFileId",
        s.balance_sheet_pdf_file_id AS "balanceSheetPdfFileId",
        s.statement_of_financial_position_pdf_file_id AS "statementOfFinancialPositionPdfFileId",
        s.income_statement_pdf_file_id AS "incomeStatementPdfFileId"
      FROM finance_monthly_statements s
      JOIN portal_users u ON u.id = s.generated_by_user_id
      ORDER BY s.generated_at DESC, s.month DESC, s.currency ASC
    `,
  );

  return result.rows.map((row) => {
    const record = row as Record<string, unknown>;
    const breakdownByCategory: Record<FinanceCategory, number> = {
      ...createFinanceIncomeBreakdownZero(),
      Expense: 0,
    };
    try {
      const parsed = JSON.parse(String(record.breakdownJson ?? "{}")) as Record<string, unknown>;
      for (const category of FINANCE_INCOME_CATEGORIES) {
        breakdownByCategory[category] = normalizeNumber(parsed[category]);
      }
      breakdownByCategory.Donation = normalizeNumber(
        breakdownByCategory.Donation + Number(parsed.Donations ?? 0),
      );
      breakdownByCategory.Expense = normalizeNumber(parsed.Expense ?? 0);
    } catch {
      // Use zeroed defaults.
    }

    const pdfFileId = record.pdfFileId === null || record.pdfFileId === undefined ? undefined : Number(record.pdfFileId);
    const balanceSheetPdfFileId =
      record.balanceSheetPdfFileId === null || record.balanceSheetPdfFileId === undefined
        ? undefined
        : Number(record.balanceSheetPdfFileId);
    const statementOfFinancialPositionPdfFileId =
      record.statementOfFinancialPositionPdfFileId === null ||
      record.statementOfFinancialPositionPdfFileId === undefined
        ? undefined
        : Number(record.statementOfFinancialPositionPdfFileId);
    const incomeStatementPdfFileId =
      record.incomeStatementPdfFileId === null || record.incomeStatementPdfFileId === undefined
        ? undefined
        : Number(record.incomeStatementPdfFileId);

    return {
      id: Number(record.id ?? 0),
      month: String(record.month ?? ""),
      periodType: normalizeStatementPeriodType(String(record.periodType ?? "monthly")),
      currency: normalizeCurrency(String(record.currency ?? "UGX")),
      totalMoneyIn: normalizeNumber(record.totalMoneyIn),
      totalMoneyOut: normalizeNumber(record.totalMoneyOut),
      net: normalizeNumber(record.net),
      breakdownByCategory,
      generatedAt: String(record.generatedAt ?? new Date(0).toISOString()),
      generatedBy: Number(record.generatedBy ?? 0),
      generatedByName: record.generatedByName ? String(record.generatedByName) : undefined,
      pdfFileId,
      pdfUrl: pdfFileId ? getSignedFinanceFileUrl(pdfFileId) : undefined,
      balanceSheetPdfFileId,
      statementOfFinancialPositionPdfFileId,
      incomeStatementPdfFileId,
      balanceSheetPdfUrl: balanceSheetPdfFileId ? getSignedFinanceFileUrl(balanceSheetPdfFileId) : undefined,
      statementOfFinancialPositionPdfUrl: statementOfFinancialPositionPdfFileId
        ? getSignedFinanceFileUrl(statementOfFinancialPositionPdfFileId)
        : undefined,
      incomeStatementPdfUrl: incomeStatementPdfFileId ? getSignedFinanceFileUrl(incomeStatementPdfFileId) : undefined,
    } satisfies FinanceMonthlyStatementRecord;
  });
}

export async function listFinanceAuditExceptionsPostgres(
  filters: FinanceAuditExceptionFilters = {},
) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.entityType) {
    params.push(filters.entityType);
    clauses.push(`e.entity_type = $${params.length}`);
  }
  if (filters.severity) {
    params.push(filters.severity);
    clauses.push(`e.severity = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    clauses.push(`e.status = $${params.length}`);
  }
  if (filters.ruleCode) {
    params.push(filters.ruleCode);
    clauses.push(`e.rule_code = $${params.length}`);
  }
  if (filters.category) {
    params.push(filters.category);
    clauses.push(`expense.category = $${params.length}`);
  }
  if (filters.subcategory) {
    params.push(filters.subcategory);
    clauses.push(`expense.subcategory = $${params.length}`);
  }
  if (filters.paymentMethod) {
    params.push(filters.paymentMethod);
    clauses.push(`expense.payment_method = $${params.length}`);
  }
  if (filters.currency) {
    params.push(normalizeCurrency(filters.currency));
    clauses.push(`e.currency = $${params.length}`);
  }
  if (Number.isFinite(filters.createdBy)) {
    params.push(Number(filters.createdBy));
    clauses.push(`e.created_by_user_id = $${params.length}`);
  }
  if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
    params.push(filters.month);
    clauses.push(`to_char(e.created_at, 'YYYY-MM') = $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `
      SELECT
        e.id,
        e.entity_type AS "entityType",
        e.entity_id AS "entityId",
        e.severity,
        e.rule_code AS "ruleCode",
        e.message,
        e.status,
        e.amount,
        e.currency,
        e.created_by_user_id AS "createdBy",
        cu.full_name AS "createdByName",
        e.created_at AS "createdAt",
        e.resolved_at AS "resolvedAt",
        e.resolved_by_user_id AS "resolvedBy",
        ru.full_name AS "resolvedByName",
        e.resolution_notes AS "resolutionNotes"
      FROM finance_audit_exceptions e
      LEFT JOIN finance_expenses expense
        ON e.entity_type = 'expense'
       AND e.entity_id = expense.id
      LEFT JOIN portal_users cu ON cu.id = e.created_by_user_id
      LEFT JOIN portal_users ru ON ru.id = e.resolved_by_user_id
      ${whereClause}
      ORDER BY
        CASE e.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        e.created_at DESC,
        e.id DESC
    `,
    params,
  );

  return result.rows.map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: Number(record.id ?? 0),
      entityType: String(record.entityType ?? "expense") as FinanceAuditExceptionRecord["entityType"],
      entityId: Number(record.entityId ?? 0),
      severity: String(record.severity ?? "low") as FinanceAuditExceptionRecord["severity"],
      ruleCode: String(record.ruleCode ?? ""),
      message: String(record.message ?? ""),
      status: String(record.status ?? "open") as FinanceAuditExceptionRecord["status"],
      amount: record.amount === null || record.amount === undefined ? undefined : normalizeNumber(record.amount),
      currency: record.currency ? normalizeCurrency(String(record.currency)) : undefined,
      createdBy: record.createdBy === null || record.createdBy === undefined ? undefined : Number(record.createdBy),
      createdByName: record.createdByName ? String(record.createdByName) : undefined,
      createdAt: String(record.createdAt ?? new Date(0).toISOString()),
      resolvedAt: record.resolvedAt ? String(record.resolvedAt) : undefined,
      resolvedBy: record.resolvedBy === null || record.resolvedBy === undefined ? undefined : Number(record.resolvedBy),
      resolvedByName: record.resolvedByName ? String(record.resolvedByName) : undefined,
      resolutionNotes: record.resolutionNotes ? String(record.resolutionNotes) : undefined,
    } satisfies FinanceAuditExceptionRecord;
  });
}

export async function listFinanceHighRiskTransactionsPostgres(limit = 25) {
  const safeLimit = Math.min(200, Math.max(1, Math.trunc(limit || 25)));
  const result = await queryPostgres(
    `
      SELECT
        id,
        entity_type AS "entityType",
        entity_id AS "entityId",
        risk_score AS "riskScore",
        signals_json AS "signalsJson",
        computed_at AS "computedAt"
      FROM finance_txn_risk_scores
      ORDER BY risk_score DESC, computed_at DESC
      LIMIT $1
    `,
    [safeLimit],
  );
  return result.rows.map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: Number(record.id ?? 0),
      entityType: String(record.entityType ?? "expense") as FinanceTxnRiskScoreRecord["entityType"],
      entityId: Number(record.entityId ?? 0),
      riskScore: Math.max(0, Math.min(100, Math.trunc(Number(record.riskScore ?? 0)))),
      signals: parseJsonArray(String(record.signalsJson ?? "[]")),
      computedAt: String(record.computedAt ?? new Date(0).toISOString()),
    } satisfies FinanceTxnRiskScoreRecord;
  });
}

export async function listFinanceEmailLogsPostgres(limit = 200): Promise<FinanceEmailLogEntry[]> {
  const safeLimit = Math.min(Math.max(1, limit), 1000);
  const result = await queryPostgres(
    `
      SELECT
        id,
        record_type AS "recordType",
        record_id AS "recordId",
        to_email AS "toEmail",
        cc_email AS "ccEmail",
        subject,
        status,
        provider_message AS "providerMessage",
        created_by_user_id AS "createdBy",
        created_at AS "createdAt"
      FROM finance_email_logs
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [safeLimit],
  );
  return result.rows.map((row) => ({
    id: Number((row as Record<string, unknown>).id ?? 0),
    recordType: String((row as Record<string, unknown>).recordType ?? "invoice") as FinanceEmailLogEntry["recordType"],
    recordId: Number((row as Record<string, unknown>).recordId ?? 0),
    toEmail: String((row as Record<string, unknown>).toEmail ?? ""),
    ccEmail: (row as Record<string, unknown>).ccEmail ? String((row as Record<string, unknown>).ccEmail) : null,
    subject: String((row as Record<string, unknown>).subject ?? ""),
    status: String((row as Record<string, unknown>).status ?? "skipped") as FinanceEmailLogEntry["status"],
    providerMessage: (row as Record<string, unknown>).providerMessage
      ? String((row as Record<string, unknown>).providerMessage)
      : null,
    createdBy: Number((row as Record<string, unknown>).createdBy ?? 0),
    createdAt: String((row as Record<string, unknown>).createdAt ?? new Date(0).toISOString()),
  }));
}

export async function listFinanceReceiptRegistryPostgres(filters: {
  vendor?: string;
  reference?: string;
  fromDate?: string;
  toDate?: string;
  amount?: number;
  currency?: FinanceCurrency;
} = {}): Promise<FinanceReceiptRegistryRecord[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.vendor) {
    params.push(`%${filters.vendor.trim()}%`);
    clauses.push(`er.vendor_name ILIKE $${params.length}`);
  }
  if (filters.reference) {
    params.push(`%${filters.reference.trim()}%`);
    clauses.push(`COALESCE(er.reference_no, '') ILIKE $${params.length}`);
  }
  if (filters.fromDate) {
    params.push(filters.fromDate);
    clauses.push(`er.receipt_date >= $${params.length}`);
  }
  if (filters.toDate) {
    params.push(filters.toDate);
    clauses.push(`er.receipt_date <= $${params.length}`);
  }
  if (Number.isFinite(filters.amount)) {
    params.push(normalizeNumber(filters.amount));
    clauses.push(`ABS(er.receipt_amount - $${params.length}) < 0.01`);
  }
  if (filters.currency) {
    params.push(normalizeCurrency(filters.currency));
    clauses.push(`er.currency = $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const [registryResult, hashResult] = await Promise.all([
    queryPostgres(
      `
        SELECT
          er.id,
          er.expense_id AS "expenseId",
          e.expense_number AS "expenseNumber",
          e.status AS "expenseStatus",
          er.file_id AS "fileId",
          er.file_hash_sha256 AS "fileHashSha256",
          er.vendor_name AS "vendorName",
          er.receipt_date AS "receiptDate",
          er.receipt_amount AS "receiptAmount",
          er.currency,
          er.reference_no AS "referenceNo",
          er.uploaded_by_user_id AS "uploadedBy",
          u.full_name AS "uploadedByName",
          er.uploaded_at AS "uploadedAt",
          f.file_name AS "fileName"
        FROM finance_expense_receipts er
        JOIN finance_expenses e ON e.id = er.expense_id
        JOIN portal_users u ON u.id = er.uploaded_by_user_id
        LEFT JOIN finance_files f ON f.id = er.file_id
        ${whereClause}
        ORDER BY er.uploaded_at DESC, er.id DESC
      `,
      params,
    ),
    queryPostgres(
      `
        SELECT
          er.file_hash_sha256 AS "fileHashSha256",
          SUM(CASE WHEN e.status = 'posted' THEN 1 ELSE 0 END)::int AS "postedCount"
        FROM finance_expense_receipts er
        JOIN finance_expenses e ON e.id = er.expense_id
        GROUP BY er.file_hash_sha256
      `,
    ),
  ]);

  const postedUsage = new Map(
    hashResult.rows.map((row) => [
      String((row as Record<string, unknown>).fileHashSha256 ?? ""),
      Number((row as Record<string, unknown>).postedCount ?? 0),
    ]),
  );

  return registryResult.rows.map((row) => {
    const record = row as Record<string, unknown>;
    const flags: string[] = [];
    if (
      !String(record.vendorName ?? "").trim() ||
      !String(record.receiptDate ?? "").trim() ||
      !Number.isFinite(Number(record.receiptAmount ?? 0)) ||
      Number(record.receiptAmount ?? 0) <= 0
    ) {
      flags.push("missing_metadata");
    }
    if (Number(postedUsage.get(String(record.fileHashSha256 ?? "")) ?? 0) > 1) {
      flags.push("reused_receipt");
    }

    const fileId = Number(record.fileId ?? 0);
    return {
      id: Number(record.id ?? 0),
      expenseId: Number(record.expenseId ?? 0),
      expenseNumber: record.expenseNumber ? String(record.expenseNumber) : undefined,
      expenseStatus: record.expenseStatus ? String(record.expenseStatus) as FinanceReceiptRegistryRecord["expenseStatus"] : undefined,
      fileId,
      fileUrl: getSignedFinanceFileUrl(fileId),
      fileName: record.fileName ? String(record.fileName) : undefined,
      fileHashSha256: String(record.fileHashSha256 ?? ""),
      vendorName: String(record.vendorName ?? ""),
      receiptDate: String(record.receiptDate ?? ""),
      receiptAmount: normalizeNumber(record.receiptAmount),
      currency: normalizeCurrency(String(record.currency ?? "UGX")),
      referenceNo: record.referenceNo ? String(record.referenceNo) : undefined,
      uploadedBy: Number(record.uploadedBy ?? 0),
      uploadedByName: record.uploadedByName ? String(record.uploadedByName) : undefined,
      uploadedAt: String(record.uploadedAt ?? new Date(0).toISOString()),
      flags,
    } satisfies FinanceReceiptRegistryRecord;
  });
}

export async function listFinanceAuditComplianceChecksPostgres(): Promise<FinanceAuditComplianceCheckRecord[]> {
  const result = await queryPostgres(
    `
      SELECT
        rule_code AS "ruleCode",
        severity,
        COUNT(*)::int AS "openCount"
      FROM finance_audit_exceptions
      WHERE status IN ('open', 'acknowledged')
      GROUP BY rule_code, severity
      ORDER BY
        CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        rule_code ASC
    `,
  );
  const titleByRule: Record<string, string> = {
    "EXP-001": "Posted expense has no receipt",
    "EXP-002": "Receipt metadata missing",
    "EXP-003": "Receipt amount mismatch",
    "EXP-004": "Receipt file reused",
    "EXP-010": "Duplicate vendor+amount+date",
    "EXP-011": "Outlier expense amount",
    "EXP-012": "Cash over threshold",
    "EXP-013": "Backdated entry",
    "LED-001": "Posted expense missing ledger money_out",
    "LED-002": "Voided expense missing void/reversal ledger",
    "INC-001": "Issued receipt missing money_in ledger",
    "INV-001": "Paid invoice allocation mismatch",
  };
  return result.rows.map((row) => ({
    ruleCode: String((row as Record<string, unknown>).ruleCode ?? ""),
    title: titleByRule[String((row as Record<string, unknown>).ruleCode ?? "")] || String((row as Record<string, unknown>).ruleCode ?? ""),
    severity: String((row as Record<string, unknown>).severity ?? "low") as FinanceAuditComplianceCheckRecord["severity"],
    openCount: Number((row as Record<string, unknown>).openCount ?? 0),
  }));
}

export async function listStatementLinesPostgres(filters: {
  accountType?: FinanceStatementAccountType;
  matchStatus?: FinanceStatementLineRecord["matchStatus"];
  month?: string;
} = {}): Promise<FinanceStatementLineRecord[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.accountType) {
    params.push(filters.accountType);
    clauses.push(`account_type = $${params.length}`);
  }
  if (filters.matchStatus) {
    params.push(filters.matchStatus);
    clauses.push(`match_status = $${params.length}`);
  }
  if (filters.month) {
    params.push(`${filters.month}%`);
    clauses.push(`date::text LIKE $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `
      SELECT
        id,
        account_type AS "accountType",
        date::text AS date,
        amount,
        currency,
        reference,
        description,
        match_status AS "matchStatus",
        matched_amount AS "matchedAmount",
        created_by_user_id AS "createdBy",
        created_at AS "createdAt"
      FROM finance_statement_lines
      ${whereClause}
      ORDER BY date DESC, id DESC
    `,
    params,
  );

  return result.rows.map((row) => ({
    id: Number((row as Record<string, unknown>).id ?? 0),
    accountType: String((row as Record<string, unknown>).accountType ?? "bank") as FinanceStatementAccountType,
    date: String((row as Record<string, unknown>).date ?? ""),
    amount: normalizeNumber((row as Record<string, unknown>).amount),
    currency: normalizeCurrency(String((row as Record<string, unknown>).currency ?? "UGX")),
    reference: (row as Record<string, unknown>).reference ? String((row as Record<string, unknown>).reference) : undefined,
    description: (row as Record<string, unknown>).description ? String((row as Record<string, unknown>).description) : undefined,
    matchStatus: String((row as Record<string, unknown>).matchStatus ?? "unmatched") as FinanceStatementLineRecord["matchStatus"],
    matchedAmount: normalizeNumber((row as Record<string, unknown>).matchedAmount),
    createdBy: Number((row as Record<string, unknown>).createdBy ?? 0),
    createdAt: String((row as Record<string, unknown>).createdAt ?? new Date(0).toISOString()),
  }));
}

export async function listMonthlyBudgetsPostgres(
  month: string,
  currency?: FinanceCurrency,
): Promise<FinanceBudgetMonthlyRecord[]> {
  const clauses = ["month = $1"];
  const params: unknown[] = [month];
  if (currency) {
    params.push(currency);
    clauses.push(`currency = $${params.length}`);
  }
  const result = await queryPostgres(
    `
      SELECT
        id,
        month,
        currency,
        subcategory,
        budget_amount AS "budgetAmount",
        created_by_user_id AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM finance_budgets_monthly
      WHERE ${clauses.join(" AND ")}
      ORDER BY subcategory ASC
    `,
    params,
  );
  return result.rows.map((row) => ({
    id: Number((row as Record<string, unknown>).id ?? 0),
    month: String((row as Record<string, unknown>).month ?? ""),
    currency: normalizeCurrency(String((row as Record<string, unknown>).currency ?? "UGX")),
    subcategory: String((row as Record<string, unknown>).subcategory ?? ""),
    budgetAmount: normalizeNumber((row as Record<string, unknown>).budgetAmount),
    createdBy: Number((row as Record<string, unknown>).createdBy ?? 0),
    createdAt: String((row as Record<string, unknown>).createdAt ?? new Date(0).toISOString()),
    updatedAt: String((row as Record<string, unknown>).updatedAt ?? new Date(0).toISOString()),
  }));
}

export async function getRestrictedFundsSummaryPostgres(
  currency?: FinanceCurrency,
): Promise<FinanceRestrictedBalanceLine[]> {
  const clauses = ["restricted_flag = 1"];
  const params: unknown[] = [];
  if (currency) {
    params.push(currency);
    clauses.push(`currency = $${params.length}`);
  }
  const whereClause = `WHERE ${clauses.join(" AND ")}`;
  const [inResult, outResult] = await Promise.all([
    queryPostgres(
      `
        SELECT
          restricted_program AS program,
          restricted_geo_scope AS "geoScope",
          restricted_geo_id AS "geoId",
          currency,
          SUM(amount) AS total
        FROM finance_transactions_ledger
        ${whereClause}
          AND txn_type = 'money_in'
          AND posted_status = 'posted'
        GROUP BY restricted_program, restricted_geo_scope, restricted_geo_id, currency
      `,
      params,
    ),
    queryPostgres(
      `
        SELECT
          restricted_program AS program,
          restricted_geo_scope AS "geoScope",
          restricted_geo_id AS "geoId",
          currency,
          SUM(amount) AS total
        FROM finance_transactions_ledger
        ${whereClause}
          AND txn_type = 'money_out'
          AND posted_status = 'posted'
        GROUP BY restricted_program, restricted_geo_scope, restricted_geo_id, currency
      `,
      params,
    ),
  ]);

  const lines = new Map<string, FinanceRestrictedBalanceLine>();
  const key = (program: string, geoScope: unknown, geoId: unknown, rowCurrency: unknown) =>
    `${program}|${String(geoScope ?? "")}|${String(geoId ?? "")}|${String(rowCurrency ?? "")}`;

  for (const row of inResult.rows as Array<Record<string, unknown>>) {
    const mapKey = key(String(row.program ?? "general"), row.geoScope, row.geoId, row.currency);
    lines.set(mapKey, {
      program: String(row.program ?? "general") as FinanceRestrictedBalanceLine["program"],
      geoScope: row.geoScope ? String(row.geoScope) : undefined,
      geoId: row.geoId === null || row.geoId === undefined ? undefined : Number(row.geoId),
      totalIn: normalizeNumber(row.total),
      totalOut: 0,
      remaining: normalizeNumber(row.total),
      currency: normalizeCurrency(String(row.currency ?? "UGX")),
    });
  }

  for (const row of outResult.rows as Array<Record<string, unknown>>) {
    const mapKey = key(String(row.program ?? "general"), row.geoScope, row.geoId, row.currency);
    const existing = lines.get(mapKey);
    if (existing) {
      existing.totalOut = normalizeNumber(row.total);
      existing.remaining = normalizeNumber(existing.totalIn - existing.totalOut);
      continue;
    }
    lines.set(mapKey, {
      program: String(row.program ?? "general") as FinanceRestrictedBalanceLine["program"],
      geoScope: row.geoScope ? String(row.geoScope) : undefined,
      geoId: row.geoId === null || row.geoId === undefined ? undefined : Number(row.geoId),
      totalIn: 0,
      totalOut: normalizeNumber(row.total),
      remaining: normalizeNumber(-Number(row.total ?? 0)),
      currency: normalizeCurrency(String(row.currency ?? "UGX")),
    });
  }

  return Array.from(lines.values()).sort((left, right) => left.program.localeCompare(right.program));
}

export async function listFinancePublicSnapshotsPostgres(filters?: { publishedOnly?: boolean }) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters?.publishedOnly) {
    params.push("published");
    clauses.push(`status = $${params.length}`);
  }
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `
      SELECT *
      FROM finance_public_snapshots
      ${whereClause}
      ORDER BY fy DESC, quarter DESC, generated_at DESC
    `,
    params,
  );
  return result.rows.map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: Number(record.id ?? 0),
      fy: Number(record.fy ?? 0),
      quarter: record.quarter ? String(record.quarter) : null,
      currency: normalizeCurrency(String(record.currency ?? "UGX")),
      snapshotType: String(record.snapshot_type ?? "fy"),
      status: String(record.status ?? "draft"),
      totalIncome: normalizeNumber(record.total_income),
      totalExpenditure: normalizeNumber(record.total_expenditure),
      net: normalizeNumber(record.net),
      programPct: record.program_pct === null || record.program_pct === undefined ? null : Number(record.program_pct),
      adminPct: record.admin_pct === null || record.admin_pct === undefined ? null : Number(record.admin_pct),
      categoryBreakdownJson: String(record.category_breakdown_json ?? "[]"),
      restrictedSummaryJson: String(record.restricted_summary_json ?? "[]"),
      pdfFileId: record.pdf_file_id === null || record.pdf_file_id === undefined ? null : Number(record.pdf_file_id),
      storedPath: record.stored_path ? String(record.stored_path) : null,
      publishConfirmation: record.publish_confirmation ? String(record.publish_confirmation) : null,
      publishedAt: record.published_at ? String(record.published_at) : null,
      publishedByUserId: record.published_by_user_id === null || record.published_by_user_id === undefined ? null : Number(record.published_by_user_id),
      archivedAt: record.archived_at ? String(record.archived_at) : null,
      generatedByUserId: Number(record.generated_by_user_id ?? 0),
      generatedAt: String(record.generated_at ?? new Date(0).toISOString()),
    };
  });
}

export async function listFinanceAuditedStatementsPostgres(filters?: { publishedOnly?: boolean }) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters?.publishedOnly) {
    params.push("published");
    clauses.push(`status = $${params.length}`);
  }
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `
      SELECT *
      FROM finance_audited_statements
      ${whereClause}
      ORDER BY fy DESC, uploaded_at DESC
    `,
    params,
  );
  return result.rows.map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: Number(record.id ?? 0),
      fy: Number(record.fy ?? 0),
      auditorName: record.auditor_name ? String(record.auditor_name) : null,
      auditCompletedDate: record.audit_completed_date ? String(record.audit_completed_date) : null,
      status: String(record.status ?? "private_uploaded"),
      storedPath: String(record.stored_path ?? ""),
      originalFilename: String(record.original_filename ?? ""),
      notes: record.notes ? String(record.notes) : null,
      publishConfirmation: record.publish_confirmation ? String(record.publish_confirmation) : null,
      publishedAt: record.published_at ? String(record.published_at) : null,
      publishedByUserId: record.published_by_user_id === null || record.published_by_user_id === undefined ? null : Number(record.published_by_user_id),
      archivedAt: record.archived_at ? String(record.archived_at) : null,
      uploadedByUserId: Number(record.uploaded_by_user_id ?? 0),
      uploadedAt: String(record.uploaded_at ?? new Date(0).toISOString()),
    };
  });
}
