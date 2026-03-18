import { queryPostgres } from "../client";

/**
 * Generates a Trial Balance by account.
 */
export async function getTrialBalance(fiscalYear: number) {
  const sql = `
    SELECT 
      coa.account_code,
      coa.account_name,
      coa.account_type,
      SUM(jl.debit) as total_debit,
      SUM(jl.credit) as total_credit,
      SUM(jl.debit) - SUM(jl.credit) as balance
    FROM finance_chart_of_accounts coa
    JOIN finance_journal_lines jl ON jl.account_id = coa.id
    JOIN finance_journal_entries je ON jl.journal_id = je.id
    WHERE je.status = 'posted'
      AND EXTRACT(YEAR FROM je.entry_date) = $1
    GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
    ORDER BY coa.account_code;
  `;
  const res = await queryPostgres(sql, [fiscalYear]);
  return res.rows;
}

/**
 * Generates Statement of Activities (Income Statement).
 */
export async function getStatementOfActivities(startDate: string, endDate: string) {
  const sql = `
    SELECT 
      coa.account_type,
      coa.account_name,
      SUM(jl.credit) - SUM(jl.debit) as net_amount
    FROM finance_chart_of_accounts coa
    JOIN finance_journal_lines jl ON jl.account_id = coa.id
    JOIN finance_journal_entries je ON jl.journal_id = je.id
    WHERE je.status = 'posted'
      AND je.entry_date BETWEEN $1 AND $2
      AND coa.account_type IN ('income', 'expense')
    GROUP BY coa.account_type, coa.account_name
    ORDER BY coa.account_type DESC, coa.account_name;
  `;
  const res = await queryPostgres(sql, [startDate, endDate]);
  return res.rows;
}

/**
 * Generates Statement of Financial Position (Balance Sheet).
 */
export async function getStatementOfFinancialPosition(asOfDate: string) {
  const sql = `
    SELECT 
      coa.account_type,
      coa.account_name,
      CASE 
        WHEN coa.account_type = 'asset' THEN SUM(jl.debit) - SUM(jl.credit)
        ELSE SUM(jl.credit) - SUM(jl.debit)
      END as balance
    FROM finance_chart_of_accounts coa
    JOIN finance_journal_lines jl ON jl.account_id = coa.id
    JOIN finance_journal_entries je ON jl.journal_id = je.id
    WHERE je.status = 'posted'
      AND je.entry_date <= $1
      AND coa.account_type IN ('asset', 'liability', 'equity')
    GROUP BY coa.account_type, coa.account_name
    ORDER BY coa.account_type, coa.account_name;
  `;
  const res = await queryPostgres(sql, [asOfDate]);
  return res.rows;
}

/**
 * Drill-down: Get all journal lines for a specific account and period.
 */
export async function getAccountDetail(accountId: number, startDate: string, endDate: string) {
  const sql = `
    SELECT 
      je.entry_number,
      je.entry_date,
      je.description as entry_desc,
      jl.description as line_desc,
      jl.debit,
      jl.credit,
      f.name as fund_name,
      p.name as program_name
    FROM finance_journal_lines jl
    JOIN finance_journal_entries je ON jl.journal_id = je.id
    JOIN finance_funds f ON jl.fund_id = f.id
    LEFT JOIN finance_programs p ON jl.program_id = p.id
    WHERE jl.account_id = $1
      AND je.entry_date BETWEEN $2 AND $3
      AND je.status = 'posted'
    ORDER BY je.entry_date, je.id;
  `;
  const res = await queryPostgres(sql, [accountId, startDate, endDate]);
  return res.rows;
}
/**
 * Generates a Cash Flow Statement (Direct/Indirect Hybrid).
 * Focuses on 'cash' account movements.
 */
