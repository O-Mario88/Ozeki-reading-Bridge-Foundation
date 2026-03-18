import { queryPostgres, withPostgresClient } from "../client";
import type { 
  ChartOfAccount, 
  JournalEntry, 
  JournalLine, 
  FinanceFund,
  FinanceAccountType 
} from "@/lib/types";

/**
 * Initializes a standard Chart of Accounts for a nonprofit if empty.
 */
export async function initializeChartOfAccounts(userId: number) {
  const existing = await queryPostgres("SELECT COUNT(*) FROM finance_chart_of_accounts");
  if (parseInt(existing.rows[0].count) > 0) return;

  const standardAccounts: Array<{ code: string; name: string; type: FinanceAccountType }> = [
    // Assets
    { code: "1000", name: "Cash at Bank", type: "asset" },
    { code: "1100", name: "Petty Cash", type: "asset" },
    { code: "1200", name: "Accounts Receivable", type: "asset" },
    { code: "1500", name: "Fixed Assets", type: "asset" },
    // Liabilities
    { code: "2000", name: "Accounts Payable", type: "liability" },
    { code: "2100", name: "Accrued Expenses", type: "liability" },
    // Equity
    { code: "3000", name: "Unrestricted Net Assets", type: "equity" },
    { code: "3100", name: "Restricted Net Assets", type: "equity" },
    // Income
    { code: "4000", name: "Individual Donations", type: "income" },
    { code: "4100", name: "Grant Income", type: "income" },
    { code: "4200", name: "Program Service Revenue", type: "income" },
    // Expenses
    { code: "5000", name: "Program Staff Salaries", type: "expense" },
    { code: "5100", name: "Travel & Transport", type: "expense" },
    { code: "5200", name: "Materials & Supplies", type: "expense" },
    { code: "6000", name: "General & Administrative", type: "expense" },
    { code: "6100", name: "Rent & Utilities", type: "expense" },
  ];

  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      for (const acc of standardAccounts) {
        await client.query(
          "INSERT INTO finance_chart_of_accounts (account_code, account_name, account_type) VALUES ($1, $2, $3)",
          [acc.code, acc.name, acc.type]
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  });
}

/**
 * Creates a balanced Journal Entry.
 */
export async function createJournalEntry(
  entry: Omit<JournalEntry, "id" | "entryNumber" | "status" | "postedAt" | "postedByUserId" | "createdAt">,
  lines: Array<Omit<JournalLine, "id" | "journalId" | "createdAt">>,
  userId: number
): Promise<JournalEntry> {
  // Validate balance
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Unbalanced Journal Entry: Debits (${totalDebit}) do not equal Credits (${totalCredit})`);
  }

  return await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      // Generate Entry Number (Simple sequence for now)
      const dateStr = new Date(entry.entryDate).getFullYear().toString();
      const seqResult = await client.query("SELECT COUNT(*) FROM finance_journal_entries WHERE entry_number LIKE $1", [`JE-${dateStr}-%`]);
      const nextSeq = (parseInt(seqResult.rows[0].count) + 1).toString().padStart(6, "0");
      const entryNumber = `JE-${dateStr}-${nextSeq}`;

      const entryResult = await client.query(
        `INSERT INTO finance_journal_entries (entry_number, entry_date, description, source_type, source_id, status, posted_at, posted_by_user_id)
         VALUES ($1, $2, $3, $4, $5, 'posted', NOW(), $6)
         RETURNING *`,
        [entryNumber, entry.entryDate, entry.description, entry.sourceType, entry.sourceId, userId]
      );

      const newEntry = entryResult.rows[0];

      for (const line of lines) {
        await client.query(
          `INSERT INTO finance_journal_lines (
            journal_id, account_id, debit, credit, fund_id, department_id, 
            program_id, project_id, grant_id, branch_id, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            newEntry.id, line.accountId, line.debit, line.credit, line.fundId, line.departmentId,
            line.programId, line.projectId, line.grantId, line.branchId, line.description
          ]
        );
      }

      await client.query("COMMIT");
      return newEntry;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  });
}

/**
 * Helper to get account ID by code.
 */
export async function getAccountIdByCode(code: string): Promise<number> {
  const res = await queryPostgres("SELECT id FROM finance_chart_of_accounts WHERE account_code = $1", [code]);
  if (res.rows.length === 0) throw new Error(`Account with code ${code} not found.`);
  return res.rows[0].id;
}

/**
 * Post a Donation/Receipt to GL.
 */
export async function postReceiptToGl(receiptId: number, userId: number) {
  const receiptRes = await queryPostgres("SELECT * FROM finance_receipts WHERE id = $1", [receiptId]);
  const receipt = receiptRes.rows[0];
  if (!receipt) throw new Error("Receipt not found");

  const cashAccId = await getAccountIdByCode("1000"); // Cash at Bank
  const donationAccId = await getAccountIdByCode("4000"); // Donations

  await createJournalEntry(
    {
      entryDate: receipt.receipt_date,
      description: `Donation Receipt ${receipt.receipt_number}: ${receipt.description || ""}`,
      sourceType: "receipt",
      sourceId: receipt.id,
    },
    [
      {
        accountId: cashAccId,
        debit: receipt.amount_received,
        credit: 0,
        fundId: receipt.fund_id || 1, // Default unrestricted
        departmentId: null,
        programId: receipt.program_id,
        projectId: null,
        grantId: receipt.grant_id,
        branchId: null,
        description: "Cash received",
      },
      {
        accountId: donationAccId,
        debit: 0,
        credit: receipt.amount_received,
        fundId: receipt.fund_id || 1,
        departmentId: null,
        programId: receipt.program_id,
        projectId: null,
        grantId: receipt.grant_id,
        branchId: null,
        description: "Donation income",
      },
    ],
    userId
  );
}

/**
 * Post an Expense to GL.
 */
export async function postExpenseToGl(expenseId: number, userId: number) {
  const expenseRes = await queryPostgres("SELECT * FROM finance_expenses WHERE id = $1", [expenseId]);
  const expense = expenseRes.rows[0];
  if (!expense) throw new Error("Expense not found");

  const cashAccId = await getAccountIdByCode("1000"); // Cash at Bank
  const expenseAccId = await getAccountIdByCode("6000"); // General & Administrative

  await createJournalEntry(
    {
      entryDate: expense.date,
      description: `Expense ${expense.expense_number}: ${expense.description || expense.vendor_name}`,
      sourceType: "expense",
      sourceId: expense.id,
    },
    [
      {
        accountId: expenseAccId,
        debit: expense.amount,
        credit: 0,
        fundId: expense.fund_id || 1, // Default unrestricted
        departmentId: expense.department_id || null,
        programId: expense.program_id || null,
        projectId: expense.project_id || null,
        grantId: expense.grant_id || null,
        branchId: null,
        description: "Expense booked",
      },
      {
        accountId: cashAccId,
        debit: 0,
        credit: expense.amount,
        fundId: expense.fund_id || 1,
        departmentId: expense.department_id || null,
        programId: expense.program_id || null,
        projectId: expense.project_id || null,
        grantId: expense.grant_id || null,
        branchId: null,
        description: "Cash paid out",
      },
    ],
    userId
  );
}
