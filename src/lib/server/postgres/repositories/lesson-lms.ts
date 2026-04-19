import { queryPostgres } from "@/lib/server/postgres/client";

// ──────────────────────────────────────────────────────────────────────────
// QUIZ DELIVERY
// ──────────────────────────────────────────────────────────────────────────

export type QuizQuestionPublic = {
  id: number;
  questionText: string;
  questionType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  options: string[];
  marks: number;
};

export type QuizBundle = {
  quizId: number;
  lessonId: number;
  title: string;
  passMark: number;
  retakesAllowed: boolean;
  isRequired: boolean;
  questions: QuizQuestionPublic[];
};

export async function getQuizForLessonPostgres(lessonSlug: string): Promise<QuizBundle | null> {
  const quizRes = await queryPostgres(
    `SELECT q.id AS "quizId", q.recorded_lesson_id AS "lessonId", q.title,
            q.pass_mark AS "passMark", q.retakes_allowed AS "retakesAllowed",
            q.is_required AS "isRequired"
     FROM lesson_quizzes q
     JOIN recorded_lessons rl ON rl.id = q.recorded_lesson_id
     WHERE rl.slug = $1
     ORDER BY q.id DESC LIMIT 1`,
    [lessonSlug],
  ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));
  if (quizRes.rows.length === 0) return null;
  const quiz = quizRes.rows[0];

  const qRes = await queryPostgres(
    `SELECT id, question_text AS "questionText",
            question_type AS "questionType",
            options_json AS "optionsJson",
            marks
     FROM lesson_quiz_questions
     WHERE quiz_id = $1
     ORDER BY id ASC`,
    [quiz.quizId],
  ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));

  const questions: QuizQuestionPublic[] = qRes.rows.map((r) => {
    let options: string[] = [];
    try {
      const parsed = JSON.parse(String(r.optionsJson ?? "[]"));
      if (Array.isArray(parsed)) options = parsed.map((o) => String(o));
    } catch {
      // ignore
    }
    return {
      id: Number(r.id),
      questionText: String(r.questionText ?? ""),
      questionType: (r.questionType as QuizQuestionPublic["questionType"]) ?? "MULTIPLE_CHOICE",
      options,
      marks: Number(r.marks ?? 1),
    };
  });

  return {
    quizId: Number(quiz.quizId),
    lessonId: Number(quiz.lessonId),
    title: String(quiz.title ?? ""),
    passMark: Number(quiz.passMark ?? 80),
    retakesAllowed: Boolean(quiz.retakesAllowed ?? true),
    isRequired: Boolean(quiz.isRequired ?? false),
    questions,
  };
}

export type QuizAnswer = { questionId: number; answer: string };

export type QuizGradeResult = {
  attemptId: number;
  scorePct: number;
  totalMarks: number;
  earnedMarks: number;
  passed: boolean;
  perQuestion: Array<{ questionId: number; correct: boolean; marks: number }>;
};