export async function getCashFlowStatement(startDate: string, endDate: string) {
  const sql = `
    SELECT 
      je.entry_type as activity_category,
      coa.account_name,
      SUM(jl.debit) - SUM(jl.credit) as net_cash_impact
    FROM finance_journal_lines jl
    JOIN finance_journal_entries je ON jl.journal_id = je.id
    JOIN finance_chart_of_accounts coa ON jl.account_id = coa.id
    WHERE je.status = 'posted'
      AND je.entry_date BETWEEN $1 AND $2
      AND coa.account_type IN ('asset', 'liability', 'equity', 'income', 'expense')
      -- Simplified: Looking for entries where one side is a cash account
      AND je.id IN (
        SELECT journal_id 
        FROM finance_journal_lines inner_jl
        JOIN finance_chart_of_accounts inner_coa ON inner_jl.account_id = inner_coa.id
        WHERE inner_coa.is_cash_account = true
      )
    GROUP BY je.entry_type, coa.account_name
    ORDER BY je.entry_type;
  `;
  const res = await queryPostgres(sql, [startDate, endDate]);
  return res.rows;
}

/**
 * Generates Budget vs. Actual (Variance Analysis) report.
 */
export async function getBudgetVsActual(fiscalYear: number, budgetPlanId: number) {
  const sql = `
    SELECT 
      coa.account_code,
      coa.account_name,
      bl.budget_amount,
      (
        SELECT COALESCE(SUM(jl.debit) - SUM(jl.credit), 0)
        FROM finance_journal_lines jl
        JOIN finance_journal_entries je ON jl.journal_id = je.id
        WHERE jl.account_id = coa.id
          AND je.status = 'posted'
          AND EXTRACT(YEAR FROM je.entry_date) = $1
      ) as actual_amount,
      bl.budget_amount - (
        SELECT COALESCE(SUM(jl.debit) - SUM(jl.credit), 0)
        FROM finance_journal_lines jl
        JOIN finance_journal_entries je ON jl.journal_id = je.id
        WHERE jl.account_id = coa.id
          AND je.status = 'posted'
          AND EXTRACT(YEAR FROM je.entry_date) = $1
      ) as variance,
      CASE 
        WHEN bl.budget_amount = 0 THEN 0
        ELSE ((bl.budget_amount - (
          SELECT COALESCE(SUM(jl.debit) - SUM(jl.credit), 0)
          FROM finance_journal_lines jl
          JOIN finance_journal_entries je ON jl.journal_id = je.id
          WHERE jl.account_id = coa.id
            AND je.status = 'posted'
            AND EXTRACT(YEAR FROM je.entry_date) = $1
        )) / bl.budget_amount) * 100
      END as variance_percentage
    FROM finance_budget_lines bl
    JOIN finance_chart_of_accounts coa ON bl.account_id = coa.id
    WHERE bl.plan_id = $2
    ORDER BY coa.account_code;
  `;
  const res = await queryPostgres(sql, [fiscalYear, budgetPlanId]);
  return res.rows;
}

/**
 * Generates Grant and Donor Reports (Restricted vs. Unrestricted).
 */
export async function getGrantAndDonorReport(grantId?: number) {
  const sql = `
    SELECT 
      g.name as grant_name,
      f.name as fund_name,
      f.fund_type, -- 'restricted', 'unrestricted', 'designated'
      coa.account_name,
      SUM(jl.debit) as total_debit,
      SUM(jl.credit) as total_credit,
      SUM(jl.credit) - SUM(jl.debit) as net_available
    FROM finance_journal_lines jl
    JOIN finance_journal_entries je ON jl.journal_id = je.id
    JOIN finance_funds f ON jl.fund_id = f.id
    LEFT JOIN finance_grants g ON jl.grant_id = g.id
    JOIN finance_chart_of_accounts coa ON jl.account_id = coa.id
    WHERE je.status = 'posted'
      ${grantId ? 'AND g.id = $1' : ''}
    GROUP BY g.id, g.name, f.id, f.name, f.fund_type, coa.id, coa.account_name
    ORDER BY f.fund_type, g.name, coa.account_code;
  `;
  const params = grantId ? [grantId] : [];
  const res = await queryPostgres(sql, params);
  return res.rows;
}

/**
 * 1. Income vs Expense Summary
 */
