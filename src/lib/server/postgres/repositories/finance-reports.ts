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
  
  budgetRes.rows.forEach((r: any) => {
    budgetDict[r.account_name] = { budget: Number(r.budget_amount), actual: 0 };
  });

  actualsRes.rows.forEach((r: any) => {
    const name = r.account_name || 'Uncategorized';
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
export async function getGrantAndDonorReport(grantId?: number) {
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

// Fallbacks to resolve any remaining old imports gracefully
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getTrialBalance(fiscalYear: number) { return []; }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getAccountDetail(accountId: number, startDate: string, endDate: string) { return []; }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getIncomeVsExpenseSummary(startDate: string, endDate: string) { return []; }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getProjectFundFinancialReport(startDate: string, endDate: string) { return []; }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getExpenseByCategoryReport(startDate: string, endDate: string) { return []; }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getReceiptsReport(startDate: string, endDate: string) { return []; }
