import assert from "node:assert/strict";
import test from "node:test";
import {
  createPortalRecordAsync,
  setPortalRecordStatusAsync,
  updatePortalRecordAsync,
} from "../lib/db";
import { isPostgresConfigured, queryPostgres } from "../lib/server/postgres/client";
import type { PortalUser } from "../lib/types";

async function getSuperAdminActor(): Promise<PortalUser> {
  const rowResult = await queryPostgres<{
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    role: PortalUser["role"];
    geographyScope: string | null;
    isSupervisor: boolean;
    isME: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  }>(
    `
      SELECT
        id,
        full_name AS "fullName",
        email,
        phone,
        role,
        geography_scope AS "geographyScope",
        is_supervisor AS "isSupervisor",
        is_me AS "isME",
        is_admin AS "isAdmin",
        is_superadmin AS "isSuperAdmin"
      FROM portal_users
      WHERE is_superadmin = TRUE
      ORDER BY id ASC
      LIMIT 1
    `,
  );
  const row = rowResult.rows[0];
  assert.ok(row, "Expected a superadmin actor.");
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    geographyScope: row.geographyScope,
    isSupervisor: Boolean(row.isSupervisor),
    isME: Boolean(row.isME),
    isAdmin: Boolean(row.isAdmin),
    isSuperAdmin: Boolean(row.isSuperAdmin),
  };
}

async function findAvailableRecordDate(
  module: "visit",
  schoolId: number,
  baseDate: string,
) {
  let candidate = baseDate;
  for (let offset = 0; offset < 60; offset += 1) {
    const existing = await queryPostgres<{ c: string }>(
      `
        SELECT COUNT(*)::text AS c
        FROM portal_records
        WHERE module = $1
          AND school_id = $2
          AND date = $3::date
      `,
      [module, schoolId, candidate],
    );
    if (Number(existing.rows[0]?.c ?? 0) === 0) {
      return candidate;
    }
    candidate = new Date(`${candidate}T00:00:00.000Z`);
    candidate.setUTCDate(candidate.getUTCDate() + 1);
    candidate = candidate.toISOString().slice(0, 10);
  }
  throw new Error(`Could not find an available date for ${module}.`);
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

    const actor = await getSuperAdminActor();
    const seedResult = await queryPostgres<{
      schoolId: number;
      schoolName: string;
      district: string;
      contactId: number;
    }>(
      `
        SELECT
          sd.id AS "schoolId",
          sd.name AS "schoolName",
          sd.district AS district,
          sc.contact_id AS "contactId"
        FROM schools_directory sd
        JOIN school_contacts sc ON sc.school_id = sd.id
        ORDER BY sd.id ASC, sc.contact_id ASC
        LIMIT 1
      `,
    );
    const seed = seedResult.rows[0];
    assert.ok(seed, "Expected a seeded school contact.");

    const stamp = Date.now();
    const baseDate = `2027-12-${String((stamp % 28) + 1).padStart(2, "0")}`;
    const date = await findAvailableRecordDate("visit", seed.schoolId, baseDate);
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
