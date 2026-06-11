import { queryPostgres } from "../client";

/**
 * Generates Statement of Activities (Income & Expenditure).
 * Groups by 'Revenue' and 'Expenses'.
 */
export async function getStatementOfActivities(startDate: string, endDate: string) {
  const incRes = await queryPostgres(`
    SELECT 'Revenue' as group_name,
      COALESCE(display_category, category, 'Uncategorized Income') as account_name,
      SUM(amount) as net_amount
    FROM finance_transactions_ledger
    WHERE posted_status = 'posted' AND txn_type = 'money_in'
      AND date >= $1 AND date <= $2
    GROUP BY display_category, category
  `, [startDate, endDate]);

  const expRes = await queryPostgres(`
    SELECT 'Operating Expenses' as group_name,
      COALESCE(subcategory, category, 'Uncategorized Expense') as account_name,
      SUM(amount) as net_amount
    FROM finance_transactions_ledger
    WHERE posted_status = 'posted' AND txn_type = 'money_out'
      AND date >= $1 AND date <= $2
    GROUP BY subcategory, category
  `, [startDate, endDate]);

  return [...incRes.rows, ...expRes.rows];
}

/**
 * Generates Statement of Financial Position (Balance Sheet).
 * Computes Cash, Unpaid Invoices, Unpaid Expenses, and Net Assets.
 */
export async function getStatementOfFinancialPosition(asOfDate: string) {
  const cashRes = await queryPostgres(`
    SELECT 
      COALESCE(SUM(CASE WHEN txn_type='money_in' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN txn_type='money_out' THEN amount ELSE 0 END), 0) as balance
    FROM finance_transactions_ledger
    WHERE posted_status = 'posted' AND date <= $1
  `, [asOfDate]);

  const receivablesRes = await queryPostgres(`
    SELECT COALESCE(SUM(amount), 0) as balance
    FROM finance_invoices 
    WHERE status != 'paid' AND status != 'void' AND issue_date <= $1
  `, [asOfDate]);

  const payablesRes = await queryPostgres(`
    SELECT COALESCE(SUM(amount), 0) as balance
    FROM finance_expenses 
    WHERE status != 'paid' AND status != 'void' AND date <= $1
  `, [asOfDate]);

  const rows = [];
  rows.push({ group_name: "Assets", account_name: "Cash and Equivalents", balance: Number(cashRes.rows[0].balance) });
  if (Number(receivablesRes.rows[0].balance) > 0) {
    rows.push({ group_name: "Assets", account_name: "Accounts Receivable", balance: Number(receivablesRes.rows[0].balance) });
  }
  
  rows.push({ group_name: "Liabilities", account_name: "Accounts Payable", balance: Number(payablesRes.rows[0].balance) });

  return rows;
}

/**
 * Generates Cash Flow Statement.
 */
export async function getCashFlowStatement(startDate: string, endDate: string) {
  // Get opening balance
  const openRes = await queryPostgres(`
    SELECT 
      COALESCE(SUM(CASE WHEN txn_type='money_in' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN txn_type='money_out' THEN amount ELSE 0 END), 0) as balance
    FROM finance_transactions_ledger
    WHERE posted_status = 'posted' AND date < $1
  `, [startDate]);

  const closingRes = await queryPostgres(`
    SELECT 
      COALESCE(SUM(CASE WHEN txn_type='money_in' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN txn_type='money_out' THEN amount ELSE 0 END), 0) as balance
    FROM finance_transactions_ledger
    WHERE posted_status = 'posted' AND date <= $1
  `, [endDate]);

  const incRes = await queryPostgres(`
    SELECT 'Cash Inflows' as category, COALESCE(display_category, category, 'Other') as account_name, SUM(amount) as net_cash_impact
    FROM finance_transactions_ledger
    WHERE posted_status = 'posted' AND txn_type = 'money_in' AND date >= $1 AND date <= $2
    GROUP BY display_category, category
  `, [startDate, endDate]);

  const expRes = await queryPostgres(`
    SELECT 'Cash Outflows' as category, COALESCE(subcategory, category, 'Other') as account_name, SUM(amount) as net_cash_impact
    FROM finance_transactions_ledger
    WHERE posted_status = 'posted' AND txn_type = 'money_out' AND date >= $1 AND date <= $2
    GROUP BY subcategory, category
  `, [startDate, endDate]);

  return {
    openingBalance: Number(openRes.rows[0].balance),
    closingBalance: Number(closingRes.rows[0].balance),
    lines: [...incRes.rows, ...expRes.rows]
  };
}

