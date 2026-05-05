import { queryPostgres } from "@/lib/server/postgres/client";

/**
 * Aggregations for the public live impact dashboard. Each function is a
 * single round-trip and never throws — failure paths return zeros. Heavy
 * queries are kept simple SQL so they're cheap on the live RDS.
 */

/* ────────────────────────────────────────────────────────────────────
   Assessment type counts (Baseline / Progress / Endline)
   ──────────────────────────────────────────────────────────────────── */
export type AssessmentTypeCounts = {
  baseline: number;
  progress: number;
  endline: number;
  total: number;
};

export async function getPublicAssessmentTypeCountsPostgres(): Promise<AssessmentTypeCounts> {
  try {
    const result = await queryPostgres<{ baseline: number; progress: number; endline: number; total: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE assessment_type = 'baseline')::int AS baseline,
         COUNT(*) FILTER (WHERE assessment_type = 'progress')::int AS progress,
         COUNT(*) FILTER (WHERE assessment_type = 'endline')::int AS endline,
         COUNT(*)::int AS total
       FROM assessment_records
       WHERE learner_uid IS NOT NULL`,
    );
    const r = result.rows[0];
    return {
      baseline: Number(r?.baseline ?? 0),
      progress: Number(r?.progress ?? 0),
      endline: Number(r?.endline ?? 0),
      total: Number(r?.total ?? 0),
    };
  } catch {
    return { baseline: 0, progress: 0, endline: 0, total: 0 };
  }
}

/* ────────────────────────────────────────────────────────────────────
   Learner funnel — Schools → contacted/visited → Baseline → In-class → Endline
   ──────────────────────────────────────────────────────────────────── */
export type LearnerFunnel = {
  schoolsTrusted: number;
  contactedOrVisited: number;
  baselineAssessed: number;
  inClassAssessed: number;
  endlineAssessed: number;
};

export async function getPublicLearnerFunnelPostgres(): Promise<LearnerFunnel> {
  try {
    const [schools, contacted, baseline, progress, endline] = await Promise.all([
      queryPostgres<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM schools_directory
         WHERE COALESCE(school_active, TRUE) IS TRUE`,
      ),
      queryPostgres<{ n: number }>(
        `SELECT COUNT(DISTINCT school_id)::int AS n
         FROM (
           SELECT school_id FROM coaching_visits WHERE school_id IS NOT NULL
           UNION
           SELECT school_id FROM school_engagements WHERE school_id IS NOT NULL
         ) s`,
      ).catch(() => ({ rows: [{ n: 0 }] })),
      queryPostgres<{ n: number }>(
        `SELECT COUNT(DISTINCT learner_uid)::int AS n FROM assessment_records
         WHERE assessment_type = 'baseline' AND learner_uid IS NOT NULL`,
      ),
      queryPostgres<{ n: number }>(
        `SELECT COUNT(DISTINCT learner_uid)::int AS n FROM assessment_records
         WHERE assessment_type = 'progress' AND learner_uid IS NOT NULL`,
      ),
      queryPostgres<{ n: number }>(
        `SELECT COUNT(DISTINCT learner_uid)::int AS n FROM assessment_records
         WHERE assessment_type = 'endline' AND learner_uid IS NOT NULL`,
      ),
    ]);
    return {
      schoolsTrusted: Number(schools.rows[0]?.n ?? 0),
      contactedOrVisited: Number(contacted.rows[0]?.n ?? 0),
      baselineAssessed: Number(baseline.rows[0]?.n ?? 0),
      inClassAssessed: Number(progress.rows[0]?.n ?? 0),
      endlineAssessed: Number(endline.rows[0]?.n ?? 0),
    };
  } catch {
    return { schoolsTrusted: 0, contactedOrVisited: 0, baselineAssessed: 0, inClassAssessed: 0, endlineAssessed: 0 };
  }
}

/* ────────────────────────────────────────────────────────────────────
   Gender parity (Male / Female counts from school_learners)
   ──────────────────────────────────────────────────────────────────── */
export type GenderParity = {
  male: number;
  female: number;
  malePct: number;
  femalePct: number;
  total: number;
};

