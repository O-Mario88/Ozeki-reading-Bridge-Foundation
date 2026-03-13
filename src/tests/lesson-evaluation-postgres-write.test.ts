import assert from "node:assert/strict";
import test from "node:test";
import {
  createLessonEvaluationAsync,
  updateLessonEvaluationAsync,
  voidLessonEvaluationAsync,
} from "../lib/db";
import { LESSON_EVALUATION_ITEMS } from "../lib/lesson-evaluation";
import { isPostgresConfigured, queryPostgres } from "../lib/server/postgres/client";

test(
  "lesson evaluation async writes directly to postgres when configured",
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

    const teacherResult = await queryPostgres<{
      schoolId: number | string;
      teacherUid: string;
    }>(
      `
        SELECT
          COALESCE(sc.school_id, tr.school_id) AS "schoolId",
          tr.teacher_uid AS "teacherUid"
        FROM teacher_roster tr
        LEFT JOIN school_contacts sc ON sc.teacher_uid = tr.teacher_uid
        WHERE COALESCE(sc.school_id, tr.school_id) IS NOT NULL
        ORDER BY COALESCE(sc.school_id, tr.school_id) ASC, tr.teacher_uid ASC
        LIMIT 1
      `,
    );
    const schoolId = Number(teacherResult.rows[0]?.schoolId ?? 0);
    const teacherUid = String(teacherResult.rows[0]?.teacherUid ?? "");
    assert.ok(schoolId > 0, "Expected a PostgreSQL school for the lesson evaluation test.");
    assert.ok(teacherUid, "Expected a PostgreSQL teacher for the lesson evaluation test.");

    const userResult = await queryPostgres<{ id: number }>(
      `
        SELECT id
        FROM portal_users
        ORDER BY is_superadmin DESC, id ASC
        LIMIT 1
      `,
    );
    const userId = Number(userResult.rows[0]?.id ?? 0);
    assert.ok(userId > 0, "Expected at least one PostgreSQL portal user.");

    const stamp = Date.now();
    const created = await createLessonEvaluationAsync(
      {
        schoolId,
        teacherUid,
        grade: "P3",
        lessonDate: "2026-03-13",
        lessonFocus: ["New sound", "Decoding"],
        items: LESSON_EVALUATION_ITEMS.map((item) => ({
          domainKey: item.domainKey,
          itemKey: item.itemKey,
          score: 4 as const,
          note: `postgres-create-${stamp}`,
        })),
        strengthsText: `Strong routines ${stamp}`,
        priorityGapText: `Gap focus ${stamp}`,
        nextCoachingAction: `Coach action ${stamp}`,
        teacherCommitment: `Commitment ${stamp}`,
      },
      userId,
    );

    assert.ok(created.id > 0, "Expected a persisted lesson evaluation id.");
    assert.equal(created.teacherUid, teacherUid);

    const createdRow = await queryPostgres<{ c: string }>(
      `
        SELECT COUNT(*)::text AS c
        FROM lesson_evaluations
        WHERE id = $1
      `,
      [created.id],
    );
    assert.equal(Number(createdRow.rows[0]?.c ?? 0), 1);

    const updated = await updateLessonEvaluationAsync(
      created.id,
      {
        schoolId,
        teacherUid,
        grade: "P3",
        lessonDate: "2026-03-13",
        lessonFocus: ["Reading practice", "Check next"],
        items: LESSON_EVALUATION_ITEMS.map((item) => ({
          domainKey: item.domainKey,
          itemKey: item.itemKey,
          score: 3 as const,
          note: `postgres-update-${stamp}`,
        })),
        strengthsText: `Updated strengths ${stamp}`,
        priorityGapText: `Updated gap ${stamp}`,
        nextCoachingAction: `Updated action ${stamp}`,
        teacherCommitment: `Updated commitment ${stamp}`,
      },
      userId,
    );

    assert.equal(updated.priorityGapText, `Updated gap ${stamp}`);

    const updatedRow = await queryPostgres<{ gap: string | null }>(
      `
        SELECT priority_gap_text AS gap
        FROM lesson_evaluations
        WHERE id = $1
      `,
      [created.id],
    );
    assert.equal(updatedRow.rows[0]?.gap ?? null, `Updated gap ${stamp}`);

    const voided = await voidLessonEvaluationAsync(created.id, userId, "postgres-native-void");
    assert.ok(voided, "Expected a voided lesson evaluation result.");
    assert.equal(voided?.status, "void");

    const voidRow = await queryPostgres<{
      status: string | null;
      reason: string | null;
    }>(
      `
        SELECT
          status,
          void_reason AS reason
        FROM lesson_evaluations
        WHERE id = $1
      `,
      [created.id],
    );
    assert.equal(voidRow.rows[0]?.status ?? null, "void");
    assert.equal(voidRow.rows[0]?.reason ?? null, "postgres-native-void");
  },
);