export async function getIncomeVsExpenseSummary(startDate: string, endDate: string) {
  const sql = `
    SELECT 
      DATE_TRUNC('month', je.entry_date) as month,
      coa.account_type,
      SUM(CASE WHEN coa.account_type = 'income' THEN jl.credit - jl.debit ELSE 0 END) as total_income,
      SUM(CASE WHEN coa.account_type = 'expense' THEN jl.debit - jl.credit ELSE 0 END) as total_expense
    FROM finance_journal_lines jl
    JOIN finance_journal_entries je ON jl.journal_id = je.id
    JOIN finance_chart_of_accounts coa ON jl.account_id = coa.id
    WHERE je.status = 'posted'
      AND je.entry_date BETWEEN $1 AND $2
      AND coa.account_type IN ('income', 'expense')
    GROUP BY DATE_TRUNC('month', je.entry_date), coa.account_type
    ORDER BY DATE_TRUNC('month', je.entry_date);
  `;
  const res = await queryPostgres(sql, [startDate, endDate]);
  return res.rows;
}

/**
 * 3. Project / Fund Financial Report
 */
export async function getProjectFundFinancialReport(startDate: string, endDate: string) {
  const sql = `
    SELECT 
      COALESCE(p.name, f.name, 'Unallocated') as project_or_fund,
      SUM(CASE WHEN coa.account_type = 'income' THEN jl.credit - jl.debit ELSE 0 END) as total_income,
      SUM(CASE WHEN coa.account_type = 'expense' THEN jl.debit - jl.credit ELSE 0 END) as total_expense,
      SUM(CASE WHEN coa.account_type = 'income' THEN jl.credit - jl.debit ELSE 0 END) - 
      SUM(CASE WHEN coa.account_type = 'expense' THEN jl.debit - jl.credit ELSE 0 END) as net_surplus
    FROM finance_journal_lines jl
    JOIN finance_journal_entries je ON jl.journal_id = je.id
    JOIN finance_chart_of_accounts coa ON jl.account_id = coa.id
    LEFT JOIN finance_projects p ON jl.project_id = p.id
    LEFT JOIN finance_funds f ON jl.fund_id = f.id
    WHERE je.status = 'posted'
      AND je.entry_date BETWEEN $1 AND $2
      AND coa.account_type IN ('income', 'expense')
    GROUP BY p.name, f.name
    ORDER BY net_surplus DESC;
  `;
  const res = await queryPostgres(sql, [startDate, endDate]);
  return res.rows;
}

/**
 * 4. Expense by Category Report
 */
export async function getExpenseByCategoryReport(startDate: string, endDate: string) {
  const sql = `
    SELECT 
      coa.account_code,
      coa.account_name as category,
      SUM(jl.debit) - SUM(jl.credit) as total_expense
    FROM finance_journal_lines jl
    JOIN finance_journal_entries je ON jl.journal_id = je.id
    JOIN finance_chart_of_accounts coa ON jl.account_id = coa.id
    WHERE je.status = 'posted'
      AND je.entry_date BETWEEN $1 AND $2
      AND coa.account_type = 'expense'
    GROUP BY coa.account_code, coa.account_name
    ORDER BY total_expense DESC;
  `;
  const res = await queryPostgres(sql, [startDate, endDate]);
  return res.rows;
}

/**
 * 6. Receipts Report
 */
export async function getReceiptsReport(startDate: string, endDate: string) {
  const sql = `
    SELECT 
      r.receipt_number,
      r.issue_date,
      r.amount,
      r.currency,
      r.payment_method,
      COALESCE(c.name, r.client_name) as client_name,
      i.invoice_number,
      r.status
    FROM finance_receipts r
    LEFT JOIN finance_contacts c ON r.client_id = c.id
    LEFT JOIN finance_invoices i ON r.invoice_id = i.id
    WHERE r.issue_date BETWEEN $1 AND $2
    ORDER BY r.issue_date DESC, r.receipt_number DESC;
  `;
  const res = await queryPostgres(sql, [startDate, endDate]);
  return res.rows;
}