export async function getPublicGenderParityPostgres(): Promise<GenderParity> {
  try {
    const result = await queryPostgres<{ male: number; female: number; total: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE lower(gender) IN ('m', 'male', 'boy'))::int AS male,
         COUNT(*) FILTER (WHERE lower(gender) IN ('f', 'female', 'girl'))::int AS female,
         COUNT(*)::int AS total
       FROM school_learners`,
    );
    const r = result.rows[0];
    const male = Number(r?.male ?? 0);
    const female = Number(r?.female ?? 0);
    const total = Number(r?.total ?? 0);
    return {
      male,
      female,
      malePct: total > 0 ? Math.round((male / total) * 1000) / 10 : 0,
      femalePct: total > 0 ? Math.round((female / total) * 1000) / 10 : 0,
      total,
    };
  } catch {
    return { male: 0, female: 0, malePct: 0, femalePct: 0, total: 0 };
  }
}

/* ────────────────────────────────────────────────────────────────────
   Reading-improvement % broken down by grade band (P1–P2 / P3–P4 / P5–P6 / P7+)
   ──────────────────────────────────────────────────────────────────── */
export type GradeBandImprovement = {
  band: "Early (P1–P2)" | "Emergent (P3–P4)" | "Developing (P5–P6)" | "Fluent (P7+)";
  paired: number;
  improved: number;
  improvedPct: number;
};

const GRADE_BAND_PATTERNS: { band: GradeBandImprovement["band"]; classes: string[] }[] = [
  { band: "Early (P1–P2)", classes: ["P1", "P2", "Primary 1", "Primary 2"] },
  { band: "Emergent (P3–P4)", classes: ["P3", "P4", "Primary 3", "Primary 4"] },
  { band: "Developing (P5–P6)", classes: ["P5", "P6", "Primary 5", "Primary 6"] },
  { band: "Fluent (P7+)", classes: ["P7", "Primary 7"] },
];

export async function getPublicReadingImprovementByGradeBandPostgres(): Promise<GradeBandImprovement[]> {
  try {
    const out: GradeBandImprovement[] = [];
    for (const { band, classes } of GRADE_BAND_PATTERNS) {
      const result = await queryPostgres<{ paired: number; improved: number }>(
        `WITH baselines AS (
           SELECT DISTINCT ON (learner_uid)
             learner_uid, assessment_date, reading_stage_order
           FROM assessment_records
           WHERE assessment_type = 'baseline'
             AND learner_uid IS NOT NULL
             AND class_grade = ANY($1::text[])
           ORDER BY learner_uid, assessment_date ASC
         ),
         endlines AS (
           SELECT DISTINCT ON (learner_uid)
             learner_uid, assessment_date, reading_stage_order
           FROM assessment_records
           WHERE assessment_type = 'endline'
             AND learner_uid IS NOT NULL
             AND class_grade = ANY($1::text[])
           ORDER BY learner_uid, assessment_date DESC
         )
         SELECT
           COUNT(*)::int AS paired,
           COUNT(*) FILTER (
             WHERE b.reading_stage_order IS NOT NULL
               AND e.reading_stage_order IS NOT NULL
               AND e.reading_stage_order > b.reading_stage_order
           )::int AS improved
         FROM baselines b
         JOIN endlines e ON e.learner_uid = b.learner_uid
         WHERE e.assessment_date > b.assessment_date`,
        [classes],
      );
      const paired = Number(result.rows[0]?.paired ?? 0);
      const improved = Number(result.rows[0]?.improved ?? 0);
      out.push({
        band,
        paired,
        improved,
        improvedPct: paired > 0 ? Math.round((improved / paired) * 1000) / 10 : 0,
      });
    }
    return out;
  } catch {
    return GRADE_BAND_PATTERNS.map(({ band }) => ({ band, paired: 0, improved: 0, improvedPct: 0 }));
  }
}

/* ────────────────────────────────────────────────────────────────────
   Per-domain mastery — six skills tiles
   ──────────────────────────────────────────────────────────────────── */
export type DomainMastery = {
  domainKey:
    | "phonemic_awareness"
    | "grapheme_phoneme_correspondence"
    | "blending_decoding"
    | "word_recognition_fluency"
    | "sentence_paragraph_construction"
    | "comprehension";
  label: string;
  total: number;
  mastered: number;
  masteredPct: number;
};

const DOMAINS: { domainKey: DomainMastery["domainKey"]; label: string; column: string }[] = [
  { domainKey: "phonemic_awareness", label: "Phonemic Awareness", column: "phonemic_awareness_mastery_status" },
  { domainKey: "grapheme_phoneme_correspondence", label: "Grapheme–Phoneme Correspondence", column: "grapheme_phoneme_correspondence_mastery_status" },
  { domainKey: "blending_decoding", label: "Blending & Decoding", column: "blending_decoding_mastery_status" },
  { domainKey: "word_recognition_fluency", label: "Word Recognition", column: "word_recognition_fluency_mastery_status" },
  { domainKey: "sentence_paragraph_construction", label: "Sentence & Paragraph Comprehension", column: "sentence_paragraph_construction_mastery_status" },
  { domainKey: "comprehension", label: "Comprehension", column: "comprehension_mastery_status" },
];

export async function getPublicLearningOutcomesByDomainPostgres(): Promise<DomainMastery[]> {
  try {
    const out: DomainMastery[] = [];
    for (const d of DOMAINS) {
      // column name is hard-coded via DOMAINS map (no user input) — safe to inline.
      const result = await queryPostgres<{ total: number; mastered: number }>(
        `SELECT
           COUNT(${d.column}) FILTER (WHERE ${d.column} IS NOT NULL)::int AS total,
           COUNT(*) FILTER (WHERE lower(${d.column}) IN ('mastered', 'meeting', 'meets', 'meets benchmark', 'at benchmark', 'above benchmark', 'fluent'))::int AS mastered
         FROM assessment_records
         WHERE assessment_type IN ('baseline', 'progress', 'endline')`,
      );
      const total = Number(result.rows[0]?.total ?? 0);
      const mastered = Number(result.rows[0]?.mastered ?? 0);
      out.push({
        domainKey: d.domainKey,
        label: d.label,
        total,
        mastered,
        masteredPct: total > 0 ? Math.round((mastered / total) * 1000) / 10 : 0,
      });
    }
    return out;
  } catch {
    return DOMAINS.map((d) => ({ domainKey: d.domainKey, label: d.label, total: 0, mastered: 0, masteredPct: 0 }));
  }
}

/* ────────────────────────────────────────────────────────────────────
   Assessment completion rate — scheduled vs completed
   ──────────────────────────────────────────────────────────────────── */
export type AssessmentCompletion = {
  scheduled: number;
  completed: number;
  completionPct: number;
};

export async function getPublicAssessmentCompletionRatePostgres(): Promise<AssessmentCompletion> {
  try {
    // "Scheduled" = distinct (school_id, assessment_window_id) pairs in school_engagements
    // with an attached assessment window. "Completed" = those whose school_id has at
    // least one assessment_record with assessment_date inside the window.
    const result = await queryPostgres<{ scheduled: number; completed: number }>(
      `WITH scheduled AS (
         SELECT DISTINCT se.school_id, se.assessment_window_id
         FROM school_engagements se
         WHERE se.assessment_window_id IS NOT NULL AND se.school_id IS NOT NULL
       ),
       completed AS (
         SELECT s.school_id, s.assessment_window_id
         FROM scheduled s
         JOIN assessment_schedule_windows w ON w.id = s.assessment_window_id
         WHERE EXISTS (
           SELECT 1 FROM assessment_records ar
           WHERE ar.school_id = s.school_id
             AND ar.assessment_date BETWEEN w.window_open AND w.window_close
         )
       )
       SELECT
         (SELECT COUNT(*)::int FROM scheduled) AS scheduled,
         (SELECT COUNT(*)::int FROM completed) AS completed`,
    );
    const scheduled = Number(result.rows[0]?.scheduled ?? 0);
    const completed = Number(result.rows[0]?.completed ?? 0);
    return {
      scheduled,
      completed,
      completionPct: scheduled > 0 ? Math.round((completed / scheduled) * 1000) / 10 : 0,
    };
  } catch {
    return { scheduled: 0, completed: 0, completionPct: 0 };
  }
}

/* ────────────────────────────────────────────────────────────────────
   Non-reader reduction — pre-readers in baseline minus pre-readers in endline
   ──────────────────────────────────────────────────────────────────── */
export type NonReaderReduction = {
  baselinePreReaders: number;
  endlinePreReaders: number;
  reduction: number;
  reductionPct: number;
};

export async function getPublicNonReaderReductionPostgres(): Promise<NonReaderReduction> {
  try {
    const result = await queryPostgres<{ baseline_pre: number; endline_pre: number }>(
      `WITH baseline_pre AS (
         SELECT COUNT(DISTINCT learner_uid)::int AS n
         FROM assessment_records
         WHERE assessment_type = 'baseline'
           AND learner_uid IS NOT NULL
           AND (reading_stage_order = 0 OR lower(reading_stage_label) IN ('pre_reader', 'pre-reader', 'pre reader'))
       ),
       endline_pre AS (
         SELECT COUNT(DISTINCT learner_uid)::int AS n
         FROM assessment_records
         WHERE assessment_type = 'endline'
           AND learner_uid IS NOT NULL
           AND (reading_stage_order = 0 OR lower(reading_stage_label) IN ('pre_reader', 'pre-reader', 'pre reader'))
       )
       SELECT (SELECT n FROM baseline_pre) AS baseline_pre,
              (SELECT n FROM endline_pre)  AS endline_pre`,
    );
    const baselinePreReaders = Number(result.rows[0]?.baseline_pre ?? 0);
    const endlinePreReaders = Number(result.rows[0]?.endline_pre ?? 0);
    const reduction = Math.max(0, baselinePreReaders - endlinePreReaders);
    return {
      baselinePreReaders,
      endlinePreReaders,
      reduction,
      reductionPct: baselinePreReaders > 0 ? Math.round((reduction / baselinePreReaders) * 1000) / 10 : 0,
    };
  } catch {
    return { baselinePreReaders: 0, endlinePreReaders: 0, reduction: 0, reductionPct: 0 };
  }
}
