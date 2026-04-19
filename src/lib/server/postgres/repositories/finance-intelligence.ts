import { queryPostgres } from "@/lib/server/postgres/client";
import { getUgxPerUsdPostgres } from "@/lib/server/postgres/repositories/settings";

/* ────────────────────────────────────────────────────────────────────────── */
/* 1. COST-PER-LEARNER                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

export type CostPerLearnerRow = {
  scope: string;               // district name or "National"
  scopeType: "national" | "district";
  totalSpendUgx: number;
  totalSpendUsd: number;
  learnersAssessed: number;
  costPerLearnerUgx: number;
  costPerLearnerUsd: number;
  term: string | null;
};

export type CostPerLearnerReport = {
  periodStart: string | null;
  periodEnd: string | null;
  usdRate: number;
  national: CostPerLearnerRow;
  districts: CostPerLearnerRow[];
};

function toUsd(ugx: number, rate: number): number {
  return rate > 0 ? Math.round(ugx / rate) : 0;
}

export async function getCostPerLearnerPostgres(filters: {
  periodStart?: string;
  periodEnd?: string;
  usdRate?: number;
} = {}): Promise<CostPerLearnerReport> {
  const rate = filters.usdRate && filters.usdRate > 0 ? filters.usdRate : await getUgxPerUsdPostgres();

  const params: unknown[] = [];
  const expenseConditions: string[] = ["fe.status = 'posted'"];
  const learnerConditions: string[] = ["ar.learner_uid IS NOT NULL"];
  let idx = 1;

  if (filters.periodStart) {
    expenseConditions.push(`fe.date >= $${idx}::date`);
    learnerConditions.push(`ar.assessment_date >= $${idx}::date`);
    params.push(filters.periodStart);
    idx++;
  }
  if (filters.periodEnd) {
    expenseConditions.push(`fe.date <= $${idx}::date`);
    learnerConditions.push(`ar.assessment_date <= $${idx}::date`);
    params.push(filters.periodEnd);
    idx++;
  }

  const expenseWhere = `WHERE ${expenseConditions.join(" AND ")}`;
  const learnerWhere = `WHERE ${learnerConditions.join(" AND ")}`;

  const [nationalExp, nationalLearners, byDistrict] = await Promise.all([
    queryPostgres(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM finance_expenses fe ${expenseWhere}`,
      params,
    ),
    queryPostgres(
      `SELECT COUNT(DISTINCT ar.learner_uid)::int AS learners FROM assessment_records ar ${learnerWhere}`,
      params,
    ),
    // District cost allocation: sum restricted-by-district expenses; plus pro-rata share of unrestricted spend
    queryPostgres(
      `WITH restricted AS (
         SELECT
           LOWER(TRIM(fe.restricted_geo_id)) AS district_key,
           COALESCE(SUM(fe.amount), 0)::numeric AS amt
         FROM finance_expenses fe
         ${expenseWhere}
           AND fe.restricted_flag IS TRUE
           AND LOWER(COALESCE(fe.restricted_geo_scope, '')) IN ('district','district_id')
           AND fe.restricted_geo_id IS NOT NULL
         GROUP BY LOWER(TRIM(fe.restricted_geo_id))
       ),
       unrestricted AS (
         SELECT COALESCE(SUM(amount), 0)::numeric AS total
         FROM finance_expenses fe
         ${expenseWhere}
           AND (fe.restricted_flag IS NOT TRUE OR fe.restricted_flag IS NULL)
       ),
       district_learners AS (
         SELECT
           LOWER(TRIM(s.district)) AS district_key,
           MAX(s.district) AS district,
           COUNT(DISTINCT ar.learner_uid)::int AS learners
         FROM assessment_records ar
         JOIN schools_directory s ON s.id = ar.school_id
         ${learnerWhere}
           AND s.district IS NOT NULL AND s.district <> ''
         GROUP BY LOWER(TRIM(s.district))
         HAVING COUNT(DISTINCT ar.learner_uid) > 0
       ),
       total_national_learners AS (
         SELECT SUM(learners)::int AS n FROM district_learners
       )
       SELECT
         dl.district,
         dl.learners,
         COALESCE(r.amt, 0)::numeric AS restricted_spend,
         CASE
           WHEN (SELECT n FROM total_national_learners) > 0
           THEN (dl.learners::numeric / (SELECT n FROM total_national_learners)) * (SELECT total FROM unrestricted)
           ELSE 0
         END AS unrestricted_share
       FROM district_learners dl
       LEFT JOIN restricted r ON r.district_key = dl.district_key
       ORDER BY dl.district`,
      params,
    ),
  ]);

  const nationalSpend = Number(nationalExp.rows[0]?.total ?? 0);
  const nationalLearnerCount = Number(nationalLearners.rows[0]?.learners ?? 0);

  const national: CostPerLearnerRow = {
    scope: "National",
    scopeType: "national",
    totalSpendUgx: Math.round(nationalSpend),
    totalSpendUsd: toUsd(nationalSpend, rate),
    learnersAssessed: nationalLearnerCount,
    costPerLearnerUgx: nationalLearnerCount > 0 ? Math.round(nationalSpend / nationalLearnerCount) : 0,
    costPerLearnerUsd: nationalLearnerCount > 0 ? toUsd(nationalSpend / nationalLearnerCount, rate) : 0,
    term: null,
  };

  const districts: CostPerLearnerRow[] = byDistrict.rows.map((r) => {
    const total = Number(r.restricted_spend ?? 0) + Number(r.unrestricted_share ?? 0);
    const learners = Number(r.learners ?? 0);
    return {
      scope: String(r.district ?? ""),
      scopeType: "district" as const,
      totalSpendUgx: Math.round(total),
      totalSpendUsd: toUsd(total, rate),
      learnersAssessed: learners,
      costPerLearnerUgx: learners > 0 ? Math.round(total / learners) : 0,
      costPerLearnerUsd: learners > 0 ? toUsd(total / learners, rate) : 0,
      term: null,
    };
  }).sort((a, b) => a.costPerLearnerUgx - b.costPerLearnerUgx);

  return {
    periodStart: filters.periodStart ?? null,
    periodEnd: filters.periodEnd ?? null,
    usdRate: rate,
    national,
    districts,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 2. DONATION → SCHOOL → OUTCOME CHAIN                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export type DonorOutcomeChain = {
  sponsorshipReference: string;
  donorDisplayName: string;
  amount: number;
  currency: string;
  targetType: string;
  targetName: string | null;
  district: string | null;
  region: string | null;
  reachedSchools: Array<{
    schoolId: number;
    schoolName: string;
    district: string;
    enrollment: number;
    learnersAssessed: number;
    coachingVisits: number;
    trainingSessions: number;
    baselineComposite: number | null;
    endlineComposite: number | null;
    scoreImprovementPp: number | null;
  }>;
  totals: {
    schools: number;
    learners: number;
    teachersTrained: number;
    coachingVisits: number;
    trainingSessions: number;
    avgScoreImprovementPp: number | null;
  };
};

export async function getDonorOutcomeChainPostgres(sponsorshipReference: string): Promise<DonorOutcomeChain | null> {
  const spRes = await queryPostgres(
    `SELECT sponsorship_reference, sponsorship_type, sponsorship_target_name,
            school_id, district, sub_region, region,
            donor_name, organization_name, anonymous,
            amount::numeric AS amount, currency, paid_at::text AS paid_at
     FROM sponsorships WHERE sponsorship_reference = $1
       AND payment_status IN ('Completed', 'Paid') LIMIT 1`,
    [sponsorshipReference],
  );
  const sp = spRes.rows[0];
  if (!sp) return null;

  const schoolIdsRes = await queryPostgres(
    sp.school_id
      ? `SELECT id FROM schools_directory WHERE id = $1`
      : sp.district
        ? `SELECT id FROM schools_directory WHERE LOWER(district) = LOWER($1)`
        : sp.region
          ? `SELECT id FROM schools_directory WHERE LOWER(region) = LOWER($1)`
          : `SELECT id FROM schools_directory WHERE false`,
    sp.school_id ? [Number(sp.school_id)] : sp.district ? [String(sp.district)] : sp.region ? [String(sp.region)] : [],
  );
  const schoolIds = schoolIdsRes.rows.map((r) => Number(r.id));

  if (schoolIds.length === 0) {
    return {
      sponsorshipReference: String(sp.sponsorship_reference),
      donorDisplayName: sp.anonymous ? "Anonymous" : String(sp.organization_name ?? sp.donor_name ?? "Donor"),
      amount: Number(sp.amount),
      currency: String(sp.currency),
      targetType: String(sp.sponsorship_type),
      targetName: sp.sponsorship_target_name ? String(sp.sponsorship_target_name) : null,
      district: sp.district ? String(sp.district) : null,
      region: sp.region ? String(sp.region) : null,
      reachedSchools: [],
      totals: { schools: 0, learners: 0, teachersTrained: 0, coachingVisits: 0, trainingSessions: 0, avgScoreImprovementPp: null },
    };
  }

  const schoolsRes = await queryPostgres(
    `WITH base AS (
       SELECT
         s.id, s.name, s.district, s.enrollment_total,
         (SELECT COUNT(DISTINCT ar.learner_uid)::int FROM assessment_records ar WHERE ar.school_id = s.id) AS learners_assessed,
         (SELECT COUNT(*)::int FROM portal_records pr WHERE pr.school_id = s.id AND pr.module = 'visit') AS coaching_visits,
         (SELECT COUNT(*)::int FROM portal_records pr WHERE pr.school_id = s.id AND pr.module = 'training') AS training_sessions,
         (SELECT AVG(COALESCE(reading_comprehension_score,0) + COALESCE(fluency_accuracy_score,0) + COALESCE(decodable_words_score,0))::numeric / 3
            FROM assessment_records WHERE school_id = s.id AND assessment_type = 'baseline') AS baseline_comp,
         (SELECT AVG(COALESCE(reading_comprehension_score,0) + COALESCE(fluency_accuracy_score,0) + COALESCE(decodable_words_score,0))::numeric / 3
            FROM assessment_records WHERE school_id = s.id AND assessment_type = 'endline') AS endline_comp
       FROM schools_directory s
       WHERE s.id = ANY($1::int[])
     )
     SELECT * FROM base ORDER BY name ASC`,
    [schoolIds],
  );

  const reachedSchools = schoolsRes.rows.map((r) => {
    const b = r.baseline_comp != null ? Math.round(Number(r.baseline_comp) * 10) / 10 : null;
    const e = r.endline_comp != null ? Math.round(Number(r.endline_comp) * 10) / 10 : null;
    return {
      schoolId: Number(r.id),
      schoolName: String(r.name),
      district: String(r.district ?? ""),
      enrollment: Number(r.enrollment_total ?? 0),
      learnersAssessed: Number(r.learners_assessed ?? 0),
      coachingVisits: Number(r.coaching_visits ?? 0),
      trainingSessions: Number(r.training_sessions ?? 0),
      baselineComposite: b,
      endlineComposite: e,
      scoreImprovementPp: b != null && e != null ? Math.round((e - b) * 10) / 10 : null,
    };
  });

  const teacherCountRes = await queryPostgres(
    `SELECT COUNT(DISTINCT teacher_uid)::int AS n
     FROM portal_training_attendance
     WHERE school_id = ANY($1::int[]) AND attended IS TRUE AND teacher_uid IS NOT NULL`,
    [schoolIds],
  );

  const improvements = reachedSchools.map((s) => s.scoreImprovementPp).filter((v): v is number => v != null);
  const avgImprovement = improvements.length > 0
    ? Math.round((improvements.reduce((a, b) => a + b, 0) / improvements.length) * 10) / 10
    : null;

  return {
    sponsorshipReference: String(sp.sponsorship_reference),
    donorDisplayName: sp.anonymous ? "Anonymous" : String(sp.organization_name ?? sp.donor_name ?? "Donor"),
    amount: Number(sp.amount),
    currency: String(sp.currency),
    targetType: String(sp.sponsorship_type),
    targetName: sp.sponsorship_target_name ? String(sp.sponsorship_target_name) : null,
    district: sp.district ? String(sp.district) : null,
    region: sp.region ? String(sp.region) : null,
    reachedSchools,
    totals: {
      schools: reachedSchools.length,
      learners: reachedSchools.reduce((a, s) => a + s.learnersAssessed, 0),
      teachersTrained: Number(teacherCountRes.rows[0]?.n ?? 0),
      coachingVisits: reachedSchools.reduce((a, s) => a + s.coachingVisits, 0),
      trainingSessions: reachedSchools.reduce((a, s) => a + s.trainingSessions, 0),
      avgScoreImprovementPp: avgImprovement,
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 3. RESTRICTED FUND BURN RATE                                               */
/* ────────────────────────────────────────────────────────────────────────── */

