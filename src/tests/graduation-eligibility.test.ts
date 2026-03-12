import assert from "node:assert/strict";
import test from "node:test";
import {
  addLearnerToSchool,
  addTeacherToSchool,
  authenticatePortalUser,
  createPortalSession,
  createLessonEvaluation,
  getDb,
  getPortalUserFromSession,
  getPortalUserByEmail,
  getGraduationSettings,
  getSchoolGraduationEligibility,
  listAuditLogs,
  listTeachersBySchool,
  refreshSchoolGraduationEligibilityCache,
  reviewSchoolGraduation,
  updateGraduationSettings,
} from "../lib/db";
import { LESSON_EVALUATION_ITEMS } from "../lib/lesson-evaluation";
import type { PortalUser } from "../lib/types";

function toPortalActor(): PortalUser {
  const configured =
    process.env.PORTAL_SUPERADMIN_EMAIL?.toLowerCase() ?? "edwin@ozekiread.org";
  const actor =
    getPortalUserByEmail(configured) ??
    getPortalUserByEmail("edwin@ozekiread.org") ??
    getPortalUserByEmail("admin@ozekiread.org");
  assert.ok(actor, "Missing seeded super admin/admin user for graduation test.");
  return actor as PortalUser;
}

test("seeded super admin credentials authenticate successfully even after credential drift", () => {
  const db = getDb();
  const email = process.env.PORTAL_SUPERADMIN_EMAIL?.toLowerCase() ?? "edwin@ozekiread.org";
  const password = process.env.PORTAL_SUPERADMIN_PASSWORD ?? "Ozeki@16079";

  db.prepare(
    `
      UPDATE portal_users
      SET password_hash = 'stale-hash'
      WHERE lower(email) = @email
    `,
  ).run({ email });

  const actor = authenticatePortalUser(email, password);

  assert.ok(actor, "Expected seeded super admin credentials to authenticate.");
  assert.equal(actor.email, email);
  assert.equal(actor.isSuperAdmin, true);
});

test("portal session token remains valid even if the sqlite session row is unavailable", () => {
  const email = process.env.PORTAL_SUPERADMIN_EMAIL?.toLowerCase() ?? "edwin@ozekiread.org";
  const password = process.env.PORTAL_SUPERADMIN_PASSWORD ?? "Ozeki@16079";
  const actor = authenticatePortalUser(email, password);
  assert.ok(actor, "Expected seeded super admin credentials to authenticate.");

  const db = getDb();
  const session = createPortalSession(actor.id);
  db.prepare("DELETE FROM portal_sessions WHERE token = @token").run({ token: session.token });

  const recoveredActor = getPortalUserFromSession(session.token);
  assert.ok(recoveredActor, "Expected stateless portal session fallback to authenticate.");
  assert.equal(recoveredActor.email, email);
  assert.equal(recoveredActor.isSuperAdmin, true);
});

