import assert from "node:assert/strict";
import test from "node:test";
import {
  createPortalRecordAsync,
  setPortalRecordStatusAsync,
  updatePortalRecordAsync,
} from "../lib/db-api";
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
  module: "story",
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
    const nextDate = new Date(`${candidate}T00:00:00.000Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    candidate = nextDate.toISOString().slice(0, 10);
  }
  throw new Error(`Could not find an available date for ${module}.`);
}

test(
  "story portal records write through postgres-first path when configured",
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
      learnerId: number;
    }>(
      `
        SELECT
          sd.id AS "schoolId",
          sd.name AS "schoolName",
          sd.district AS district,
          sc.contact_id AS "contactId",
          sl.learner_id AS "learnerId"
        FROM schools_directory sd
        JOIN school_contacts sc ON sc.school_id = sd.id
        JOIN school_learners sl ON sl.school_id = sd.id
        ORDER BY sd.id ASC, sc.contact_id ASC, sl.learner_id ASC
        LIMIT 1
      `,
    );
    const seed = seedResult.rows[0];
    assert.ok(seed, "Expected a seeded school contact and learner.");

    const stamp = Date.now();
    const baseDate = `2027-10-${String((stamp % 28) + 1).padStart(2, "0")}`;
    const date = await findAvailableRecordDate("story", seed.schoolId, baseDate);
    const basePayload = {
      sponsorshipType: "Community-funded",
      sponsoredBy: "Portal story postgres test",
      sessionType: "drafting",
      learnersCount: 1,
      draftsCount: 1,
      revisionsCount: 0,
      notes: `Story notes ${stamp}`,
      storyParticipants: [
        {
          contactId: seed.contactId,
          participantName: `Story guide ${stamp}`,
        },
      ],
      storyLearners: [
        {
          learnerId: seed.learnerId,
        },
      ],
      insightsKeyFindings: `Story insight ${stamp}`,
      insightsConclusionsNextSteps: `Story next step ${stamp}`,
      insightsRecommendationsRecIds: ["REC-03"],
    };

    const created = await createPortalRecordAsync(
      {
        module: "story",
        date,
        district: seed.district,
        schoolId: seed.schoolId,
        schoolName: seed.schoolName,
        status: "Submitted",
        payload: basePayload,
      },
      actor,
    );
    assert.ok(created.id > 0, "Expected a story record id.");
    assert.equal(created.module, "story");

    const updated = await updatePortalRecordAsync(
      created.id,
      {
        module: "story",
        date,
        district: seed.district,
        schoolId: seed.schoolId,
        schoolName: seed.schoolName,
        status: "Submitted",
        payload: {
          ...basePayload,
          notes: `Updated story notes ${stamp}`,
          insightsKeyFindings: `Updated story insight ${stamp}`,
          insightsConclusionsNextSteps: `Updated story next step ${stamp}`,
          insightsRecommendationsRecIds: ["REC-03", "REC-04"],
        },
      },
      actor,
    );
    assert.equal(updated.id, created.id);

    const approved = await setPortalRecordStatusAsync(
      created.id,
      "Approved",
      actor,
      "postgres story approved",
    );
    assert.ok(approved, "Expected an approved story record.");
    assert.equal(approved?.status, "Approved");

    const storyActivityRow = await queryPostgres<{ storyActivityId: number | null }>(
      `
        SELECT id AS "storyActivityId"
        FROM story_activities
        WHERE portal_record_id = $1
      `,
      [created.id],
    );
    const storyActivityId = Number(storyActivityRow.rows[0]?.storyActivityId ?? 0);
    assert.ok(storyActivityId > 0, "Expected a PostgreSQL story activity row.");

    const participantRow = await queryPostgres<{ c: string }>(
      `
        SELECT COUNT(*)::text AS c
        FROM story_activity_participants
        WHERE story_activity_id = $1
      `,
      [storyActivityId],
    );
    assert.equal(Number(participantRow.rows[0]?.c ?? 0), 1);

    const learnerRow = await queryPostgres<{ c: string }>(
      `
        SELECT COUNT(*)::text AS c
        FROM story_activity_learners
        WHERE story_activity_id = $1
      `,
      [storyActivityId],
    );
    assert.equal(Number(learnerRow.rows[0]?.c ?? 0), 1);
  },
);