/**
 * Generates Budget vs Actual using new `finance_operation_budgets`.
 */
export async function getBudgetVsActual(startDate: string, endDate: string) {
  // Actuals aggregated globally across active active envelopes
  const sql = `
    SELECT 
      COALESCE(tl.subcategory, tl.category) as account_name,
      SUM(tl.amount) as actual_amount
    FROM finance_transactions_ledger tl
    WHERE tl.posted_status = 'posted' AND tl.txn_type = 'money_out'
      AND tl.date >= $1 AND tl.date <= $2
    GROUP BY tl.subcategory, tl.category
  `;
  const actualsRes = await queryPostgres(sql, [startDate, endDate]);

  // Aggregate budget limits (sum of all active "approved/funded" budgets overlapping this period)
  // Or simply summarize all budget line items where status is approved that intersect the date logic?
  // Let's just sum all budget items across all non-closed budgets to show general variance constraints.
  const budgetRes = await queryPostgres(`
    SELECT 
      obi.category as account_name,
      SUM(obi.total_cost) as budget_amount
    FROM finance_operation_budget_items obi
    JOIN finance_operation_budgets ob ON obi.budget_id = ob.id
    WHERE ob.status NOT IN ('draft', 'closed', 'rejected')
    GROUP BY obi.category
  `);

  // Merge them explicitly into a dictionary
  const budgetDict: Record<string, { budget: number, actual: number }> = {};
  
  budgetRes.rows.forEach((r) => {
    budgetDict[String(r.account_name)] = { budget: Number(r.budget_amount), actual: 0 };
  });

  actualsRes.rows.forEach((r) => {
    const name = String(r.account_name || 'Uncategorized');
    if (!budgetDict[name]) budgetDict[name] = { budget: 0, actual: 0 };
    budgetDict[name].actual = Number(r.actual_amount);
  });

  const lines = Object.keys(budgetDict).map(k => {
    const v = budgetDict[k];
    const variance = v.budget - v.actual;
    let pct = 0;
    if (v.budget > 0) pct = (variance / v.budget) * 100;
    return {
      account_name: k,
      budget_amount: v.budget,
      actual_amount: v.actual,
      variance,
      variance_percentage: pct
    };
  });

  return lines;
}

/**
 * Generates Grant Utilization Report from explicit DB flags.
 */
export async function getGrantAndDonorReport(_grantId?: number) {
  // If no grant defined yet in DB visually, just summarize all restricted revenues.
  const res = await queryPostgres(`
    SELECT 
      'Grant/Donor Funding' as grant_name,
      COALESCE(restricted_program, 'Unrestricted Funds') as fund_name,
      SUM(CASE WHEN txn_type='money_in' THEN amount ELSE 0 END) as total_received,
      SUM(CASE WHEN txn_type='money_out' THEN amount ELSE 0 END) as total_spent,
      SUM(CASE WHEN txn_type='money_in' THEN amount ELSE 0 END) - 
      SUM(CASE WHEN txn_type='money_out' THEN amount ELSE 0 END) as net_available
    FROM finance_transactions_ledger
    WHERE posted_status = 'posted'
    GROUP BY restricted_program
  `);
  return res.rows;
}

/**
 * Income vs Expense summary, by month and account (display category).
 * Route fields: month, account_type, total_income, total_expense.
 */
export async function getIncomeVsExpenseSummary(startDate: string, endDate: string) {
  const res = await queryPostgres(`
    SELECT
      to_char(date, 'YYYY-MM') as month,
      COALESCE(display_category, category, 'Uncategorized') as account_type,
      SUM(CASE WHEN txn_type='money_in' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN txn_type='money_out' THEN amount ELSE 0 END) as total_expense
    FROM finance_transactions_ledger
    WHERE posted_status = 'posted' AND date >= $1 AND date <= $2
    GROUP BY to_char(date, 'YYYY-MM'), display_category, category
    ORDER BY month, account_type
  `, [startDate, endDate]);
  return res.rows;
}

/**
 * Project/Fund financial report — income vs spend per restricted program
 * (unrestricted activity rolls up into one line).
 * Route fields: project_or_fund, total_income, total_expense, net_surplus.
 */
export async function getProjectFundFinancialReport(startDate: string, endDate: string) {
  const res = await queryPostgres(`
    SELECT
      COALESCE(restricted_program, 'Unrestricted Funds') as project_or_fund,
      SUM(CASE WHEN txn_type='money_in' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN txn_type='money_out' THEN amount ELSE 0 END) as total_expense,
      SUM(CASE WHEN txn_type='money_in' THEN amount ELSE 0 END) -
      SUM(CASE WHEN txn_type='money_out' THEN amount ELSE 0 END) as net_surplus
    FROM finance_transactions_ledger
    WHERE posted_status = 'posted' AND date >= $1 AND date <= $2
    GROUP BY restricted_program
    ORDER BY project_or_fund
  `, [startDate, endDate]);
  return res.rows;
}

