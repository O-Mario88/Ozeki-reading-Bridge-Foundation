import { queryPostgres } from "@/lib/server/postgres/client";

const UGX_PER_USD = 3800;

export type MetricKey =
  | "cost_per_learner_reached"
  | "cost_per_learner_improved"
  | "cost_per_teacher_trained";

export type PeerBenchmarkRow = {
  id: number;
  metricKey: MetricKey;
  peerOrgName: string;
  region: string | null;
  costPerUnitUsd: number;
  notes: string | null;
  sourceUrl: string;
  sourceYear: number;
  displayOrder: number;
};

export async function listPeerBenchmarksByMetric(
  metricKey: MetricKey,
): Promise<PeerBenchmarkRow[]> {
  const result = await queryPostgres(
    `
    SELECT
      id,
      metric_key AS "metricKey",
      peer_org_name AS "peerOrgName",
      region,
      cost_per_unit_usd AS "costPerUnitUsd",
      notes,
      source_url AS "sourceUrl",
      source_year AS "sourceYear",
      display_order AS "displayOrder"
    FROM cost_peer_benchmarks
    WHERE metric_key = $1 AND is_active IS TRUE
    ORDER BY display_order, lower(peer_org_name)
    `,
    [metricKey],
  );
  return result.rows.map((r) => ({
    ...(r as PeerBenchmarkRow),
    costPerUnitUsd: Number((r as { costPerUnitUsd: string | number }).costPerUnitUsd),
  }));
}

async function getProgrammeSpendUgx(): Promise<number> {
  const res = await queryPostgres<{ total: string | null }>(
    `SELECT COALESCE(SUM(jl.debit), 0)::numeric(18,2) AS total
     FROM finance_journal_lines jl
     JOIN finance_journal_entries je ON je.id = jl.journal_id
     JOIN finance_chart_of_accounts coa ON coa.id = jl.account_id
     WHERE je.status = 'posted'
       AND coa.account_type = 'expense'
       AND coa.account_code LIKE '5%'`,
  );
  return Number(res.rows[0]?.total ?? 0);
}

async function getLearnersReached(): Promise<number> {
  const res = await queryPostgres<{ learners: number }>(
    `SELECT COUNT(DISTINCT learner_uid)::int AS learners FROM assessment_records`,
  );
  return Number(res.rows[0]?.learners ?? 0);
}

async function getLearnersImproved(): Promise<number> {
  // Pair earliest baseline → latest endline per learner_uid; "improved" =
  // endline reading_stage_order > baseline reading_stage_order. Falls back
  // to story_reading_score when stage_order is null on either side.
  const res = await queryPostgres<{ improved: number }>(
    `
    WITH baselines AS (
      SELECT DISTINCT ON (learner_uid)
        learner_uid,
        assessment_date,
        reading_stage_order,
        story_reading_score
      FROM assessment_records
      WHERE assessment_type = 'baseline' AND learner_uid IS NOT NULL
      ORDER BY learner_uid, assessment_date ASC
    ),
    endlines AS (
      SELECT DISTINCT ON (learner_uid)
        learner_uid,
        assessment_date,
        reading_stage_order,
        story_reading_score
      FROM assessment_records
      WHERE assessment_type = 'endline' AND learner_uid IS NOT NULL
      ORDER BY learner_uid, assessment_date DESC
    )
    SELECT COUNT(*)::int AS improved
    FROM baselines b
    JOIN endlines e ON e.learner_uid = b.learner_uid
    WHERE e.assessment_date > b.assessment_date
      AND (
        (b.reading_stage_order IS NOT NULL AND e.reading_stage_order IS NOT NULL
          AND e.reading_stage_order > b.reading_stage_order)
        OR (
          (b.reading_stage_order IS NULL OR e.reading_stage_order IS NULL)
          AND b.story_reading_score IS NOT NULL AND e.story_reading_score IS NOT NULL
          AND e.story_reading_score > b.story_reading_score
        )
      )
    `,
  );
  return Number(res.rows[0]?.improved ?? 0);
}

async function getTeachersTrained(): Promise<number> {
  // Distinct teacher_uids who have any training participation record
  // across the three known sources. UNION dedupes across sources.
  const res = await queryPostgres<{ teachers: number }>(
    `
    SELECT COUNT(DISTINCT teacher_uid)::int AS teachers FROM (
      SELECT teacher_uid FROM training_participants WHERE teacher_uid IS NOT NULL
      UNION
      SELECT teacher_uid FROM portal_training_attendance WHERE teacher_uid IS NOT NULL AND attended IS TRUE
    ) all_training
    `,
  ).catch(() => ({ rows: [{ teachers: 0 }] }));
  return Number(res.rows[0]?.teachers ?? 0);
}

export type CostPerBeneficiaryFigure = {
  metricKey: MetricKey;
  totalProgrammeSpendUgx: number;
  beneficiaryCount: number;
  costPerUnitUgx: number | null;
  costPerUnitUsd: number | null;
};

export type CostPerBeneficiarySummary = {
  generatedAt: string;
  ugxPerUsd: number;
  programmeSpendUgx: number;
  learnersReached: number;
  learnersImproved: number;
  teachersTrained: number;
  figures: {
    learnersReached: CostPerBeneficiaryFigure;
    learnersImproved: CostPerBeneficiaryFigure;
    teachersTrained: CostPerBeneficiaryFigure;
  };
};

function buildFigure(
  metricKey: MetricKey,
  programmeSpendUgx: number,
  count: number,
): CostPerBeneficiaryFigure {
  if (programmeSpendUgx <= 0 || count <= 0) {
    return {
      metricKey,
      totalProgrammeSpendUgx: programmeSpendUgx,
      beneficiaryCount: count,
      costPerUnitUgx: null,
      costPerUnitUsd: null,
    };
  }
  const perUgx = Math.round(programmeSpendUgx / count);
  return {
    metricKey,
    totalProgrammeSpendUgx: programmeSpendUgx,
    beneficiaryCount: count,
    costPerUnitUgx: perUgx,
    costPerUnitUsd: +(perUgx / UGX_PER_USD).toFixed(2),
  };
}

export async function getCostPerBeneficiarySummary(): Promise<CostPerBeneficiarySummary> {
  const [programmeSpendUgx, reached, improved, teachers] = await Promise.all([
    getProgrammeSpendUgx(),
    getLearnersReached(),
    getLearnersImproved(),
    getTeachersTrained(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    ugxPerUsd: UGX_PER_USD,
    programmeSpendUgx,
    learnersReached: reached,
    learnersImproved: improved,
    teachersTrained: teachers,
    figures: {
      learnersReached: buildFigure("cost_per_learner_reached", programmeSpendUgx, reached),
      learnersImproved: buildFigure("cost_per_learner_improved", programmeSpendUgx, improved),
      teachersTrained: buildFigure("cost_per_teacher_trained", programmeSpendUgx, teachers),
    },
  };
}
