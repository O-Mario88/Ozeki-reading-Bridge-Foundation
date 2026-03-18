import assert from "node:assert/strict";
import test from "node:test";
import { saveAssessmentRecordAsync } from "../lib/db-api";
import { isPostgresConfigured, queryPostgres } from "../lib/server/postgres/client";

test(
  "saveAssessmentRecordAsync writes directly to postgres when configured",
  { skip: isPostgresConfigured() ? false : "DATABASE_URL is not configured." },
  async (t) => {
    try {
      await queryPostgres("SELECT 1");
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
      t.skip(`PostgreSQL is not reachable (${code}).`);
      return;
    }

    const schoolResult = await queryPostgres<{ id: number }>(
      `
        SELECT id
        FROM schools_directory
        ORDER BY id ASC
        LIMIT 1
      `,
    );
    const schoolId = Number(schoolResult.rows[0]?.id ?? 0);
    assert.ok(schoolId > 0, "Expected at least one PostgreSQL school.");

    const userResult = await queryPostgres<{ id: number }>(
      `
        SELECT id
        FROM portal_users
        ORDER BY is_superadmin DESC, id ASC
        LIMIT 1
      `,
    );
    const createdByUserId = Number(userResult.rows[0]?.id ?? 0);
    assert.ok(createdByUserId > 0, "Expected at least one PostgreSQL portal user.");

    const stamp = Date.now();
    const childName = `Postgres Native Assessment ${stamp}`;
    const saved = await saveAssessmentRecordAsync(
      {
        childName,
        gender: "Girl",
        age: 9,
        schoolId,
        classGrade: "P3",
        assessmentDate: "2026-03-13",
        assessmentType: "baseline",
        letterIdentificationScore: 18,
        soundIdentificationScore: 17,
        decodableWordsScore: 15,
        undecodableWordsScore: 11,
        madeUpWordsScore: 7,
        storyReadingScore: 24,
        fluencyAccuracyScore: 92,
        readingComprehensionScore: 4,
        notes: "postgres-native-write-test",
      },
      createdByUserId,
    );

    assert.ok(saved.id > 0, "Expected saved assessment id.");
    assert.equal(saved.childName, childName);
    assert.ok(saved.learnerUid, "Expected learner UID.");

    const assessmentRows = await queryPostgres<{ c: string }>(
      `
        SELECT COUNT(*)::text AS c
        FROM assessment_records
        WHERE id = $1
      `,
      [saved.id],
    );
    assert.equal(Number(assessmentRows.rows[0]?.c ?? 0), 1);

    const learnerRows = await queryPostgres<{ c: string }>(
      `
        SELECT COUNT(*)::text AS c
        FROM learner_roster
        WHERE learner_uid = $1
      `,
      [saved.learnerUid],
    );
    assert.equal(Number(learnerRows.rows[0]?.c ?? 0), 1);

    const schoolLearnerRows = await queryPostgres<{ c: string }>(
      `
        SELECT COUNT(*)::text AS c
        FROM school_learners
        WHERE learner_uid = $1
      `,
      [saved.learnerUid],
    );
    assert.equal(Number(schoolLearnerRows.rows[0]?.c ?? 0), 1);
  },
);