/**
 * Expenses grouped by category/subcategory. There is no chart of accounts in
 * this schema, so the subcategory serves as the account code.
 * Route fields: account_code, category, total_expense.
 */
export async function getExpenseByCategoryReport(startDate: string, endDate: string) {
  const res = await queryPostgres(`
    SELECT
      COALESCE(subcategory, category, 'Uncategorized') as account_code,
      COALESCE(category, 'Expense') as category,
      SUM(amount) as total_expense
    FROM finance_transactions_ledger
    WHERE posted_status = 'posted' AND txn_type = 'money_out'
      AND date >= $1 AND date <= $2
    GROUP BY subcategory, category
    ORDER BY total_expense DESC
  `, [startDate, endDate]);
  return res.rows;
}

/**
 * Receipts register for the period (issued + voided; drafts excluded).
 * Route fields: receipt_number, issue_date, amount, currency, payment_method,
 * client_name, invoice_number, status.
 */
export async function getReceiptsReport(startDate: string, endDate: string) {
  const res = await queryPostgres(`
    SELECT
      r.receipt_number,
      r.receipt_date::text as issue_date,
      r.amount_received as amount,
      r.currency,
      r.payment_method,
      COALESCE(c.name, r.received_from) as client_name,
      i.invoice_number,
      r.status
    FROM finance_receipts r
    LEFT JOIN finance_contacts c ON c.id = r.contact_id
    LEFT JOIN finance_invoices i ON i.id = r.related_invoice_id
    WHERE r.status <> 'draft' AND r.receipt_date >= $1 AND r.receipt_date <= $2
    ORDER BY r.receipt_date, r.id
  `, [startDate, endDate]);
  return res.rows;
}

/**
 * Trial Balance for a fiscal (calendar) year, from the V2 general ledger
 * (finance_chart_of_accounts + posted finance_journal_entries/lines).
 * Lists every active account so the GL page doubles as a chart-of-accounts
 * view; balance is signed by normal balance side (debit-normal for
 * asset/expense, credit-normal for liability/equity/income).
 * Page fields (gl/page.tsx): id, account_code, account_name, total_debit,
 * total_credit, balance.
 */
export async function getTrialBalance(fiscalYear: number) {
  const res = await queryPostgres(`
    SELECT
      a.id,
      a.account_code,
      a.account_name,
      a.account_type,
      COALESCE(s.total_debit, 0) as total_debit,
      COALESCE(s.total_credit, 0) as total_credit,
      CASE WHEN a.account_type IN ('asset', 'expense')
        THEN COALESCE(s.total_debit, 0) - COALESCE(s.total_credit, 0)
        ELSE COALESCE(s.total_credit, 0) - COALESCE(s.total_debit, 0)
      END as balance
    FROM finance_chart_of_accounts a
    LEFT JOIN (
      SELECT jl.account_id, SUM(jl.debit) as total_debit, SUM(jl.credit) as total_credit
      FROM finance_journal_lines jl
      JOIN finance_journal_entries je ON je.id = jl.journal_id
      WHERE je.status = 'posted' AND EXTRACT(YEAR FROM je.entry_date) = $1
      GROUP BY jl.account_id
    ) s ON s.account_id = a.id
    WHERE a.is_active = 1
    ORDER BY a.account_code
  `, [fiscalYear]);
  return res.rows;
}

/**
 * Per-account ledger detail — posted journal lines for one account in a
 * date range, with a running balance.
 */
export async function getAccountDetail(accountId: number, startDate: string, endDate: string) {
  const res = await queryPostgres(`
    SELECT
      jl.id,
      je.entry_number,
      je.entry_date::text as entry_date,
      COALESCE(jl.description, je.description, '') as description,
      jl.debit,
      jl.credit,
      SUM(jl.debit - jl.credit) OVER (ORDER BY je.entry_date, je.id, jl.id) as running_balance
    FROM finance_journal_lines jl
    JOIN finance_journal_entries je ON je.id = jl.journal_id
    WHERE je.status = 'posted' AND jl.account_id = $1
      AND je.entry_date >= $2 AND je.entry_date <= $3
    ORDER BY je.entry_date, je.id, jl.id
  `, [accountId, startDate, endDate]);
  return res.rows;
}
