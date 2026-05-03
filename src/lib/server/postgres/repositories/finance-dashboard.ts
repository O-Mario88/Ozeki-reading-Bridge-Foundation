import { queryPostgres } from "@/lib/server/postgres/client";
import { getUgxPerUsdPostgres } from "@/lib/server/postgres/repositories/settings";

/* ────────────────────────────────────────────────────────────────────────── */
/* Spending trend — daily income vs expenses for the last N days              */
/* ────────────────────────────────────────────────────────────────────────── */

export type TrendPoint = {
  date: string;          // YYYY-MM-DD
  income: number;        // UGX
  expenses: number;      // UGX
};

export type SpendingTrend = {
  points: TrendPoint[];
  totalIncome: number;
  totalExpenses: number;
  netSurplus: number;
  deltaIncomePct: number | null;       // vs previous period
  deltaExpensesPct: number | null;
};

export async function getSpendingTrendPostgres(days = 90): Promise<SpendingTrend> {
  const dayCount = Math.max(7, Math.min(365, Math.floor(days)));

  try {
    const res = await queryPostgres(
      `WITH series AS (
         SELECT generate_series(
           date_trunc('day', NOW() - ($1 || ' days')::interval),
           date_trunc('day', NOW()),
           '1 day'::interval
         )::date AS d
       ),
       income AS (
         SELECT receipt_date::date AS d, SUM(amount_received)::numeric AS amt
         FROM finance_receipts
         WHERE status IN ('issued', 'paid')
           AND receipt_date >= NOW() - ($1 || ' days')::interval
         GROUP BY receipt_date::date
       ),
       expense AS (
         SELECT date::date AS d, SUM(amount)::numeric AS amt
         FROM finance_expenses
         WHERE status = 'posted'
           AND date >= NOW() - ($1 || ' days')::interval
         GROUP BY date::date
       )
       SELECT
         to_char(s.d, 'YYYY-MM-DD') AS date,
         COALESCE(i.amt, 0)::numeric AS income,
         COALESCE(e.amt, 0)::numeric AS expenses
       FROM series s
       LEFT JOIN income i ON i.d = s.d
       LEFT JOIN expense e ON e.d = s.d
       ORDER BY s.d ASC`,
      [String(dayCount)],
    );

    // Comparison: previous equivalent window
    const prevRes = await queryPostgres(
      `SELECT
         (SELECT COALESCE(SUM(amount_received), 0)::numeric FROM finance_receipts
            WHERE status IN ('issued','paid')
              AND receipt_date >= NOW() - ($1 || ' days')::interval
              AND receipt_date <  NOW() - ($2 || ' days')::interval) AS prev_income,
         (SELECT COALESCE(SUM(amount), 0)::numeric FROM finance_expenses
            WHERE status = 'posted'
              AND date >= NOW() - ($1 || ' days')::interval
              AND date <  NOW() - ($2 || ' days')::interval) AS prev_expenses`,
      [String(dayCount * 2), String(dayCount)],
    );

    const points: TrendPoint[] = res.rows.map((r) => ({
      date: String(r.date),
      income: Math.round(Number(r.income ?? 0)),
      expenses: Math.round(Number(r.expenses ?? 0)),
    }));
    const totalIncome = points.reduce((a, p) => a + p.income, 0);
    const totalExpenses = points.reduce((a, p) => a + p.expenses, 0);
    const prevIncome = Number(prevRes.rows[0]?.prev_income ?? 0);
    const prevExpenses = Number(prevRes.rows[0]?.prev_expenses ?? 0);

    return {
      points,
      totalIncome,
      totalExpenses,
      netSurplus: totalIncome - totalExpenses,
      deltaIncomePct: prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 1000) / 10 : null,
      deltaExpensesPct: prevExpenses > 0 ? Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 1000) / 10 : null,
    };
  } catch {
    return { points: [], totalIncome: 0, totalExpenses: 0, netSurplus: 0, deltaIncomePct: null, deltaExpensesPct: null };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Fund allocation — expense breakdown by category                            */
/* ────────────────────────────────────────────────────────────────────────── */

export type AllocationSlice = {
  label: string;
  amount: number;
  pct: number;
  color: string;
};

export type FundAllocation = {
  totalSpent: number;
  slices: AllocationSlice[];
};

const ALLOCATION_BUCKETS: Array<{ label: string; match: RegExp; color: string }> = [
  { label: "Programme Delivery", match: /(training|coaching|assessment|programme|program|delivery|learner|teacher)/i, color: "#006b61" },
  { label: "Operations", match: /(operation|admin|office|overhead|salary|salaries|payroll)/i, color: "#0ea5a3" },
  { label: "Fundraising", match: /(fundrais|donor|marketing|event)/i, color: "#ff7235" },
  { label: "Other", match: /.*/, color: "#94a3b8" },
];

export async function getFundAllocationPostgres(): Promise<FundAllocation> {
  try {
    const res = await queryPostgres(
      `SELECT COALESCE(category, 'Other') AS category,
              COALESCE(subcategory, '') AS subcategory,
              SUM(amount)::numeric AS total
       FROM finance_expenses
       WHERE status = 'posted'
       GROUP BY category, subcategory`,
    );

    const buckets = new Map<string, { amount: number; color: string }>();
    let totalSpent = 0;
    for (const r of res.rows) {
      const amt = Number(r.total ?? 0);
      totalSpent += amt;
      const tag = `${r.category} ${r.subcategory}`;
      const bucket = ALLOCATION_BUCKETS.find((b) => b.match.test(tag)) ?? ALLOCATION_BUCKETS[ALLOCATION_BUCKETS.length - 1];
      const cur = buckets.get(bucket.label) ?? { amount: 0, color: bucket.color };
      cur.amount += amt;
      buckets.set(bucket.label, cur);
    }

    const slices: AllocationSlice[] = [...buckets.entries()]
      .map(([label, b]) => ({
        label,
        amount: Math.round(b.amount),
        pct: totalSpent > 0 ? Math.round((b.amount / totalSpent) * 1000) / 10 : 0,
        color: b.color,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { totalSpent: Math.round(totalSpent), slices };
  } catch {
    return { totalSpent: 0, slices: [] };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Recent transactions — unified view across receipts + expenses              */
/* ────────────────────────────────────────────────────────────────────────── */

export type RecentTransaction = {
  date: string;
  description: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  recordedBy: string;
};

export async function getRecentTransactionsPostgres(limit = 25): Promise<RecentTransaction[]> {
  try {
    const cap = Math.min(100, Math.max(1, Math.floor(limit)));
    const res = await queryPostgres(
      `(SELECT
          fr.receipt_date::text AS date,
          COALESCE(fr.description, fr.received_from, 'Income receipt') AS description,
          'income' AS type,
          COALESCE(fr.category, 'Other') AS category,
          fr.amount_received::numeric AS amount,
          fr.currency,
          fr.status,
          fr.receipt_number AS reference,
          COALESCE(u.full_name, 'System') AS recorded_by
        FROM finance_receipts fr
        LEFT JOIN portal_users u ON u.id = fr.created_by_user_id
        WHERE fr.status IN ('issued', 'paid'))
       UNION ALL
       (SELECT
          fe.date::text AS date,
          COALESCE(fe.description, fe.vendor_name, 'Expense') AS description,
          'expense' AS type,
          COALESCE(fe.category, 'Other') AS category,
          fe.amount::numeric AS amount,
          fe.currency,
          fe.status,
          fe.expense_number AS reference,
          COALESCE(u.full_name, 'System') AS recorded_by
        FROM finance_expenses fe
        LEFT JOIN portal_users u ON u.id = fe.created_by_user_id
        WHERE fe.status = 'posted')
       ORDER BY date DESC
       LIMIT ${cap}`,
    );
    return res.rows.map((r) => ({
      date: String(r.date ?? "").slice(0, 10),
      description: String(r.description ?? ""),
      type: (r.type as "income" | "expense") ?? "expense",
      category: String(r.category ?? "Other"),
      amount: Number(r.amount ?? 0),
      currency: String(r.currency ?? "UGX"),
      status: String(r.status ?? ""),
      reference: String(r.reference ?? ""),
      recordedBy: String(r.recorded_by ?? "System"),
    }));
  } catch {
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* KPI sparklines — last 30 days, daily totals (for mini trend in KPI cards)  */
/* ────────────────────────────────────────────────────────────────────────── */

export type Sparkline = number[];

export async function getKpiSparklinesPostgres(): Promise<{
  income: Sparkline;
  expenses: Sparkline;
  costPerLearner: Sparkline;
}> {
  try {
    const res = await queryPostgres(
      `WITH series AS (
         SELECT generate_series(
           date_trunc('day', NOW() - INTERVAL '29 days'),
           date_trunc('day', NOW()),
           '1 day'::interval
         )::date AS d
       )
       SELECT
         (SELECT COALESCE(SUM(amount_received), 0)::numeric FROM finance_receipts
            WHERE status IN ('issued','paid') AND receipt_date::date = s.d) AS income,
         (SELECT COALESCE(SUM(amount), 0)::numeric FROM finance_expenses
            WHERE status = 'posted' AND date::date = s.d) AS expenses
       FROM series s
       ORDER BY s.d ASC`,
    );
    const income = res.rows.map((r) => Number(r.income ?? 0));
    const expenses = res.rows.map((r) => Number(r.expenses ?? 0));
    // Cost-per-learner sparkline is approximated as cumulative expenses / cumulative learners.
    // Without daily learner-assessed counts we use expenses pattern as a proxy for trend shape.
    return { income, expenses, costPerLearner: expenses };
  } catch {
    return { income: [], expenses: [], costPerLearner: [] };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Convenience: USD conversion in a single place                              */
/* ────────────────────────────────────────────────────────────────────────── */

export async function getUsdRateForDashboard(): Promise<number> {
  return getUgxPerUsdPostgres();
}

/* ────────────────────────────────────────────────────────────────────────── */
/* KPI deltas — programme delivery + cost per learner, current vs prior 30d    */
/* ────────────────────────────────────────────────────────────────────────── */

export type KpiDeltas = {
  programmeDeliveryDeltaPp: number | null; // percentage points, current 30d vs prior 30d
  costPerLearnerDeltaPct: number | null;   // % change in cost-per-learner
};

export async function getKpiDeltasPostgres(): Promise<KpiDeltas> {
  try {
    const res = await queryPostgres(
      `WITH spend_now AS (
         SELECT
           COALESCE(SUM(amount), 0)::numeric AS total_now,
           COALESCE(SUM(amount) FILTER (
             WHERE LOWER(COALESCE(category, '')) IN ('admin','administration','operations','office','overhead')
                OR LOWER(COALESCE(subcategory, '')) LIKE '%admin%'
                OR LOWER(COALESCE(subcategory, '')) LIKE '%office%'
           ), 0)::numeric AS admin_now
         FROM finance_expenses
         WHERE status = 'posted' AND date >= NOW() - INTERVAL '30 days'
       ),
       spend_prior AS (
         SELECT
           COALESCE(SUM(amount), 0)::numeric AS total_prior,
           COALESCE(SUM(amount) FILTER (
             WHERE LOWER(COALESCE(category, '')) IN ('admin','administration','operations','office','overhead')
                OR LOWER(COALESCE(subcategory, '')) LIKE '%admin%'
                OR LOWER(COALESCE(subcategory, '')) LIKE '%office%'
           ), 0)::numeric AS admin_prior
         FROM finance_expenses
         WHERE status = 'posted'
           AND date >= NOW() - INTERVAL '60 days'
           AND date <  NOW() - INTERVAL '30 days'
       ),
       learners_now AS (
         SELECT COUNT(DISTINCT learner_uid)::int AS n
         FROM assessment_records
         WHERE learner_uid IS NOT NULL
           AND assessment_date >= NOW() - INTERVAL '30 days'
       ),
       learners_prior AS (
         SELECT COUNT(DISTINCT learner_uid)::int AS n
         FROM assessment_records
         WHERE learner_uid IS NOT NULL
           AND assessment_date >= NOW() - INTERVAL '60 days'
           AND assessment_date <  NOW() - INTERVAL '30 days'
       )
       SELECT
         (SELECT total_now FROM spend_now) AS total_now,
         (SELECT admin_now FROM spend_now) AS admin_now,
         (SELECT total_prior FROM spend_prior) AS total_prior,
         (SELECT admin_prior FROM spend_prior) AS admin_prior,
         (SELECT n FROM learners_now) AS learners_now,
         (SELECT n FROM learners_prior) AS learners_prior`,
    );
    const r = res.rows[0] ?? {};
    const totalNow = Number(r.total_now ?? 0);
    const adminNow = Number(r.admin_now ?? 0);
    const totalPrior = Number(r.total_prior ?? 0);
    const adminPrior = Number(r.admin_prior ?? 0);
    const learnersNow = Number(r.learners_now ?? 0);
    const learnersPrior = Number(r.learners_prior ?? 0);

    const deliveryNowPct = totalNow > 0 ? ((totalNow - adminNow) / totalNow) * 100 : null;
    const deliveryPriorPct = totalPrior > 0 ? ((totalPrior - adminPrior) / totalPrior) * 100 : null;
    const programmeDeliveryDeltaPp = deliveryNowPct != null && deliveryPriorPct != null
      ? Math.round((deliveryNowPct - deliveryPriorPct) * 10) / 10
      : null;

    const cplNow = learnersNow > 0 ? totalNow / learnersNow : null;
    const cplPrior = learnersPrior > 0 ? totalPrior / learnersPrior : null;
    const costPerLearnerDeltaPct = cplNow != null && cplPrior != null && cplPrior > 0
      ? Math.round(((cplNow - cplPrior) / cplPrior) * 1000) / 10
      : null;

    return { programmeDeliveryDeltaPp, costPerLearnerDeltaPct };
  } catch {
    return { programmeDeliveryDeltaPp: null, costPerLearnerDeltaPct: null };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Total transaction count — for pagination                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export async function getTransactionCountPostgres(): Promise<number> {
  try {
    const res = await queryPostgres(
      `SELECT
        (SELECT COUNT(*)::int FROM finance_receipts WHERE status IN ('issued','paid'))
        + (SELECT COUNT(*)::int FROM finance_expenses WHERE status = 'posted') AS total`,
    );
    return Number(res.rows[0]?.total ?? 0);
  } catch {
    return 0;
  }
}