test("school graduation eligibility is computed from live records and confirmation is audited", () => {
  const db = getDb();
  const actor = toPortalActor();
  const originalSettings = db
    .prepare("SELECT * FROM graduation_settings WHERE id = 1")
    .get() as Record<string, unknown> | undefined;
  assert.ok(originalSettings, "Missing graduation settings row.");

  try {
    const school = db
      .prepare(
        `
        SELECT id, name, district
        FROM schools_directory
        ORDER BY id ASC
        LIMIT 1
        `,
      )
      .get() as { id: number; name: string; district: string } | undefined;
    assert.ok(school, "Expected at least one school.");

    const assessmentCountRow = db
      .prepare(
        `
        SELECT COUNT(*) AS c
        FROM assessment_records
        WHERE school_id = @schoolId
          AND sound_identification_score IS NOT NULL
          AND story_reading_score IS NOT NULL
          AND reading_comprehension_score IS NOT NULL
        `,
      )
      .get({ schoolId: school!.id }) as { c: number };

    if (Number(assessmentCountRow.c ?? 0) === 0) {
      const learner = addLearnerToSchool({
        schoolId: school!.id,
        fullName: `Graduation Test Learner ${Date.now()}`,
        gender: "Boy",
        age: 9,
        classGrade: "P3",
      });
      db.prepare(
        `
        INSERT INTO assessment_records (
          child_name,
          child_id,
          gender,
          age,
          school_id,
          class_grade,
          assessment_date,
          assessment_type,
          learner_uid,
          letter_identification_score,
          sound_identification_score,
          decodable_words_score,
          undecodable_words_score,
          made_up_words_score,
          story_reading_score,
          reading_comprehension_score,
          notes,
          created_by_user_id,
          created_at
        ) VALUES (
          @childName,
          @childId,
          'Boy',
          9,
          @schoolId,
          'P3',
          @assessmentDate,
          'endline',
          @learnerUid,
          8,
          9,
          8,
          8,
          8,
          8,
          8,
          'graduation test seed',
          @createdByUserId,
          @createdAt
        )
        `,
      ).run({
        childName: learner.fullName,
        childId: `GT-${Date.now()}`,
        schoolId: school!.id,
        assessmentDate: new Date().toISOString().slice(0, 10),
        learnerUid: learner.learnerUid,
        createdByUserId: actor.id,
        createdAt: new Date().toISOString(),
      });
    }

    let teacher = listTeachersBySchool(school!.id)[0];
    if (!teacher) {
      teacher = addTeacherToSchool({
        schoolId: school!.id,
        fullName: `Graduation Test Teacher ${Date.now()}`,
        gender: "Female",
        isReadingTeacher: true,
      });
    }

    const evalCount = db
      .prepare(
        `
        SELECT COUNT(*) AS c
        FROM lesson_evaluations
        WHERE school_id = @schoolId
          AND status = 'active'
        `,
      )
      .get({ schoolId: school!.id }) as { c: number };

    if (Number(evalCount.c ?? 0) === 0) {
      createLessonEvaluation(
        {
          schoolId: school!.id,
          teacherUid: teacher.teacherUid,
          grade: "P3",
          lessonDate: new Date().toISOString().slice(0, 10),
          lessonFocus: ["Sounds", "Blending/Decoding"],
          items: LESSON_EVALUATION_ITEMS.map((item) => ({
            domainKey: item.domainKey,
            itemKey: item.itemKey,
            score: 4 as const,
            note: "Strong evidence",
          })),
          strengthsText: "Teacher routines are consistent.",
          priorityGapText: "Maintain and mentor peers.",
          nextCoachingAction: "Peer coaching walk-through next visit.",
          teacherCommitment: "Will sustain routines daily.",
        },
        actor.id,
      );
    }

    updateGraduationSettings(
      {
        graduationEnabled: true,
        targetDomainProficiencyPct: 0,
        requiredDomains: ["letter_sounds"],
        requiredReadingLevel: "Non-Reader",
        requiredFluentPct: 0,
        minPublishedStories: 0,
        targetTeachingQualityPct: 0,
        requireTeachingDomains: false,
        latestAssessmentRequired: true,
        latestEvaluationRequired: true,
        assessmentCycleMode: "latest_or_endline",
        minLearnersAssessedN: 1,
        targetGrades: ["P3"],
        minTeacherEvaluationsTotal: 1,
        minEvaluationsPerReadingTeacher: 1,
        dataCompletenessThreshold: 0,
        requireSustainabilityValidation: false,
        dismissSnoozeDays: 7,
        criteriaVersion: "GRAD-test",
      },
      actor,
    );

    refreshSchoolGraduationEligibilityCache(school!.id);
    const eligibility = getSchoolGraduationEligibility(school!.id, { refresh: false });
    assert.ok(eligibility, "Expected graduation eligibility snapshot.");
    assert.equal(eligibility!.isEligible, true, "School should be eligible under permissive thresholds.");

    const checklistAnswers = Object.fromEntries(
      getGraduationSettings().sustainabilityChecklistItems.map((item) => [item, true]),
    );

    const reviewed = reviewSchoolGraduation(
      {
        schoolId: school!.id,
        action: "confirm_graduation",
        reason: "Automated test confirmation.",
        checklistAnswers,
      },
      actor,
    );
    assert.ok(reviewed, "Expected graduation review response.");
    assert.equal(reviewed?.programStatus, "monitoring");
    assert.equal(reviewed?.workflowState, "monitoring");

    const logs = listAuditLogs({ targetTable: "schools_directory", limit: 200 });
    assert.ok(
      logs.some(
        (entry) =>
          entry.action === "confirm_graduation" &&
          Number(entry.targetId ?? 0) === school!.id,
      ),
      "Expected confirm_graduation audit event.",
    );
  } finally {
    const restoredCycle = (() => {
      const value = String(originalSettings?.assessment_cycle_mode ?? "latest_or_endline");
      if (value === "latest" || value === "endline" || value === "latest_or_endline") {
        return value;
      }
      return "latest_or_endline";
    })();

    db.prepare(
      `
      UPDATE graduation_settings
      SET
        graduation_enabled = @graduation_enabled,
        target_domain_proficiency_pct = @target_domain_proficiency_pct,
        required_domains_json = @required_domains_json,
        required_reading_level = @required_reading_level,
        required_fluent_pct = @required_fluent_pct,
        min_published_stories = @min_published_stories,
        target_teaching_quality_pct = @target_teaching_quality_pct,
        require_teaching_domains = @require_teaching_domains,
        latest_assessment_required = @latest_assessment_required,
        latest_evaluation_required = @latest_evaluation_required,
        assessment_cycle_mode = @assessment_cycle_mode,
        dismiss_snooze_days = @dismiss_snooze_days,
        criteria_version = @criteria_version,
        updated_at = datetime('now')
      WHERE id = 1
      `,
    ).run({
      graduation_enabled: Number(originalSettings?.graduation_enabled ?? 1),
      target_domain_proficiency_pct: Number(originalSettings?.target_domain_proficiency_pct ?? 90),
      required_domains_json:
        String(originalSettings?.required_domains_json ?? '["letter_sounds","decoding","fluency","comprehension"]'),
      required_reading_level: String(originalSettings?.required_reading_level ?? "Fluent"),
      required_fluent_pct: Number(originalSettings?.required_fluent_pct ?? 100),
      min_published_stories: Number(originalSettings?.min_published_stories ?? 15),
      target_teaching_quality_pct: Number(originalSettings?.target_teaching_quality_pct ?? 90),
      require_teaching_domains: Number(originalSettings?.require_teaching_domains ?? 0),
      latest_assessment_required: Number(originalSettings?.latest_assessment_required ?? 1),
      latest_evaluation_required: Number(originalSettings?.latest_evaluation_required ?? 1),
      assessment_cycle_mode: restoredCycle,
      dismiss_snooze_days: Number(originalSettings?.dismiss_snooze_days ?? 30),
      criteria_version: String(originalSettings?.criteria_version ?? "GRAD-v1.0"),
    });
  }
});
