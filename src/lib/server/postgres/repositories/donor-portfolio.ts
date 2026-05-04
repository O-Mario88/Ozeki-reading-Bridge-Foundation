import { queryPostgres } from "@/lib/server/postgres/client";

export type DonorAllocationRow = {
  id: number;
  donorUserId: number;
  referenceCode: string;
  programme: string;
  region: string | null;
  district: string | null;
  cohortYear: number | null;
  amountUgx: number;
  amountUsdAtAllocation: number | null;
  fxRateUsed: number | null;
  startDate: string;
  endDate: string | null;
  status: "active" | "completed" | "cancelled";
  sourceDonationId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DonorImpactSnapshotRow = {
  id: number;
  donorUserId: number;
  allocationId: number | null;
  periodStart: string;
  periodEnd: string;
  learnersReached: number;
  learnersImproved: number;
  teachersTrained: number;
  coachingVisits: number;
  evidencePhotos: number;
  amountAttributedUgx: number;
  highlightText: string | null;
  digestSentAt: string | null;
  createdAt: string;
};

export type DonorRecurringSubscriptionRow = {
  id: number;
  donorUserId: number;
  planLabel: string;
  amountUgx: number;
  frequency: "monthly" | "quarterly" | "annual";
  status: "pending" | "active" | "paused" | "cancelled" | "failed";
  pesapalSubscriptionToken: string | null;
  pesapalPayerToken: string | null;
  nextChargeDate: string | null;
  lastChargeDate: string | null;
  lastChargeAmountUgx: number | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
};

const ALLOCATION_COLS = `
  id, donor_user_id AS "donorUserId", reference_code AS "referenceCode",
  programme, region, district, cohort_year AS "cohortYear",
  amount_ugx AS "amountUgx", amount_usd_at_allocation AS "amountUsdAtAllocation",
  fx_rate_used AS "fxRateUsed", start_date AS "startDate", end_date AS "endDate",
  status, source_donation_id AS "sourceDonationId", notes,
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

const SNAPSHOT_COLS = `
  id, donor_user_id AS "donorUserId", allocation_id AS "allocationId",
  period_start AS "periodStart", period_end AS "periodEnd",
  learners_reached AS "learnersReached", learners_improved AS "learnersImproved",
  teachers_trained AS "teachersTrained", coaching_visits AS "coachingVisits",
  evidence_photos AS "evidencePhotos", amount_attributed_ugx AS "amountAttributedUgx",
  highlight_text AS "highlightText", digest_sent_at AS "digestSentAt",
  created_at AS "createdAt"
`;

const SUBSCRIPTION_COLS = `
  id, donor_user_id AS "donorUserId", plan_label AS "planLabel",
  amount_ugx AS "amountUgx", frequency, status,
  pesapal_subscription_token AS "pesapalSubscriptionToken",
  pesapal_payer_token AS "pesapalPayerToken",
  next_charge_date AS "nextChargeDate", last_charge_date AS "lastChargeDate",
  last_charge_amount_ugx AS "lastChargeAmountUgx",
  created_at AS "createdAt", updated_at AS "updatedAt", cancelled_at AS "cancelledAt"
`;

export async function listDonorAllocations(donorUserId: number): Promise<DonorAllocationRow[]> {
  const result = await queryPostgres(
    `SELECT ${ALLOCATION_COLS} FROM donor_allocations
     WHERE donor_user_id = $1 ORDER BY start_date DESC, id DESC`,
    [donorUserId],
  );
  return result.rows as DonorAllocationRow[];
}

export async function listDonorImpactSnapshots(
  donorUserId: number,
  limit = 36,
): Promise<DonorImpactSnapshotRow[]> {
  const result = await queryPostgres(
    `SELECT ${SNAPSHOT_COLS} FROM donor_impact_snapshots
     WHERE donor_user_id = $1 ORDER BY period_end DESC LIMIT $2`,
    [donorUserId, Math.min(Math.max(limit, 1), 200)],
  );
  return result.rows as DonorImpactSnapshotRow[];
}

export async function listDonorSubscriptions(
  donorUserId: number,
): Promise<DonorRecurringSubscriptionRow[]> {
  const result = await queryPostgres(
    `SELECT ${SUBSCRIPTION_COLS} FROM donor_recurring_subscriptions
     WHERE donor_user_id = $1 ORDER BY created_at DESC`,
    [donorUserId],
  );
  return result.rows as DonorRecurringSubscriptionRow[];
}

export async function createDonorSubscription(input: {
  donorUserId: number;
  planLabel: string;
  amountUgx: number;
  frequency: DonorRecurringSubscriptionRow["frequency"];
}): Promise<DonorRecurringSubscriptionRow> {
  const result = await queryPostgres(
    `INSERT INTO donor_recurring_subscriptions (
      donor_user_id, plan_label, amount_ugx, frequency, status, next_charge_date
    ) VALUES ($1, $2, $3, $4, 'pending', (CURRENT_DATE + INTERVAL '1 day')::date)
    RETURNING ${SUBSCRIPTION_COLS}`,
    [input.donorUserId, input.planLabel, input.amountUgx, input.frequency],
  );
  return result.rows[0] as DonorRecurringSubscriptionRow;
}

export async function cancelDonorSubscription(
  donorUserId: number,
  subscriptionId: number,
): Promise<void> {
  await queryPostgres(
    `UPDATE donor_recurring_subscriptions
     SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND donor_user_id = $1 AND status != 'cancelled'`,
    [donorUserId, subscriptionId],
  );
}

export type DonorPortfolioTotals = {
  allocations: number;
  totalUgx: number;
  learnersReached: number;
  learnersImproved: number;
  teachersTrained: number;
  evidencePhotos: number;
};

export async function getDonorPortfolioTotals(donorUserId: number): Promise<DonorPortfolioTotals> {
  const [allocAgg, snapAgg] = await Promise.all([
    queryPostgres<{ allocations: number; totalUgx: string | null }>(
      `SELECT COUNT(*)::int AS allocations,
              COALESCE(SUM(amount_ugx), 0)::numeric(18,2) AS "totalUgx"
       FROM donor_allocations WHERE donor_user_id = $1`,
      [donorUserId],
    ),
    queryPostgres<{
      reached: number; improved: number; trained: number; photos: number;
    }>(
      `SELECT
         COALESCE(SUM(learners_reached), 0)::int AS reached,
         COALESCE(SUM(learners_improved), 0)::int AS improved,
         COALESCE(SUM(teachers_trained), 0)::int AS trained,
         COALESCE(SUM(evidence_photos), 0)::int AS photos
       FROM donor_impact_snapshots WHERE donor_user_id = $1`,
      [donorUserId],
    ),
  ]);
  return {
    allocations: Number(allocAgg.rows[0]?.allocations ?? 0),
    totalUgx: Number(allocAgg.rows[0]?.totalUgx ?? 0),
    learnersReached: Number(snapAgg.rows[0]?.reached ?? 0),
    learnersImproved: Number(snapAgg.rows[0]?.improved ?? 0),
    teachersTrained: Number(snapAgg.rows[0]?.trained ?? 0),
    evidencePhotos: Number(snapAgg.rows[0]?.photos ?? 0),
  };
}

export type DonorTaxSummaryYear = {
  fy: number;
  totalDonationsUgx: number;
  donationCount: number;
  rows: { date: string; allocationCode: string; programme: string; amountUgx: number }[];
};

export async function getDonorTaxSummaryForYear(
  donorUserId: number,
  fy: number,
): Promise<DonorTaxSummaryYear> {
  // Uganda tax year ≈ calendar year for individuals; using calendar year here.
  const result = await queryPostgres<{
    date: string; reference_code: string; programme: string; amount_ugx: string;
  }>(
    `SELECT start_date::text AS date, reference_code, programme, amount_ugx::text AS amount_ugx
     FROM donor_allocations
     WHERE donor_user_id = $1
       AND EXTRACT(YEAR FROM start_date) = $2
     ORDER BY start_date ASC, id ASC`,
    [donorUserId, fy],
  );
  const rows = result.rows.map((r) => ({
    date: r.date,
    allocationCode: r.reference_code,
    programme: r.programme,
    amountUgx: Number(r.amount_ugx),
  }));
  return {
    fy,
    totalDonationsUgx: rows.reduce((acc, r) => acc + r.amountUgx, 0),
    donationCount: rows.length,
    rows,
  };
}
