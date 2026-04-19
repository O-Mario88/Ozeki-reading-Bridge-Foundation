import { queryPostgres } from "@/lib/server/postgres/client";

export type DonorSchoolOutcome = {
  schoolId: number;
  schoolName: string;
  district: string;
  allocationAmount: number;
  currency: string;
  learnersAssessed: number;
  compositeDelta: number | null;
  healthScore: number | null;
  trajectoryBand: string | null;
  visitsCount: number;
};

export type DonorROI = {
  sponsorshipId: number | null;
  donorName: string;
  totalAmountUgx: number;
  schoolsReached: number;
  learnersReached: number;
  avgCompositeDelta: number | null;
  totalVisits: number;
  costPerLearner: number | null;
  outcomes: DonorSchoolOutcome[];
};

/**
 * Given a sponsorship_reference (or donor email), compute the full donor→school→outcome chain.
 */
export async function getDonorROIPostgres(input: {
  sponsorshipReference?: string;
  donorEmail?: string;
  sponsorshipId?: number;
}): Promise<DonorROI | null> {
  let sponsorshipFilter = "";
  const params: unknown[] = [];
  if (input.sponsorshipId) {
    params.push(input.sponsorshipId);
    sponsorshipFilter = `s.id = $${params.length}`;
  } else if (input.sponsorshipReference) {
    params.push(input.sponsorshipReference);
    sponsorshipFilter = `s.sponsorship_reference = $${params.length}`;
  } else if (input.donorEmail) {
    params.push(input.donorEmail);
    sponsorshipFilter = `s.donor_email = $${params.length}`;
  } else {
    return null;
  }

  try {
    const sponsorRes = await queryPostgres(
      `SELECT s.id, s.sponsorship_reference, s.donor_name, s.amount, s.currency
       FROM sponsorships s
       WHERE ${sponsorshipFilter} AND s.payment_status = 'Completed'
       ORDER BY s.paid_at DESC LIMIT 1`,
      params,
    );
    if (sponsorRes.rows.length === 0) return null;
    const sp = sponsorRes.rows[0];

    const allocRes = await queryPostgres(
      `SELECT ssa.school_id AS "schoolId",
              sd.name AS "schoolName",
              sd.district,
              SUM(ssa.allocation_amount)::numeric AS "allocationAmount",
              MAX(ssa.allocation_currency) AS currency,
              sks.total_learners_assessed AS "learnersAssessed",
              sks.composite_delta AS "compositeDelta",
              sks.health_score AS "healthScore",
              sks.trajectory_band AS "trajectoryBand",
              sks.total_visits AS "visitsCount"
       FROM sponsorship_school_allocations ssa
       JOIN schools_directory sd ON sd.id = ssa.school_id
       LEFT JOIN school_kpi_snapshot sks ON sks.school_id = ssa.school_id
       WHERE ssa.sponsorship_id = $1
       GROUP BY ssa.school_id, sd.name, sd.district, sks.total_learners_assessed,
                sks.composite_delta, sks.health_score, sks.trajectory_band, sks.total_visits
       ORDER BY "allocationAmount" DESC`,
      [sp.id],
    );

    const outcomes: DonorSchoolOutcome[] = allocRes.rows.map((r) => ({
      schoolId: Number(r.schoolId),
      schoolName: String(r.schoolName),
      district: String(r.district ?? ""),
      allocationAmount: Number(r.allocationAmount ?? 0),
      currency: String(r.currency ?? "UGX"),
      learnersAssessed: Number(r.learnersAssessed ?? 0),
      compositeDelta: r.compositeDelta !== null && r.compositeDelta !== undefined ? Number(r.compositeDelta) : null,
      healthScore: r.healthScore !== null && r.healthScore !== undefined ? Number(r.healthScore) : null,
      trajectoryBand: r.trajectoryBand ? String(r.trajectoryBand) : null,
      visitsCount: Number(r.visitsCount ?? 0),
    }));

    const totalLearners = outcomes.reduce((a, b) => a + b.learnersAssessed, 0);
    const totalVisits = outcomes.reduce((a, b) => a + b.visitsCount, 0);
    const deltasWithData = outcomes.filter((o) => o.compositeDelta !== null);
    const avgDelta = deltasWithData.length > 0
      ? Number((deltasWithData.reduce((a, b) => a + (b.compositeDelta ?? 0), 0) / deltasWithData.length).toFixed(2))
      : null;
    const totalAmountUgx = Number(sp.amount ?? 0);
    const costPerLearner = totalLearners > 0 ? Number((totalAmountUgx / totalLearners).toFixed(2)) : null;

    return {
      sponsorshipId: Number(sp.id),
      donorName: String(sp.donor_name ?? "Anonymous"),
      totalAmountUgx,
      schoolsReached: outcomes.length,
      learnersReached: totalLearners,
      avgCompositeDelta: avgDelta,
      totalVisits,
      costPerLearner,
      outcomes,
    };
  } catch { return null; }
}