export type RestrictedFundBurn = {
  id: string;
  label: string;
  program: string | null;
  geoScope: string | null;
  geoId: string | null;
  currency: string;
  totalReceived: number;
  totalSpent: number;
  remaining: number;
  burnPct: number;
  daysSinceFirstReceipt: number | null;
  expiresAt: string | null;
  expiresInDays: number | null;
  status: "healthy" | "warning" | "critical" | "expired";
  recentReceipts: number;
  recentExpenses: number;
};

function burnStatus(burnPct: number, expiresInDays: number | null): RestrictedFundBurn["status"] {
  if (expiresInDays != null && expiresInDays <= 0) return "expired";
  if (expiresInDays != null && expiresInDays <= 30 && burnPct < 50) return "critical";
  if (expiresInDays != null && expiresInDays <= 90 && burnPct < 70) return "warning";
  if (burnPct >= 95) return "healthy";
  return "healthy";
}

export async function getRestrictedFundsBurnPostgres(): Promise<RestrictedFundBurn[]> {
  // Aggregate restricted receipts vs restricted expenses, grouped by (program, geo_scope, geo_id)
  const res = await queryPostgres(
    `WITH inflows AS (
       SELECT
         COALESCE(restricted_program, '') AS program,
         COALESCE(restricted_geo_scope, '') AS geo_scope,
         COALESCE(restricted_geo_id, '') AS geo_id,
         MAX(COALESCE(currency, 'UGX')) AS currency,
         SUM(amount_received)::numeric AS total_in,
         MIN(receipt_date)::text AS first_receipt,
         COUNT(*) FILTER (WHERE receipt_date >= NOW() - INTERVAL '90 days')::int AS recent_count
       FROM finance_receipts
       WHERE restricted_flag IS TRUE AND status IN ('issued', 'paid')
       GROUP BY COALESCE(restricted_program, ''),
                COALESCE(restricted_geo_scope, ''),
                COALESCE(restricted_geo_id, '')
     ),
     outflows AS (
       SELECT
         COALESCE(restricted_program, '') AS program,
         COALESCE(restricted_geo_scope, '') AS geo_scope,
         COALESCE(restricted_geo_id, '') AS geo_id,
         SUM(amount)::numeric AS total_out,
         COUNT(*) FILTER (WHERE date >= NOW() - INTERVAL '90 days')::int AS recent_count
       FROM finance_expenses
       WHERE restricted_flag IS TRUE AND status = 'posted'
       GROUP BY COALESCE(restricted_program, ''),
                COALESCE(restricted_geo_scope, ''),
                COALESCE(restricted_geo_id, '')
     )
     SELECT
       i.program, i.geo_scope, i.geo_id, i.currency,
       COALESCE(i.total_in, 0)::numeric AS total_in,
       COALESCE(o.total_out, 0)::numeric AS total_out,
       i.first_receipt,
       COALESCE(i.recent_count, 0) AS recent_receipts,
       COALESCE(o.recent_count, 0) AS recent_expenses
     FROM inflows i
     LEFT JOIN outflows o
       ON o.program = i.program AND o.geo_scope = i.geo_scope AND o.geo_id = i.geo_id
     ORDER BY (COALESCE(i.total_in, 0) - COALESCE(o.total_out, 0)) DESC`,
  );

  // Pull grant expiry dates for matched programs
  const grantRes = await queryPostgres(
    `SELECT code, name, end_date::text AS end_date FROM finance_grants WHERE status != 'closed'`,
  ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));
  const grantByCode = new Map<string, { name: string; endDate: string | null }>();
  for (const g of grantRes.rows) {
    grantByCode.set(String(g.code ?? "").toLowerCase(), {
      name: String(g.name),
      endDate: g.end_date ? String(g.end_date) : null,
    });
  }

  const now = new Date();
  return res.rows.map((r) => {
    const program = r.program ? String(r.program) : null;
    const geoScope = r.geo_scope ? String(r.geo_scope) : null;
    const geoId = r.geo_id ? String(r.geo_id) : null;
    const totalIn = Number(r.total_in);
    const totalOut = Number(r.total_out);
    const remaining = totalIn - totalOut;
    const burnPct = totalIn > 0 ? Math.min(100, Math.round((totalOut / totalIn) * 100)) : 0;

    const grant = program ? grantByCode.get(program.toLowerCase()) : null;
    const expiresAt = grant?.endDate ?? null;
    const expiresInDays = expiresAt
      ? Math.round((new Date(expiresAt).getTime() - now.getTime()) / 86400000)
      : null;

    const firstReceipt = r.first_receipt ? String(r.first_receipt) : null;
    const daysSinceFirst = firstReceipt
      ? Math.round((now.getTime() - new Date(firstReceipt).getTime()) / 86400000)
      : null;

    const labelParts = [program, geoScope && geoId ? `${geoScope}: ${geoId}` : null].filter(Boolean);
    const label = labelParts.join(" · ") || "Unspecified restricted fund";

    return {
      id: `${program ?? "_"}__${geoScope ?? "_"}__${geoId ?? "_"}`,
      label,
      program,
      geoScope,
      geoId,
      currency: String(r.currency ?? "UGX"),
      totalReceived: Math.round(totalIn),
      totalSpent: Math.round(totalOut),
      remaining: Math.round(remaining),
      burnPct,
      daysSinceFirstReceipt: daysSinceFirst,
      expiresAt,
      expiresInDays,
      status: burnStatus(burnPct, expiresInDays),
      recentReceipts: Number(r.recent_receipts ?? 0),
      recentExpenses: Number(r.recent_expenses ?? 0),
    };
  });
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 4. PUBLIC TRANSPARENCY LIVE STATS                                          */
/* ────────────────────────────────────────────────────────────────────────── */

