import assert from "node:assert/strict";
import test from "node:test";
import {
  createPortalRecordAsync,
  getDb,
  setPortalRecordStatusAsync,
  updatePortalRecordAsync,
} from "../lib/db";
import { isPostgresConfigured, queryPostgres } from "../lib/server/postgres/client";
import type { PortalUser } from "../lib/types";

function getSuperAdminActor(): PortalUser {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT
          id,
          full_name AS fullName,
          email,
          phone,
          role,
          geography_scope AS geographyScope,
          is_supervisor AS isSupervisor,
          is_me AS isME,
          is_admin AS isAdmin,
          is_superadmin AS isSuperAdmin
        FROM portal_users
        WHERE is_superadmin = 1
        ORDER BY id ASC
        LIMIT 1
      `,
    )
    .get() as
    | {
      id: number;
      fullName: string;
      email: string;
      phone: string | null;
      role: PortalUser["role"];
      geographyScope: string | null;
      isSupervisor: number;
      isME: number;
      isAdmin: number;
      isSuperAdmin: number;
    }
    | undefined;

  assert.ok(row, "Expected a superadmin actor.");
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    geographyScope: row.geographyScope,
    isSupervisor: row.isSupervisor === 1,
    isME: row.isME === 1,
    isAdmin: row.isAdmin === 1,
    isSuperAdmin: row.isSuperAdmin === 1,
  };
}

test(
  "visit portal records write directly to postgres when configured",
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

    const actor = getSuperAdminActor();
    const seed = getDb()
      .prepare(
        `
          SELECT
            sd.id AS schoolId,
            sd.name AS schoolName,
            sd.district AS district,
            sc.contact_id AS contactId
          FROM schools_directory sd
          JOIN school_contacts sc ON sc.school_id = sd.id
          ORDER BY sd.id ASC, sc.contact_id ASC
          LIMIT 1
        `,
      )
      .get() as
      | {
        schoolId: number;
        schoolName: string;
        district: string;
        contactId: number;
      }
      | undefined;
    assert.ok(seed, "Expected a seeded school contact.");

    const stamp = Date.now();
    const date = `2027-12-${String((stamp % 28) + 1).padStart(2, "0")}`;
    const basePayload = {
      sponsorshipType: "Partner-funded",
      sponsoredBy: "Portal visit postgres test",
      implementationStatus: "not_started",
      demoClass: "P3",
      demoFocus: "New sound routines",
      demoMinutes: 40,
      demoTeachersPresentContactIds: [seed.contactId],
      demoTakeawaysText: `Demo takeaways ${stamp}`,
      implementationStartDate: "2028-01-08",
      dailyReadingTimeMinutes: 30,
      classesToStartFirst: ["P3"],
      implementationResponsibleContactId: seed.contactId,
      supportNeededFromOzeki: ["Coaching follow-up"],
      leadershipAttendeesContactIds: [seed.contactId],
      leadershipSummary: `Leadership summary ${stamp}`,
      leadershipAgreements: `Leadership agreements ${stamp}`,
      leadershipRisks: `Leadership risks ${stamp}`,
      leadershipNextActionsJson: JSON.stringify([
        {
          action: `Launch reading block ${stamp}`,
          ownerContactId: seed.contactId,
          dueDate: "2028-01-10",
        },
      ]),
      leadershipNextVisitDate: "2028-01-20",
      insightsKeyFindings: `Visit insight ${stamp}`,
      insightsConclusionsNextSteps: `Visit next step ${stamp}`,
      insightsRecommendationsRecIds: ["REC-01"],
    };

    const created = await createPortalRecordAsync(
      {
        module: "visit",
        date,
        district: seed.district,
        schoolId: seed.schoolId,
        schoolName: seed.schoolName,
        status: "Submitted",
        payload: basePayload,
      },
      actor,
    );
    assert.ok(created.id > 0, "Expected a visit record id.");
    assert.equal(created.module, "visit");

    const updated = await updatePortalRecordAsync(
      created.id,
      {
        module: "visit",
        date,
        district: seed.district,
        schoolId: seed.schoolId,
        schoolName: seed.schoolName,
        status: "Submitted",
        payload: {
          ...basePayload,
          leadershipSummary: `Updated leadership summary ${stamp}`,
          insightsKeyFindings: `Updated visit insight ${stamp}`,
          insightsConclusionsNextSteps: `Updated visit next step ${stamp}`,
          insightsRecommendationsRecIds: ["REC-01", "REC-02"],
        },
      },
      actor,
    );
    assert.equal(updated.id, created.id);

    const approved = await setPortalRecordStatusAsync(
      created.id,
      "Approved",
      actor,
      "postgres visit approved",
    );
    assert.ok(approved, "Expected an approved visit record.");
    assert.equal(approved?.status, "Approved");

    const pgRow = await queryPostgres<{
      status: string | null;
      reviewNote: string | null;
    }>(
      `
        SELECT
          status,
          review_note AS "reviewNote"
        FROM portal_records
        WHERE id = $1
      `,
      [created.id],
    );
    assert.equal(pgRow.rows[0]?.status ?? null, "Approved");
    assert.equal(pgRow.rows[0]?.reviewNote ?? null, "postgres visit approved");
  },
);
