import assert from "node:assert/strict";
import test from "node:test";
import {
  createPortalRecordAsync,
  createSchoolDirectoryRecord,
  getPortalUserByEmail,
} from "../lib/db-api";
import { queryPostgres } from "../lib/server/postgres/client";
import type { PortalUser } from "../lib/types";

async function getSuperAdminActor(): Promise<PortalUser> {
  const actor =
    (await getPortalUserByEmail(process.env.PORTAL_SUPERADMIN_EMAIL?.toLowerCase() ?? "edwin@ozekiread.org")) ??
    (await getPortalUserByEmail("edwin@ozekiread.org")) ??
    (await getPortalUserByEmail("admin@ozekiread.org"));
  assert.ok(actor, "Expected at least one super admin.");
  return actor as PortalUser;
}

async function createTestSchool(tag: string) {
  return createSchoolDirectoryRecord({
    name: `School First ${tag} ${Date.now()}`,
    district: "Kampala",
    subCounty: "Nakawa",
    parish: "Kisaasi",
    enrollmentTotal: 200,
    enrolledBoys: 95,
    enrolledGirls: 105,
    proprietor: {
      fullName: `Proprietor ${tag}`,
      gender: "Female",
      phone: "+256700000000",
      roleTitle: "Director",
    },
  });
}

async function createSchoolContact(schoolId: number) {
  const stamp = Date.now();
  const result = await queryPostgres<{
    contactId: number;
    contactUid: string;
    fullName: string;
  }>(
    `
      WITH next_id AS (
        SELECT COALESCE(MAX(contact_id), 0) + 1 AS id
        FROM school_contacts
      )
      INSERT INTO school_contacts (
        contact_id,
        contact_uid,
        school_id,
        full_name,
        gender,
        phone,
        category,
        class_taught,
        subject_taught,
        is_primary_contact,
        created_at,
        updated_at
      ) VALUES (
        (SELECT id FROM next_id), $1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW(), NOW()
      )
      RETURNING contact_id AS "contactId", contact_uid AS "contactUid", full_name AS "fullName"
    `,
    [`SC-TEST-${stamp}`, schoolId, "Teacher Training Contact", "Female", "+256771111111", "Teacher", "P3", "Literacy"],
  );
  return result.rows[0]!;
}

async function createSchoolLearner(schoolId: number) {
  const stamp = Date.now();
  const result = await queryPostgres<{
    learnerId: number;
    learnerUid: string;
  }>(
    `
      WITH next_id AS (
        SELECT COALESCE(MAX(learner_id), 0) + 1 AS id
        FROM school_learners
      )
      INSERT INTO school_learners (
        learner_id,
        learner_uid,
        school_id,
        learner_name,
        class_grade,
        age,
        gender,
        created_at,
        updated_at
      ) VALUES (
        (SELECT id FROM next_id), $1, $2, $3, $4, $5, $6, NOW(), NOW()
      )
      RETURNING learner_id AS "learnerId", learner_uid AS "learnerUid"
    `,
    [`SL-TEST-${stamp}`, schoolId, "Assessment Learner", "P4", 10, "Girl"],
  );
  return result.rows[0]!;
}

test("school creation requires primary contact", async () => {
  await assert.rejects(
    () =>
      createSchoolDirectoryRecord({
        name: `Missing Proprietor ${Date.now()}`,
        district: "Kampala",
        enrollmentTotal: 50,
        proprietor: {
          fullName: "   ",
          gender: "Male",
        },
      }),
    /A primary contact is required/i,
  );
});

test("training blocks free-text participants and accepts school roster contact IDs", async () => {
  const actor = await getSuperAdminActor();
  const school = await createTestSchool("training");
  const contact = await createSchoolContact(school.id);

  await assert.rejects(
    () =>
      createPortalRecordAsync(
        {
          module: "training",
          date: "2026-03-06",
          district: String(school.district),
          schoolId: school.id,
          schoolName: String(school.name),
          programType: "Phonics",
          followUpDate: "2026-03-20",
          followUpType: "school_visit",
          followUpOwnerUserId: actor.id,
          status: "Draft",
          payload: {
            participants: JSON.stringify([
              {
                participantName: "Free Text Person",
                role: "Teacher",
                gender: "Female",
              },
            ]),
          },
        },
        actor.id,
      ),
    /Participant not found in school roster/i,
  );

  const record = await createPortalRecordAsync(
    {
      module: "training",
      date: "2026-03-06",
      district: String(school.district),
      schoolId: school.id,
      schoolName: String(school.name),
      programType: "Phonics",
      followUpDate: "2026-03-20",
      followUpType: "school_visit",
      followUpOwnerUserId: actor.id,
      status: "Draft",
      payload: {
        participants: JSON.stringify([
          {
            contactId: contact.contactId,
            contactUid: contact.contactUid,
            role: "Teacher",
          },
        ]),
      },
    },
    actor.id,
  );

  const payloadRows = JSON.parse(String(record.payload.participants ?? "[]")) as Array<{
    contactId?: number;
    participantName?: string;
  }>;
  assert.equal(payloadRows.length, 1);
  assert.equal(payloadRows[0]?.contactId, contact.contactId);
  assert.equal(payloadRows[0]?.participantName, contact.fullName);
});

test("assessment blocks free-text learners and accepts school learner IDs", async () => {
  const actor = await getSuperAdminActor();
  const school = await createTestSchool("assessment");
  const learner = await createSchoolLearner(school.id);

  await assert.rejects(
    () =>
      createPortalRecordAsync(
        {
          module: "assessment",
          date: "2026-03-06",
          district: String(school.district),
          schoolId: school.id,
          schoolName: String(school.name),
          programType: "Baseline",
          status: "Draft",
          payload: {
            classLevel: "P4",
            egraLearnersData: JSON.stringify([
              {
                learnerName: "Unlinked Learner",
                learnerId: "FREE-TEXT-1",
                age: 9,
              },
            ]),
          },
        },
        actor.id,
      ),
    /Learner not found in school roster/i,
  );

  const record = await createPortalRecordAsync(
    {
      module: "assessment",
      date: "2026-03-06",
      district: String(school.district),
      schoolId: school.id,
      schoolName: String(school.name),
      programType: "Baseline",
      status: "Draft",
      payload: {
        classLevel: "P4",
        egraLearnersData: JSON.stringify([
          {
            learnerId: learner.learnerId,
            learnerUid: learner.learnerUid,
            letterIdentification: 8,
            soundIdentification: 9,
          },
        ]),
      },
    },
    actor.id,
  );

  const result = await queryPostgres<{ learnerUid: string }>(
    `
      SELECT asr.learner_uid AS "learnerUid"
      FROM assessment_session_results asr
      JOIN assessment_sessions ass ON ass.id = asr.session_id
      WHERE ass.portal_record_id = $1
      LIMIT 1
    `,
    [record.id],
  );
  assert.equal(result.rows[0]?.learnerUid, learner.learnerUid);
});
