import assert from "node:assert/strict";
import test from "node:test";
import {
  addSchoolContactToSchool,
  addSchoolLearnerToSchool,
  createPortalRecord,
  createSchoolDirectoryRecord,
  getDb,
} from "../lib/db";
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
  assert.ok(row, "Expected at least one super admin.");
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
  const actor = getSuperAdminActor();
  const school = await createTestSchool("training");
  const contact = addSchoolContactToSchool({
    schoolId: school.id,
    fullName: "Teacher Training Contact",
    gender: "Female",
    category: "Teacher",
    classTaught: "P3",
    subjectTaught: "Literacy",
    phone: "+256771111111",
  });

  assert.throws(
    () =>
      createPortalRecord(
        {
          module: "training",
          date: "2026-03-06",
          district: school.district,
          schoolId: school.id,
          schoolName: school.name,
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
        actor,
      ),
    /Participant not found in school roster/i,
  );

  const record = createPortalRecord(
    {
      module: "training",
      date: "2026-03-06",
      district: school.district,
      schoolId: school.id,
      schoolName: school.name,
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
    actor,
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
  const actor = getSuperAdminActor();
  const school = await createTestSchool("assessment");
  const learner = addSchoolLearnerToSchool({
    schoolId: school.id,
    learnerName: "Assessment Learner",
    classGrade: "P4",
    age: 10,
    gender: "Girl",
  });

  assert.throws(
    () =>
      createPortalRecord(
        {
          module: "assessment",
          date: "2026-03-06",
          district: school.district,
          schoolId: school.id,
          schoolName: school.name,
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
        actor,
      ),
    /Learner not found in school roster/i,
  );

  const record = createPortalRecord(
    {
      module: "assessment",
      date: "2026-03-06",
      district: school.district,
      schoolId: school.id,
      schoolName: school.name,
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
    actor,
  );

  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT asr.learner_id AS learnerId
        FROM assessment_session_results asr
        JOIN assessment_sessions ass ON ass.id = asr.assessment_session_id
        WHERE ass.portal_record_id = @recordId
        LIMIT 1
      `,
    )
    .get({ recordId: record.id }) as { learnerId: number } | undefined;
  assert.equal(row?.learnerId, learner.learnerId);
});
