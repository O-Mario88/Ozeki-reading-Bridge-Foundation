import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticatePortalUser,
  createLessonEvaluationAsync,
  createPortalSession,
  createSchoolDirectoryRecord,
  getGraduationSettingsAsync,
  getPortalUserByEmail,
  getPortalUserFromSession,
  getSchoolGraduationEligibilityAsync,
  refreshSchoolGraduationEligibilityCacheAsync,
  reviewSchoolGraduationAsync,
  saveAssessmentRecordAsync,
  updateGraduationSettingsAsync,
} from "../lib/db-api";
import { LESSON_EVALUATION_ITEMS } from "../lib/lesson-evaluation";
import { queryPostgres } from "../lib/server/postgres/client";
import type { PortalUser } from "../lib/types";

async function toPortalActor(): Promise<PortalUser> {
  const configured =
    process.env.PORTAL_SUPERADMIN_EMAIL?.toLowerCase() ?? "edwin@ozekiread.org";
  const actor =
    (await getPortalUserByEmail(configured)) ??
    (await getPortalUserByEmail("edwin@ozekiread.org")) ??
    (await getPortalUserByEmail("admin@ozekiread.org"));
  assert.ok(actor, "Missing seeded super admin/admin user for graduation test.");
  return actor as PortalUser;
}

test("seeded super admin credentials authenticate successfully even after credential drift", async () => {
  const email = process.env.PORTAL_SUPERADMIN_EMAIL?.toLowerCase() ?? "edwin@ozekiread.org";
  const password = process.env.PORTAL_SUPERADMIN_PASSWORD ?? "Ozeki@16079";

  await queryPostgres(
    `
      UPDATE portal_users
      SET password_hash = 'stale-hash'
      WHERE lower(email) = lower($1)
    `,
    [email],
  );

  const actor = await authenticatePortalUser(email, password);
  assert.ok(actor, "Expected seeded super admin credentials to authenticate.");
  assert.equal(actor.email, email);
  assert.equal(actor.isSuperAdmin, true);
});

test("portal session token remains valid even if the sqlite session row is unavailable", async () => {
  const email = process.env.PORTAL_SUPERADMIN_EMAIL?.toLowerCase() ?? "edwin@ozekiread.org";
  const password = process.env.PORTAL_SUPERADMIN_PASSWORD ?? "Ozeki@16079";
  const actor = await authenticatePortalUser(email, password);
  assert.ok(actor, "Expected seeded super admin credentials to authenticate.");

  const session = await createPortalSession(actor.id);
  await queryPostgres(`DELETE FROM portal_sessions WHERE token = $1`, [session.token]);

  const recoveredActor = await getPortalUserFromSession(session.token);
  assert.ok(recoveredActor, "Expected stateless portal session fallback to authenticate.");
  assert.equal(recoveredActor.email, email);
  assert.equal(recoveredActor.isSuperAdmin, true);
});

test("school graduation eligibility is computed from live records and confirmation is audited", async () => {
  const actor = await toPortalActor();
  const originalSettings = await getGraduationSettingsAsync();
  assert.ok(originalSettings, "Missing graduation settings row.");
  const { updatedAt: _updatedAt, ...originalSettingsInput } = originalSettings;

  try {
    const school = await createSchoolDirectoryRecord({
      name: `Graduation Test School ${Date.now()}`,
      district: "Kampala",
      subCounty: "Nakawa",
      parish: "Kisaasi",
      enrollmentTotal: 120,
      enrolledBoys: 58,
      enrolledGirls: 62,
      proprietor: {
        fullName: "Graduation Test Proprietor",
        gender: "Female",
        phone: "+256700300300",
        roleTitle: "Director",
      },
    });
    assert.ok(school, "Expected at least one school.");

    await saveAssessmentRecordAsync(
      {
        childName: `Graduation Test Learner ${Date.now()}`,
        childId: `GT-${Date.now()}`,
        gender: "Boy",
        age: 9,
        schoolId: school.id,
        classGrade: "P3",
        assessmentDate: new Date().toISOString().slice(0, 10),
        assessmentType: "endline",
        letterIdentificationScore: 8,
        soundIdentificationScore: 9,
        decodableWordsScore: 8,
        undecodableWordsScore: 8,
        madeUpWordsScore: 8,
        storyReadingScore: 8,
        readingComprehensionScore: 8,
        notes: "graduation test seed",
      },
      actor.id,
    );

    const teacherUid = `TR-GRAD-${Date.now()}`;
    await queryPostgres(
      `
        INSERT INTO teacher_roster (
          teacher_uid,
          school_id,
          full_name,
          gender,
          class_taught,
          role_title,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `,
      [teacherUid, school.id, `Graduation Test Teacher ${Date.now()}`, "Female", "P3", "Reading Teacher"],
    );

    await createLessonEvaluationAsync(
      {
        schoolId: school.id,
        teacherUid,
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

    await updateGraduationSettingsAsync(
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

    await refreshSchoolGraduationEligibilityCacheAsync(school.id);
    const eligibility = await getSchoolGraduationEligibilityAsync(school.id, { refresh: false });
    assert.ok(eligibility, "Expected graduation eligibility snapshot.");
    assert.equal(eligibility!.isEligible, true, "School should be eligible under permissive thresholds.");

    const checklistAnswers = Object.fromEntries(
      (await getGraduationSettingsAsync())!.sustainabilityChecklistItems.map((item: string) => [item, true]),
    );

    const reviewed = await reviewSchoolGraduationAsync(
      {
        schoolId: school.id,
        action: "confirm_graduation",
        reason: "Automated test confirmation.",
        checklistAnswers,
      },
      actor,
    );
    assert.ok(reviewed, "Expected graduation review response.");
    assert.equal(reviewed?.programStatus, "monitoring");
    assert.equal(reviewed?.workflowState, "monitoring");

    const logs = await queryPostgres<{ action: string; targetId: string | null }>(
      `
        SELECT action, target_id AS "targetId"
        FROM audit_logs
        WHERE target_table = $1
        ORDER BY timestamp DESC
        LIMIT 200
      `,
      ["schools_directory"],
    );
    assert.ok(
      logs.rows.some(
        (entry) =>
          entry.action === "confirm_graduation" &&
          Number(entry.targetId ?? 0) === school.id,
      ),
      "Expected confirm_graduation audit event.",
    );
  } finally {
    await updateGraduationSettingsAsync(originalSettingsInput, actor);
  }
});