export async function gradeQuizAttemptPostgres(
  quizId: number,
  userId: number,
  answers: QuizAnswer[],
): Promise<QuizGradeResult | null> {
  const quizRes = await queryPostgres(
    `SELECT id, recorded_lesson_id, pass_mark FROM lesson_quizzes WHERE id = $1`,
    [quizId],
  );
  if (quizRes.rows.length === 0) return null;
  const { recorded_lesson_id: lessonId, pass_mark: passMark } = quizRes.rows[0];

  const qRes = await queryPostgres(
    `SELECT id, correct_answer, marks FROM lesson_quiz_questions WHERE quiz_id = $1`,
    [quizId],
  );

  const perQuestion: QuizGradeResult["perQuestion"] = [];
  let totalMarks = 0;
  let earnedMarks = 0;

  for (const q of qRes.rows) {
    const qid = Number(q.id);
    const correctAnswer = String(q.correct_answer ?? "").trim().toLowerCase();
    const marks = Number(q.marks ?? 1);
    totalMarks += marks;
    const userAnswer = answers.find((a) => a.questionId === qid);
    const given = String(userAnswer?.answer ?? "").trim().toLowerCase();
    const correct = given.length > 0 && given === correctAnswer;
    if (correct) earnedMarks += marks;
    perQuestion.push({ questionId: qid, correct, marks });
  }

  const scorePct = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;
  const passed = scorePct >= Number(passMark ?? 80);

  const attemptRes = await queryPostgres(
    `INSERT INTO lesson_quiz_attempts (quiz_id, recorded_lesson_id, user_id, score, passed, completed_at)
     VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
    [quizId, lessonId, userId, scorePct, passed],
  );
  const attemptId = Number(attemptRes.rows[0]?.id ?? 0);

  // Upsert lesson_completion
  await queryPostgres(
    `INSERT INTO lesson_completion (recorded_lesson_id, user_id, quiz_completed, quiz_score, certificate_eligible, completed_at)
     VALUES ($1, $2, TRUE, $3, FALSE, NOW())
     ON CONFLICT (recorded_lesson_id, user_id) DO UPDATE
       SET quiz_completed = TRUE, quiz_score = $3, updated_at = NOW()`,
    [lessonId, userId, scorePct],
  ).catch(() => {});

  // Evaluate certificate eligibility (watched > 300s AND quiz passed)
  if (passed) {
    const viewRes = await queryPostgres(
      `SELECT MAX(max_position_seconds) AS max_pos
       FROM lesson_view_sessions
       WHERE recorded_lesson_id = $1 AND user_id = $2`,
      [lessonId, userId],
    ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));
    const maxPos = viewRes.rows[0] ? Number(viewRes.rows[0].max_pos ?? 0) : 0;
    if (maxPos >= 300) {
      await queryPostgres(
        `UPDATE lesson_completion
         SET certificate_eligible = TRUE, completed_at = NOW(), updated_at = NOW()
         WHERE recorded_lesson_id = $1 AND user_id = $2`,
        [lessonId, userId],
      ).catch(() => {});
    }
  }

  return { attemptId, scorePct, totalMarks, earnedMarks, passed, perQuestion };
}

// ──────────────────────────────────────────────────────────────────────────
// RESUME WATCHING
// ──────────────────────────────────────────────────────────────────────────

export type ResumePosition = {
  lessonId: number;
  userId: number;
  currentPositionSeconds: number;
  maxPositionSeconds: number;
  percentWatched: number;
  completed: boolean;
  lastWatchedAt: string | null;
};

export async function getResumePositionPostgres(
  lessonId: number,
  userId: number,
): Promise<ResumePosition | null> {
  const res = await queryPostgres(
    `SELECT recorded_lesson_id AS "lessonId",
            user_id AS "userId",
            MAX(current_position_seconds)::int AS "currentPositionSeconds",
            MAX(max_position_seconds)::int AS "maxPositionSeconds",
            MAX(percent_watched)::int AS "percentWatched",
            BOOL_OR(completed) AS "completed",
            MAX(last_event_at)::text AS "lastWatchedAt"
     FROM lesson_view_sessions
     WHERE recorded_lesson_id = $1 AND user_id = $2
     GROUP BY recorded_lesson_id, user_id`,
    [lessonId, userId],
  ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    lessonId: Number(r.lessonId),
    userId: Number(r.userId),
    currentPositionSeconds: Number(r.currentPositionSeconds ?? 0),
    maxPositionSeconds: Number(r.maxPositionSeconds ?? 0),
    percentWatched: Number(r.percentWatched ?? 0),
    completed: Boolean(r.completed),
    lastWatchedAt: r.lastWatchedAt ? String(r.lastWatchedAt) : null,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// PERSONALISED RECOMMENDATIONS
// ──────────────────────────────────────────────────────────────────────────

export type LessonRecommendation = {
  lessonId: number;
  slug: string;
  title: string;
  description: string | null;
  classLevel: string | null;
  phonicsLevel: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  teacherName: string | null;
  avgRating: number | null;
  ratingsCount: number;
  totalViews: number;
  reasonCode: "weakest_domain" | "popular" | "unwatched_peer_recommended" | "same_level";
  reasonText: string;
};

export async function getRecommendationsForUserPostgres(input: {
  userId: number;
  schoolId?: number;
  classGrade?: string;
  limit?: number;
}): Promise<LessonRecommendation[]> {
  const limit = input.limit ?? 6;
  const recs: LessonRecommendation[] = [];

  // 1. Find the weakest assessment domain at the teacher's school
  let weakDomainCategory: string | null = null;
  if (input.schoolId) {
    try {
      const weakRes = await queryPostgres(
        `SELECT 'letter_id' AS category, AVG(COALESCE(letter_identification_score, 0))::numeric AS score
         FROM assessment_records
         WHERE school_id = $1 AND letter_identification_score IS NOT NULL
         UNION ALL
         SELECT 'blending', AVG(COALESCE(decodable_words_score, 0))::numeric
         FROM assessment_records
         WHERE school_id = $1 AND decodable_words_score IS NOT NULL
         UNION ALL
         SELECT 'comprehension', AVG(COALESCE(reading_comprehension_score, 0))::numeric
         FROM assessment_records
         WHERE school_id = $1 AND reading_comprehension_score IS NOT NULL
         UNION ALL
         SELECT 'phonemic', AVG(COALESCE(sound_identification_score, 0))::numeric
         FROM assessment_records
         WHERE school_id = $1 AND sound_identification_score IS NOT NULL
         ORDER BY score ASC NULLS LAST LIMIT 1`,
        [input.schoolId],
      );
      if (weakRes.rows.length > 0) {
        const cat = String(weakRes.rows[0].category);
        // Map internal domain to lesson category keyword
        weakDomainCategory = cat === "letter_id" ? "letter" : cat === "blending" ? "blending" : cat === "comprehension" ? "comprehension" : "phoneme";
      }
    } catch {
      // ignore
    }
  }

  // 2. Lessons I haven't yet watched
  const watchedIdsRes = await queryPostgres(
    `SELECT DISTINCT recorded_lesson_id FROM lesson_view_sessions WHERE user_id = $1`,
    [input.userId],
  ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));
  const watchedIds = watchedIdsRes.rows.map((r) => Number(r.recorded_lesson_id));

  const excludeClause = watchedIds.length > 0
    ? `AND rl.id NOT IN (${watchedIds.map((_, i) => `$${i + 1}`).join(",")})`
    : "";
  const excludeParams = watchedIds.length > 0 ? watchedIds : [];

  // 3. Query candidate lessons, ranked
  const baseSelect = `
    SELECT rl.id AS "lessonId", rl.slug, rl.title, rl.description,
           rl.class_level AS "classLevel", rl.phonics_level AS "phonicsLevel",
           rl.category, rl.thumbnail_url AS "thumbnailUrl",
           rl.duration, rl.teacher_name AS "teacherName",
           COALESCE(lvs.total_views, 0)::int AS "totalViews",
           (SELECT AVG(overall_rating) FROM lesson_ratings WHERE recorded_lesson_id = rl.id)::numeric(3,2) AS "avgRating",
           (SELECT COUNT(*) FROM lesson_ratings WHERE recorded_lesson_id = rl.id)::int AS "ratingsCount"
    FROM recorded_lessons rl
    LEFT JOIN lesson_view_summary lvs ON lvs.recorded_lesson_id = rl.id
    WHERE rl.is_published = TRUE ${excludeClause}
  `;

  // a) weakest-domain-matched lessons
  if (weakDomainCategory) {
    const r = await queryPostgres(
      `${baseSelect}
        AND (LOWER(rl.category) LIKE $${excludeParams.length + 1}
             OR LOWER(rl.phonics_level) LIKE $${excludeParams.length + 1}
             OR LOWER(rl.title) LIKE $${excludeParams.length + 1})
       ORDER BY "avgRating" DESC NULLS LAST, "totalViews" DESC
       LIMIT 3`,
      [...excludeParams, `%${weakDomainCategory}%`],
    ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));
    for (const row of r.rows) {
      recs.push(mapRow(row, "weakest_domain", `Your school is weakest on ${weakDomainCategory} — this lesson targets it.`));
    }
  }

  // b) popular lessons at same class level
  if (input.classGrade) {
    const levelPatterns = input.classGrade.toUpperCase().startsWith("P") ? `%${input.classGrade}%` : `%${input.classGrade}%`;
    const r = await queryPostgres(
      `${baseSelect}
        AND (rl.class_level ILIKE $${excludeParams.length + 1})
       ORDER BY "avgRating" DESC NULLS LAST, "totalViews" DESC
       LIMIT 3`,
      [...excludeParams, levelPatterns],
    ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));
    for (const row of r.rows) {
      if (recs.some((x) => x.lessonId === Number(row.lessonId))) continue;
      recs.push(mapRow(row, "same_level", `Popular among teachers of ${input.classGrade}.`));
    }
  }

  // c) top-rated fallback
  if (recs.length < limit) {
    const r = await queryPostgres(
      `${baseSelect}
       ORDER BY "avgRating" DESC NULLS LAST, "totalViews" DESC
       LIMIT $${excludeParams.length + 1}`,
      [...excludeParams, limit],
    ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));
    for (const row of r.rows) {
      if (recs.some((x) => x.lessonId === Number(row.lessonId))) continue;
      recs.push(mapRow(row, "popular", "Top-rated across the programme."));
      if (recs.length >= limit) break;
    }
  }

  return recs.slice(0, limit);
}

function mapRow(row: Record<string, unknown>, reasonCode: LessonRecommendation["reasonCode"], reasonText: string): LessonRecommendation {
  return {
    lessonId: Number(row.lessonId),
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : null,
    classLevel: row.classLevel ? String(row.classLevel) : null,
    phonicsLevel: row.phonicsLevel ? String(row.phonicsLevel) : null,
    category: row.category ? String(row.category) : null,
    thumbnailUrl: row.thumbnailUrl ? String(row.thumbnailUrl) : null,
    duration: row.duration !== null && row.duration !== undefined ? Number(row.duration) : null,
    teacherName: row.teacherName ? String(row.teacherName) : null,
    avgRating: row.avgRating !== null && row.avgRating !== undefined ? Number(row.avgRating) : null,
    ratingsCount: Number(row.ratingsCount ?? 0),
    totalViews: Number(row.totalViews ?? 0),
    reasonCode,
    reasonText,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// TEACHER LEARNING JOURNEY
// ──────────────────────────────────────────────────────────────────────────

export type TeacherJourneyLessonRow = {
  lessonId: number;
  slug: string;
  title: string;
  classLevel: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  watchedSeconds: number;
  percentWatched: number;
  completed: boolean;
  rating: number | null;
  quizCompleted: boolean;
  quizScore: number | null;
  certificateEligible: boolean;
  completedAt: string | null;
  lastWatchedAt: string | null;
};

export type TeacherJourneySummary = {
  userId: number;
  totalLessonsStarted: number;
  totalLessonsCompleted: number;
  totalQuizzesPassed: number;
  totalCertificatesEligible: number;
  totalWatchMinutes: number;
  avgRatingGiven: number | null;
  lessons: TeacherJourneyLessonRow[];
};

export async function getTeacherLearningJourneyPostgres(userId: number): Promise<TeacherJourneySummary> {
  const res = await queryPostgres(
    `SELECT rl.id AS "lessonId", rl.slug, rl.title, rl.class_level AS "classLevel",
            rl.thumbnail_url AS "thumbnailUrl", rl.duration,
            COALESCE((SELECT SUM(watch_seconds)::int FROM lesson_view_sessions
                      WHERE recorded_lesson_id = rl.id AND user_id = $1), 0) AS "watchedSeconds",
            COALESCE((SELECT MAX(percent_watched)::int FROM lesson_view_sessions
                      WHERE recorded_lesson_id = rl.id AND user_id = $1), 0) AS "percentWatched",
            COALESCE(lc.watched_recording, FALSE) AS "completed",
            (SELECT overall_rating FROM lesson_ratings
             WHERE recorded_lesson_id = rl.id AND user_id = $1 LIMIT 1) AS rating,
            COALESCE(lc.quiz_completed, FALSE) AS "quizCompleted",
            lc.quiz_score AS "quizScore",
            COALESCE(lc.certificate_eligible, FALSE) AS "certificateEligible",
            lc.completed_at::text AS "completedAt",
            (SELECT MAX(last_event_at)::text FROM lesson_view_sessions
             WHERE recorded_lesson_id = rl.id AND user_id = $1) AS "lastWatchedAt"
     FROM recorded_lessons rl
     LEFT JOIN lesson_completion lc ON lc.recorded_lesson_id = rl.id AND lc.user_id = $1
     WHERE rl.is_published = TRUE
       AND (lc.user_id = $1
            OR EXISTS (SELECT 1 FROM lesson_view_sessions lvs
                       WHERE lvs.recorded_lesson_id = rl.id AND lvs.user_id = $1))
     ORDER BY lc.completed_at DESC NULLS LAST, rl.created_at DESC`,
    [userId],
  ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));

  const lessons: TeacherJourneyLessonRow[] = res.rows.map((r) => ({
    lessonId: Number(r.lessonId),
    slug: String(r.slug ?? ""),
    title: String(r.title ?? ""),
    classLevel: r.classLevel ? String(r.classLevel) : null,
    thumbnailUrl: r.thumbnailUrl ? String(r.thumbnailUrl) : null,
    duration: r.duration !== null && r.duration !== undefined ? Number(r.duration) : null,
    watchedSeconds: Number(r.watchedSeconds ?? 0),
    percentWatched: Number(r.percentWatched ?? 0),
    completed: Boolean(r.completed),
    rating: r.rating !== null && r.rating !== undefined ? Number(r.rating) : null,
    quizCompleted: Boolean(r.quizCompleted),
    quizScore: r.quizScore !== null && r.quizScore !== undefined ? Number(r.quizScore) : null,
    certificateEligible: Boolean(r.certificateEligible),
    completedAt: r.completedAt ? String(r.completedAt) : null,
    lastWatchedAt: r.lastWatchedAt ? String(r.lastWatchedAt) : null,
  }));

  const totalLessonsStarted = lessons.length;
  const totalLessonsCompleted = lessons.filter((l) => l.percentWatched >= 90).length;
  const totalQuizzesPassed = lessons.filter((l) => l.quizCompleted && (l.quizScore ?? 0) >= 80).length;
  const totalCertificatesEligible = lessons.filter((l) => l.certificateEligible).length;
  const totalWatchMinutes = Math.round(lessons.reduce((a, b) => a + b.watchedSeconds, 0) / 60);
  const ratedLessons = lessons.filter((l) => l.rating !== null);
  const avgRatingGiven = ratedLessons.length > 0
    ? Number((ratedLessons.reduce((a, b) => a + (b.rating ?? 0), 0) / ratedLessons.length).toFixed(2))
    : null;

  return {
    userId,
    totalLessonsStarted,
    totalLessonsCompleted,
    totalQuizzesPassed,
    totalCertificatesEligible,
    totalWatchMinutes,
    avgRatingGiven,
    lessons,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// CONTENT ANALYTICS (for programme designers)
// ──────────────────────────────────────────────────────────────────────────

export type LessonContentAnalyticsRow = {
  lessonId: number;
  slug: string;
  title: string;
  classLevel: string | null;
  phonicsLevel: string | null;
  category: string | null;
  totalViews: number;
  uniqueViewers: number;
  rewatchCount: number;
  rewatchRate: number;
  completionRate: number;
  avgOverall: number | null;
  avgClarity: number | null;
  avgPace: number | null;
  avgUsefulness: number | null;
  avgAudioVideo: number | null;
  ratingsCount: number;
  quizAttempts: number;
  quizPassRate: number | null;
  certificatesIssued: number;
  flags: string[];
};

export async function getLessonContentAnalyticsPostgres(options: {
  limit?: number;
  flaggedOnly?: boolean;
}): Promise<LessonContentAnalyticsRow[]> {
  const sql = `
    WITH rating_agg AS (
      SELECT recorded_lesson_id,
             AVG(overall_rating)::numeric(3,2) AS avg_overall,
             AVG(clarity_rating)::numeric(3,2) AS avg_clarity,
             AVG(pace_rating)::numeric(3,2) AS avg_pace,
             AVG(usefulness_rating)::numeric(3,2) AS avg_usefulness,
             AVG(audio_video_rating)::numeric(3,2) AS avg_av,
             COUNT(*) AS ratings_count
      FROM lesson_ratings GROUP BY recorded_lesson_id
    ),
    quiz_agg AS (
      SELECT recorded_lesson_id,
             COUNT(*) AS attempts,
             COUNT(*) FILTER (WHERE passed) AS passed,
             ROUND(100.0 * COUNT(*) FILTER (WHERE passed) / NULLIF(COUNT(*), 0), 1) AS pass_rate
      FROM lesson_quiz_attempts GROUP BY recorded_lesson_id
    ),
    cert_agg AS (
      SELECT recorded_lesson_id, COUNT(*) AS certs
      FROM lesson_completion WHERE certificate_eligible IS TRUE
      GROUP BY recorded_lesson_id
    )
    SELECT rl.id AS "lessonId", rl.slug, rl.title,
           rl.class_level AS "classLevel", rl.phonics_level AS "phonicsLevel", rl.category,
           COALESCE(lvs.total_views, 0)::int AS "totalViews",
           COALESCE(lvs.unique_viewers, 0)::int AS "uniqueViewers",
           COALESCE(lvs.rewatch_count, 0)::int AS "rewatchCount",
           CASE WHEN lvs.total_views > 0
                THEN ROUND(100.0 * lvs.rewatch_count / lvs.total_views, 1)
                ELSE 0
           END::numeric(5,1) AS "rewatchRate",
           COALESCE(lvs.completion_rate, 0)::int AS "completionRate",
           ra.avg_overall AS "avgOverall",
           ra.avg_clarity AS "avgClarity",
           ra.avg_pace AS "avgPace",
           ra.avg_usefulness AS "avgUsefulness",
           ra.avg_av AS "avgAudioVideo",
           COALESCE(ra.ratings_count, 0)::int AS "ratingsCount",
           COALESCE(qa.attempts, 0)::int AS "quizAttempts",
           qa.pass_rate::numeric(5,1) AS "quizPassRate",
           COALESCE(ca.certs, 0)::int AS "certificatesIssued"
    FROM recorded_lessons rl
    LEFT JOIN lesson_view_summary lvs ON lvs.recorded_lesson_id = rl.id
    LEFT JOIN rating_agg ra ON ra.recorded_lesson_id = rl.id
    LEFT JOIN quiz_agg qa ON qa.recorded_lesson_id = rl.id
    LEFT JOIN cert_agg ca ON ca.recorded_lesson_id = rl.id
    WHERE rl.is_published = TRUE
    ORDER BY "totalViews" DESC NULLS LAST
    LIMIT $1
  `;

  try {
    const result = await queryPostgres(sql, [options.limit ?? 200]);
    const rows: LessonContentAnalyticsRow[] = result.rows.map((r) => {
      const flags: string[] = [];
      const pass = r.quizPassRate !== null ? Number(r.quizPassRate) : null;
      const useful = r.avgUsefulness !== null ? Number(r.avgUsefulness) : null;
      const rewatch = Number(r.rewatchRate ?? 0);
      const completion = Number(r.completionRate ?? 0);
      const views = Number(r.totalViews ?? 0);
      if (pass !== null && pass < 50 && Number(r.quizAttempts) >= 5) flags.push("Low quiz pass rate");
      if (useful !== null && useful < 3 && Number(r.ratingsCount) >= 5) flags.push("Low usefulness rating");
      if (rewatch > 40) flags.push("High rewatch rate — hard topic?");
      if (views >= 10 && completion < 50) flags.push("Poor completion");
      return {
        lessonId: Number(r.lessonId),
        slug: String(r.slug ?? ""),
        title: String(r.title ?? ""),
        classLevel: r.classLevel ? String(r.classLevel) : null,
        phonicsLevel: r.phonicsLevel ? String(r.phonicsLevel) : null,
        category: r.category ? String(r.category) : null,
        totalViews: views,
        uniqueViewers: Number(r.uniqueViewers ?? 0),
        rewatchCount: Number(r.rewatchCount ?? 0),
        rewatchRate: rewatch,
        completionRate: completion,
        avgOverall: r.avgOverall !== null && r.avgOverall !== undefined ? Number(r.avgOverall) : null,
        avgClarity: r.avgClarity !== null && r.avgClarity !== undefined ? Number(r.avgClarity) : null,
        avgPace: r.avgPace !== null && r.avgPace !== undefined ? Number(r.avgPace) : null,
        avgUsefulness: useful,
        avgAudioVideo: r.avgAudioVideo !== null && r.avgAudioVideo !== undefined ? Number(r.avgAudioVideo) : null,
        ratingsCount: Number(r.ratingsCount ?? 0),
        quizAttempts: Number(r.quizAttempts ?? 0),
        quizPassRate: pass,
        certificatesIssued: Number(r.certificatesIssued ?? 0),
        flags,
      };
    });
    return options.flaggedOnly ? rows.filter((r) => r.flags.length > 0) : rows;
  } catch (_e) {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// CERTIFICATE ELIGIBILITY + ISSUANCE
// ──────────────────────────────────────────────────────────────────────────

export type LessonCertificateEligibleRow = {
  lessonId: number;
  userId: number;
  lessonSlug: string;
  lessonTitle: string;
  teacherName: string | null;
  completedAt: string | null;
  quizScore: number | null;
  participantFullName: string | null;
  participantEmail: string | null;
};

export async function listLessonCertificateEligiblePostgres(options: {
  userId?: number;
  lessonId?: number;
  limit?: number;
}): Promise<LessonCertificateEligibleRow[]> {
  const params: unknown[] = [];
  const filters: string[] = [`lc.certificate_eligible IS TRUE`];

  if (options.userId) {
    params.push(options.userId);
    filters.push(`lc.user_id = $${params.length}`);
  }
  if (options.lessonId) {
    params.push(options.lessonId);
    filters.push(`lc.recorded_lesson_id = $${params.length}`);
  }
  params.push(options.limit ?? 200);
  const limitIdx = params.length;

  const sql = `
    SELECT lc.recorded_lesson_id AS "lessonId",
           lc.user_id AS "userId",
           rl.slug AS "lessonSlug",
           rl.title AS "lessonTitle",
           rl.teacher_name AS "teacherName",
           lc.completed_at::text AS "completedAt",
           lc.quiz_score AS "quizScore",
           pu.full_name AS "participantFullName",
           pu.email AS "participantEmail"
    FROM lesson_completion lc
    JOIN recorded_lessons rl ON rl.id = lc.recorded_lesson_id
    LEFT JOIN portal_users pu ON pu.id = lc.user_id
    WHERE ${filters.join(" AND ")}
    ORDER BY lc.completed_at DESC NULLS LAST
    LIMIT $${limitIdx}
  `;
  try {
    const result = await queryPostgres(sql, params);
    return result.rows.map((r) => ({
      lessonId: Number(r.lessonId),
      userId: Number(r.userId),
      lessonSlug: String(r.lessonSlug ?? ""),
      lessonTitle: String(r.lessonTitle ?? ""),
      teacherName: r.teacherName ? String(r.teacherName) : null,
      completedAt: r.completedAt ? String(r.completedAt) : null,
      quizScore: r.quizScore !== null && r.quizScore !== undefined ? Number(r.quizScore) : null,
      participantFullName: r.participantFullName ? String(r.participantFullName) : null,
      participantEmail: r.participantEmail ? String(r.participantEmail) : null,
    }));
  } catch (_e) {
    return [];
  }
}
