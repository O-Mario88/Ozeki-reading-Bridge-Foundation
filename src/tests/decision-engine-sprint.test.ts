import assert from "node:assert/strict";
import test from "node:test";
import {
  addTeacherToSchool,
  createImpactReport,
  createPortalRecord,
  createSupportRequest,
  getDb,
  getPortalUserByEmail,
  getPublicImpactAggregate,
  listAuditLogs,
  listTeachersBySchool,
  updateSupportRequest,
} from "../lib/db";
import { buildDataTrustSnapshot, buildPriorityActionsFromPublicAggregate } from "../lib/decision-engine";
import { RECOMMENDATION_CATALOG } from "../lib/recommendations";
import type { PortalUser } from "../lib/types";

test("trust badge snapshot reflects aggregate last_updated and sample size", () => {
  const payload = getPublicImpactAggregate("country", "Uganda", "FY");
  const trust = buildDataTrustSnapshot(payload);

  assert.equal(trust.lastUpdated, payload.meta.lastUpdated);
  assert.equal(trust.sampleSize, payload.meta.sampleSize);
  assert.equal(trust.completenessLabel, payload.meta.dataCompleteness);
});

test("priority action panel outputs only approved REC catalog IDs", () => {
  const payload = getPublicImpactAggregate("country", "Uganda", "FY");
  const actions = buildPriorityActionsFromPublicAggregate(payload, 3);
  const catalogIds = new Set(RECOMMENDATION_CATALOG.map((item) => item.id));

  actions
    .filter((item) => !item.isFallback)
    .forEach((item) => {
      assert.ok(catalogIds.has(item.id), `Unexpected recommendation id: ${item.id}`);
    });
});

test("impact report generation logs audit event and stores report audit metadata", async () => {
  const defaultStaffEmail =
    process.env.PORTAL_STAFF_EMAIL?.toLowerCase() ?? "staff@ozekireadingbridge.org";
  const user = getPortalUserByEmail(defaultStaffEmail);
  assert.ok(user, "Missing seeded staff user for impact report generation test.");

  const aggregate = getPublicImpactAggregate("country", "Uganda", "FY");
  const schoolName = aggregate.navigator.schools[0]?.name ?? "Not specified";
  const report = await createImpactReport(
    {
      title: `Automated audit trail test ${Date.now()}`,
      reportType: "School Coaching Pack",
      scopeType: "School",
      scopeValue: schoolName,
      periodStart: "2025-02-01",
      periodEnd: "2025-11-30",
      programsIncluded: ["training", "visit", "assessment", "story"],
      isPublic: false,
      version: "v1.0",
    },
    user as PortalUser,
  );

  assert.ok(report.factPack.audit, "Expected fact pack audit metadata.");
  assert.ok(report.factPack.audit?.generatedByName, "Missing generated-by field.");
  assert.ok(report.factPack.audit?.dataTimestamp, "Missing data timestamp field.");
  assert.ok(report.factPack.audit?.scopeLabel?.includes("School"), "Missing scope label field.");
  assert.equal(report.factPack.audit?.reportVersion, "v1.0");

  const logs = listAuditLogs({ targetTable: "impact_reports", limit: 80 });
  assert.ok(
    logs.some(
      (entry) =>
        entry.action === "generate" &&
        String(entry.targetId ?? "") === String(report.id),
    ),
    "Expected an audit log entry for generated impact report.",
  );
});

test("support requests auto-route and can be converted into activity records", () => {
  const db = getDb();
  const schoolWithTeacher = db
    .prepare(
      `
      SELECT sd.id, sd.name, sd.district
      FROM schools_directory sd
      JOIN teacher_roster tr ON tr.school_id = sd.id
      GROUP BY sd.id, sd.name, sd.district
      ORDER BY sd.id ASC
      LIMIT 1
    `,
    )
    .get() as { id: number; name: string; district: string } | undefined;
  const school =
    schoolWithTeacher ??
    (db
      .prepare(
        `
        SELECT id, name, district
        FROM schools_directory
        ORDER BY id ASC
        LIMIT 1
      `,
      )
      .get() as { id: number; name: string; district: string } | undefined);

  assert.ok(school, "Expected at least one school in schools_directory.");

  if (!schoolWithTeacher) {
    addTeacherToSchool({
      schoolId: school.id,
      fullName: `Support Conversion Teacher ${Date.now()}`,
      gender: "Male",
      isReadingTeacher: true,
      phone: "+256700000001",
    });
  }

  const now = Date.now();
  const tempEmail = `routing-test-${now}@example.org`;
  db
    .prepare(
      `
      INSERT INTO portal_users (
        full_name,
        email,
        role,
        password_hash,
        geography_scope
      ) VALUES (
        @fullName,
        @email,
        'Staff',
        @passwordHash,
        @geographyScope
      )
    `,
    )
    .run({
      fullName: `Routing Test Staff ${now}`,
      email: tempEmail,
      passwordHash: `hash-${now}`,
    });

  const created = createSupportRequest(
    {
      schoolId: school!.id,
      contactName: "Routing Test Contact",
      contactRole: "Head Teacher",
      contactInfo: "+256700000000",
      supportTypes: ["coaching visit"],
      urgency: "this_term",
      message: "Need coaching support.",
    },
    { createdByUserId: null },
  );

  assert.ok(created.assignedStaffId, "Expected support request to be assigned.");
  const assignedScopeRow = db
    .prepare(
      `
      SELECT geography_scope AS geographyScope
      FROM portal_users
      WHERE id = @id
      LIMIT 1
    `,
    )
    .get({ id: created.assignedStaffId }) as { geographyScope: string | null } | undefined;
  assert.ok(assignedScopeRow, "Expected assigned user row to exist.");
  assert.ok(
    String(assignedScopeRow?.geographyScope ?? "")
      .toLowerCase()
      .includes(school!.district.toLowerCase()),
    "Expected assigned user geography scope to match request district.",
  );

  const assignedUser = getPortalUserByEmail(tempEmail);
  assert.ok(assignedUser, "Expected to reload inserted staff user.");

  const teachers = listTeachersBySchool(school!.id);
  assert.ok(teachers.length > 0, "Expected teachers in selected school roster.");
  const teacher = teachers[0];

  const randomFutureDate = new Date(
    Date.now() + (Math.floor(Math.random() * 330) + 30) * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  const activity = createPortalRecord(
    {
      module: "visit",
      date: randomFutureDate,
      district: school!.district,
      schoolId: school!.id,
      schoolName: school!.name,
      programType: "Coaching visit",
      status: "Submitted",
      payload: {
        teacherUid: teacher.teacherUid,
        teacherObserved: teacher.fullName,
        visitType: "Coaching visit",
        coachingCycleNumber: 1,
        notes: `Converted from Support Request #${created.id}`,
      },
    },
    assignedUser as PortalUser,
  );

  assert.equal(activity.module, "visit");
  assert.equal(activity.schoolId, school!.id);

  const updated = updateSupportRequest(
    created.id,
    {
      status: "Scheduled",
      followUpStarted: true,
      followUpNotes: `Converted to ${activity.recordCode}`,
    },
    { updatedByUserId: assignedUser!.id },
  );

  assert.equal(updated?.status, "Scheduled");
  assert.equal(updated?.followUpStarted, true);
  assert.ok((updated?.followUpNotes ?? "").includes(activity.recordCode));
});