/**
 * Public ROI snapshot — all sponsorships aggregated (for /impact/for-donors page).
 */
export async function getAllDonorROIAggregatePostgres(): Promise<{
  totalDonors: number;
  totalRaised: number;
  totalSchoolsReached: number;
  totalLearnersReached: number;
  avgCompositeDelta: number | null;
  avgCostPerLearner: number | null;
  topDonors: Array<{ donorName: string; amount: number; schoolsReached: number }>;
}> {
  try {
    const res = await queryPostgres(
      `SELECT
         COUNT(DISTINCT s.id)::int AS total_donors,
         COALESCE(SUM(s.amount), 0)::numeric AS total_raised,
         COUNT(DISTINCT ssa.school_id)::int AS schools_reached,
         COALESCE(SUM(sks.total_learners_assessed), 0)::int AS learners_reached,
         AVG(sks.composite_delta)::numeric AS avg_delta
       FROM sponsorships s
       LEFT JOIN sponsorship_school_allocations ssa ON ssa.sponsorship_id = s.id
       LEFT JOIN school_kpi_snapshot sks ON sks.school_id = ssa.school_id
       WHERE s.payment_status = 'Completed'`,
    );
    const r = res.rows[0] ?? {};
    const totalRaised = Number(r.total_raised ?? 0);
    const learnersReached = Number(r.learners_reached ?? 0);

    const topRes = await queryPostgres(
      `SELECT s.donor_name AS donor_name,
              SUM(s.amount)::numeric AS amount,
              COUNT(DISTINCT ssa.school_id)::int AS schools_reached
       FROM sponsorships s
       LEFT JOIN sponsorship_school_allocations ssa ON ssa.sponsorship_id = s.id
       WHERE s.payment_status = 'Completed' AND s.donor_name IS NOT NULL
       GROUP BY s.donor_name
       ORDER BY amount DESC
       LIMIT 20`,
    );

    return {
      totalDonors: Number(r.total_donors ?? 0),
      totalRaised,
      totalSchoolsReached: Number(r.schools_reached ?? 0),
      totalLearnersReached: learnersReached,
      avgCompositeDelta: r.avg_delta !== null && r.avg_delta !== undefined ? Number(r.avg_delta) : null,
      avgCostPerLearner: learnersReached > 0 ? Number((totalRaised / learnersReached).toFixed(2)) : null,
      topDonors: topRes.rows.map((t) => ({
        donorName: String(t.donor_name),
        amount: Number(t.amount ?? 0),
        schoolsReached: Number(t.schools_reached ?? 0),
      })),
    };
  } catch {
    return {
      totalDonors: 0, totalRaised: 0, totalSchoolsReached: 0,
      totalLearnersReached: 0, avgCompositeDelta: null,
      avgCostPerLearner: null, topDonors: [],
    };
  }
}
