import assert from "node:assert/strict";
import test from "node:test";
import {
  extractAndSaveCoachingVisitAsync,
} from "../lib/server/postgres/repositories/coaching-visits";
import { isPostgresConfigured, queryPostgres } from "../lib/server/postgres/client";

test(
  "coaching visit async writes directly to postgres when configured",
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
      contactId: number;
    }>(
      `
        SELECT
          COALESCE(sc.school_id, tr.school_id) AS "schoolId",
          tr.teacher_uid AS "teacherUid",
          sc.contact_id AS "contactId"
        FROM teacher_roster tr
        LEFT JOIN school_contacts sc ON sc.teacher_uid = tr.teacher_uid
        WHERE COALESCE(sc.school_id, tr.school_id) IS NOT NULL
          AND sc.contact_id IS NOT NULL
        ORDER BY COALESCE(sc.school_id, tr.school_id) ASC, tr.teacher_uid ASC
        LIMIT 1
      `,
    );
    const schoolId = Number(teacherResult.rows[0]?.schoolId ?? 0);
    const teacherUid = String(teacherResult.rows[0]?.teacherUid ?? "");
    const contactId = Number(teacherResult.rows[0]?.contactId ?? 0);

    assert.ok(schoolId > 0, "Expected a PostgreSQL school for the coaching visit test.");
    assert.ok(teacherUid, "Expected a PostgreSQL teacher for the coaching visit test.");

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
    
    // Simulate the creation of a portal_record first to act as parent
    const recordResult = await queryPostgres<{ id: number }>(
      `
        INSERT INTO portal_records (
          module, district, school_id, school_name, date, status, payload_json, created_by_user_id
        ) VALUES (
          'visit', 'TestDistrict', $1, 'TestSchool', '2026-03-15', 'Submitted', '{}', $2
        ) RETURNING id
      `, [schoolId, userId]
    );
    const recordId = Number(recordResult.rows[0]?.id ?? 0);

    const visitId = await extractAndSaveCoachingVisitAsync({
      recordId,
      schoolId,
      date: "2026-03-15",
      visitType: "school_visit",
      coachUserId: userId,
      payloadObj: {
        coachingCycleNumber: 2,
        visitReason: "lesson_evaluation_coaching",
        focusAreas: ["Sounds", "Fluency"],
        implementationStatus: "partial",
        demoDelivered: "yes",
        demoClass: "P3",
        demoFocus: "Blending",
        demoMinutes: 30,
        demoComponents: ["I Do", "We Do"],
        demoMaterialsUsed: ["Decodable Books"],
        demoTeachersPresentContactIds: [contactId],
        demoTakeawaysText: `Demo test takeaway ${stamp}`,
        implementationStartDate: "2026-03-18",
        dailyReadingTimeMinutes: 45,
        classesToStartFirst: ["P3"],
        implementationResponsibleContactId: contactId,
        leadershipMeetingHeld: "yes",
        leadershipAttendeesContactIds: [contactId],
        leadershipSummary: `Meeting summary ${stamp}`,
        leadershipAgreements: `Meeting agreements ${stamp}`,
        leadershipNextActionsJson: JSON.stringify([{ action: "Test Action", owner: "Tester", timeframe: "1 Week" }]),
        leadershipNextVisitDate: "2026-04-15"
      }
    });

    assert.ok(visitId !== null && visitId > 0, "Expected a persisted coaching visit id.");

    const queryCoachingVisit = await queryPostgres<{ id: number, pathway: string }>(
      `
        SELECT id, visit_pathway AS pathway
        FROM coaching_visits
        WHERE id = $1
      `,
      [visitId],
    );
    assert.equal(Number(queryCoachingVisit.rows.length), 1);
    assert.equal(queryCoachingVisit.rows[0]?.pathway ?? "", "mixed");

    const queryVisitDemo = await queryPostgres<{ takeawaysText: string }>(
      `
        SELECT takeaways_text AS "takeawaysText"
        FROM visit_demo
        WHERE visit_id = $1
      `,
      [visitId],
    );
    assert.equal(queryVisitDemo.rows[0]?.takeawaysText ?? "", `Demo test takeaway ${stamp}`);

    const queryVisitMeeting = await queryPostgres<{ summaryText: string }>(
      `
        SELECT summary_text AS "summaryText"
        FROM visit_leadership_meeting
        WHERE visit_id = $1
      `,
      [visitId],
    );
    assert.equal(queryVisitMeeting.rows[0]?.summaryText ?? "", `Meeting summary ${stamp}`);
    
    // Cleanup generated record
    await queryPostgres(`DELETE FROM portal_records WHERE id = $1`, [recordId]);
  },
);