export type TransparencyLiveStats = {
  totalReceivedUgx: number;
  totalReceivedUsd: number;
  totalSpentUgx: number;
  totalSpentUsd: number;
  netBalanceUgx: number;
  programmeSpendUgx: number;
  adminSpendUgx: number;
  programmeDeliveryPct: number;
  learnersReached: number;
  schoolsSupported: number;
  teachersTrained: number;
  costPerLearnerUgx: number;
  costPerLearnerUsd: number;
  periodStart: string;
  periodEnd: string;
  updatedAt: string;
};

export async function getTransparencyLiveStatsPostgres(): Promise<TransparencyLiveStats> {
  const rate = await getUgxPerUsdPostgres();
  const [receiptsRes, expensesRes, learnersRes, schoolsRes, teachersRes] = await Promise.all([
    queryPostgres(
      `SELECT COALESCE(SUM(amount_received), 0)::numeric AS total
       FROM finance_receipts WHERE status IN ('issued', 'paid')`,
    ),
    queryPostgres(
      `SELECT
         COALESCE(SUM(amount), 0)::numeric AS total,
         COALESCE(SUM(amount) FILTER (
           WHERE LOWER(COALESCE(category, '')) IN ('training', 'coaching', 'assessment', 'donation program', 'programme', 'program')
              OR LOWER(COALESCE(subcategory, '')) LIKE '%delivery%'
              OR LOWER(COALESCE(subcategory, '')) LIKE '%learner%'
              OR LOWER(COALESCE(subcategory, '')) LIKE '%teacher%'
         ), 0)::numeric AS programme_total,
         COALESCE(SUM(amount) FILTER (
           WHERE LOWER(COALESCE(category, '')) IN ('admin', 'administration', 'operations', 'office', 'overhead')
              OR LOWER(COALESCE(subcategory, '')) LIKE '%admin%'
              OR LOWER(COALESCE(subcategory, '')) LIKE '%office%'
         ), 0)::numeric AS admin_total
       FROM finance_expenses WHERE status = 'posted'`,
    ),
    queryPostgres(
      `SELECT COUNT(DISTINCT learner_uid)::int AS n FROM assessment_records WHERE learner_uid IS NOT NULL`,
    ),
    queryPostgres(
      `SELECT COUNT(*)::int AS n FROM schools_directory`,
    ),
    queryPostgres(
      `SELECT COUNT(DISTINCT teacher_uid)::int AS n FROM portal_training_attendance WHERE attended IS TRUE AND teacher_uid IS NOT NULL`,
    ),
  ]);

  const received = Number(receiptsRes.rows[0]?.total ?? 0);
  const spent = Number(expensesRes.rows[0]?.total ?? 0);
  const programme = Number(expensesRes.rows[0]?.programme_total ?? 0);
  const admin = Number(expensesRes.rows[0]?.admin_total ?? 0);
  const learners = Number(learnersRes.rows[0]?.n ?? 0);

  // If programme + admin don't cover spend, treat the rest as programme delivery
  // (typical default for nonprofit reporting when un-categorised)
  const classifiedSpend = programme + admin;
  const effectiveProgramme = classifiedSpend > 0 ? programme : spent;
  const deliveryPct = spent > 0
    ? Math.round(((classifiedSpend > 0 ? programme : spent - admin) / spent) * 1000) / 10
    : 0;

  return {
    totalReceivedUgx: Math.round(received),
    totalReceivedUsd: toUsd(received, rate),
    totalSpentUgx: Math.round(spent),
    totalSpentUsd: toUsd(spent, rate),
    netBalanceUgx: Math.round(received - spent),
    programmeSpendUgx: Math.round(effectiveProgramme),
    adminSpendUgx: Math.round(admin),
    programmeDeliveryPct: Math.max(0, Math.min(100, deliveryPct)),
    learnersReached: learners,
    schoolsSupported: Number(schoolsRes.rows[0]?.n ?? 0),
    teachersTrained: Number(teachersRes.rows[0]?.n ?? 0),
    costPerLearnerUgx: learners > 0 ? Math.round(spent / learners) : 0,
    costPerLearnerUsd: learners > 0 ? toUsd(spent / learners, rate) : 0,
    periodStart: "Inception",
    periodEnd: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 5. ANNUAL REPORT DATA PACK                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

export type AnnualReportData = {
  year: number;
  rangeStart: string;
  rangeEnd: string;
  headlines: {
    schoolsSupported: number;
    teachersTrained: number;
    learnersAssessed: number;
    coachingVisits: number;
    trainingSessions: number;
    totalReceivedUgx: number;
    totalSpentUgx: number;
    programmeDeliveryPct: number;
    costPerLearnerUgx: number;
    costPerLearnerUsd: number;
  };
  outcomes: {
    baselineComprehension: number | null;
    endlineComprehension: number | null;
    improvementPp: number | null;
    fidelityObservations: number;
    fidelityPct: number;
    assessedThisYear: number;
  };
  geography: {
    regionsCovered: number;
    districtsCovered: number;
    subCountiesCovered: number;
    topDistricts: Array<{ district: string; learners: number; schools: number }>;
  };
  finance: {
    categoryBreakdown: Array<{ category: string; totalUgx: number; pctOfSpend: number }>;
    topDonorsAnonymized: Array<{ label: string; amountUgx: number }>;
  };
  generatedAt: string;
};

export async function getAnnualReportDataPostgres(year: number): Promise<AnnualReportData> {
  const rangeStart = `${year}-01-01`;
  const rangeEnd = `${year}-12-31`;
  const rate = await getUgxPerUsdPostgres();

  const [
    schoolsRes,
    teachersRes,
    learnersRes,
    visitsRes,
    trainingsRes,
    financeRes,
    outcomeRes,
    fidelityRes,
    geoRes,
    topDistrictsRes,
    categoryRes,
    topDonorsRes,
  ] = await Promise.all([
    queryPostgres(`SELECT COUNT(*)::int AS n FROM schools_directory`),
    queryPostgres(
      `SELECT COUNT(DISTINCT teacher_uid)::int AS n
       FROM portal_training_attendance pta
       WHERE pta.attended IS TRUE AND pta.teacher_uid IS NOT NULL
         AND EXISTS (SELECT 1 FROM portal_records pr WHERE pr.id = pta.portal_record_id AND pr.date >= $1::date AND pr.date <= $2::date)`,
      [rangeStart, rangeEnd],
    ),
    queryPostgres(
      `SELECT COUNT(DISTINCT learner_uid)::int AS n FROM assessment_records
       WHERE learner_uid IS NOT NULL AND assessment_date >= $1::date AND assessment_date <= $2::date`,
      [rangeStart, rangeEnd],
    ),
    queryPostgres(
      `SELECT COUNT(*)::int AS n FROM portal_records
       WHERE module = 'visit' AND date >= $1::date AND date <= $2::date`,
      [rangeStart, rangeEnd],
    ),
    queryPostgres(
      `SELECT COUNT(*)::int AS n FROM portal_records
       WHERE module = 'training' AND date >= $1::date AND date <= $2::date`,
      [rangeStart, rangeEnd],
    ),
    queryPostgres(
      `SELECT
        (SELECT COALESCE(SUM(amount_received), 0)::numeric FROM finance_receipts
           WHERE status IN ('issued', 'paid') AND receipt_date >= $1::date AND receipt_date <= $2::date) AS received,
        (SELECT COALESCE(SUM(amount), 0)::numeric FROM finance_expenses
           WHERE status = 'posted' AND date >= $1::date AND date <= $2::date) AS spent,
        (SELECT COALESCE(SUM(amount), 0)::numeric FROM finance_expenses
           WHERE status = 'posted' AND date >= $1::date AND date <= $2::date
             AND (LOWER(COALESCE(category, '')) IN ('admin', 'administration', 'operations', 'office', 'overhead')
                  OR LOWER(COALESCE(subcategory, '')) LIKE '%admin%')) AS admin`,
      [rangeStart, rangeEnd],
    ),
    queryPostgres(
      `SELECT
         AVG(reading_comprehension_score) FILTER (WHERE assessment_type = 'baseline')::numeric AS baseline,
         AVG(reading_comprehension_score) FILTER (WHERE assessment_type = 'endline')::numeric AS endline
       FROM assessment_records WHERE assessment_date >= $1::date AND assessment_date <= $2::date`,
      [rangeStart, rangeEnd],
    ),
    queryPostgres(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'fidelity')::int AS fidelity
       FROM teacher_lesson_observations
       WHERE status = 'submitted' AND observation_date >= $1::date AND observation_date <= $2::date`,
      [rangeStart, rangeEnd],
    ),
    queryPostgres(
      `SELECT
         COUNT(DISTINCT s.region)::int AS regions,
         COUNT(DISTINCT s.district)::int AS districts,
         COUNT(DISTINCT s.sub_county)::int AS subcounties
       FROM schools_directory s
       JOIN assessment_records ar ON ar.school_id = s.id
       WHERE ar.assessment_date >= $1::date AND ar.assessment_date <= $2::date`,
      [rangeStart, rangeEnd],
    ),
    queryPostgres(
      `SELECT s.district, COUNT(DISTINCT ar.learner_uid)::int AS learners, COUNT(DISTINCT s.id)::int AS schools
       FROM assessment_records ar
       JOIN schools_directory s ON s.id = ar.school_id
       WHERE ar.assessment_date >= $1::date AND ar.assessment_date <= $2::date AND s.district IS NOT NULL
       GROUP BY s.district ORDER BY learners DESC LIMIT 10`,
      [rangeStart, rangeEnd],
    ),
    queryPostgres(
      `SELECT COALESCE(category, 'Other') AS category, SUM(amount)::numeric AS total
       FROM finance_expenses
       WHERE status = 'posted' AND date >= $1::date AND date <= $2::date
       GROUP BY category ORDER BY total DESC LIMIT 12`,
      [rangeStart, rangeEnd],
    ),
    queryPostgres(
      `SELECT 'Sponsorship' AS label, SUM(amount)::numeric AS total FROM sponsorships
          WHERE payment_status IN ('Completed','Paid') AND paid_at >= $1::timestamptz AND paid_at <= $2::timestamptz
        UNION ALL
        SELECT 'Donation' AS label, SUM(amount)::numeric AS total FROM donations
          WHERE payment_status IN ('Completed','Paid') AND paid_at >= $1::timestamptz AND paid_at <= $2::timestamptz
        UNION ALL
        SELECT 'Grants & Contracts' AS label,
               COALESCE((SELECT SUM(amount_received) FROM finance_receipts
                          WHERE status IN ('issued','paid')
                            AND LOWER(category) IN ('contracts','grants')
                            AND receipt_date >= $1::date AND receipt_date <= $2::date), 0)::numeric`,
      [rangeStart, rangeEnd],
    ),
  ]);

  const totalReceived = Number(financeRes.rows[0]?.received ?? 0);
  const totalSpent = Number(financeRes.rows[0]?.spent ?? 0);
  const adminSpent = Number(financeRes.rows[0]?.admin ?? 0);
  const programmeDeliveryPct = totalSpent > 0
    ? Math.round(((totalSpent - adminSpent) / totalSpent) * 1000) / 10
    : 0;
  const learners = Number(learnersRes.rows[0]?.n ?? 0);

  const baseline = outcomeRes.rows[0]?.baseline != null ? Number(outcomeRes.rows[0].baseline) : null;
  const endline = outcomeRes.rows[0]?.endline != null ? Number(outcomeRes.rows[0].endline) : null;

  const fidelityTotal = Number(fidelityRes.rows[0]?.total ?? 0);
  const fidelityCount = Number(fidelityRes.rows[0]?.fidelity ?? 0);

  const totalBreakdownSpend = categoryRes.rows.reduce((a, r) => a + Number(r.total ?? 0), 0);
  const categoryBreakdown = categoryRes.rows.map((r) => {
    const amt = Number(r.total ?? 0);
    return {
      category: String(r.category),
      totalUgx: Math.round(amt),
      pctOfSpend: totalBreakdownSpend > 0 ? Math.round((amt / totalBreakdownSpend) * 1000) / 10 : 0,
    };
  });

  return {
    year,
    rangeStart,
    rangeEnd,
    headlines: {
      schoolsSupported: Number(schoolsRes.rows[0]?.n ?? 0),
      teachersTrained: Number(teachersRes.rows[0]?.n ?? 0),
      learnersAssessed: learners,
      coachingVisits: Number(visitsRes.rows[0]?.n ?? 0),
      trainingSessions: Number(trainingsRes.rows[0]?.n ?? 0),
      totalReceivedUgx: Math.round(totalReceived),
      totalSpentUgx: Math.round(totalSpent),
      programmeDeliveryPct,
      costPerLearnerUgx: learners > 0 ? Math.round(totalSpent / learners) : 0,
      costPerLearnerUsd: learners > 0 ? toUsd(totalSpent / learners, rate) : 0,
    },
    outcomes: {
      baselineComprehension: baseline != null ? Math.round(baseline * 10) / 10 : null,
      endlineComprehension: endline != null ? Math.round(endline * 10) / 10 : null,
      improvementPp: baseline != null && endline != null ? Math.round((endline - baseline) * 10) / 10 : null,
      fidelityObservations: fidelityTotal,
      fidelityPct: fidelityTotal > 0 ? Math.round((fidelityCount / fidelityTotal) * 100) : 0,
      assessedThisYear: learners,
    },
    geography: {
      regionsCovered: Number(geoRes.rows[0]?.regions ?? 0),
      districtsCovered: Number(geoRes.rows[0]?.districts ?? 0),
      subCountiesCovered: Number(geoRes.rows[0]?.subcounties ?? 0),
      topDistricts: topDistrictsRes.rows.map((r) => ({
        district: String(r.district),
        learners: Number(r.learners),
        schools: Number(r.schools),
      })),
    },
    finance: {
      categoryBreakdown,
      topDonorsAnonymized: topDonorsRes.rows.map((r) => ({
        label: String(r.label),
        amountUgx: Math.round(Number(r.total ?? 0)),
      })),
    },
    generatedAt: new Date().toISOString(),
  };
}
