import assert from "node:assert/strict";
import test from "node:test";
import type { TrainingParticipantTemplateRow } from "../lib/server/imports/constants";
import {
  MISSING_SCHOOL_ERROR,
  addMissingSchoolCandidate,
  createMissingSchoolKey,
  createParticipantDuplicateKey,
} from "../lib/server/imports/training-participants";

function buildRow(overrides: Partial<TrainingParticipantTemplateRow> = {}): TrainingParticipantTemplateRow {
  return {
    participant_external_id: "",
    training_code: "TR-001",
    first_name: "Ruth",
    last_name: "Nakato",
    sex: "Female",
    phone: "+256700000001",
    email: "ruth@example.org",
    role: "Classroom Teacher",
    job_title: "P3 Teacher",
    school_external_id: "SCH-001",
    school_name: "Bright Future Primary",
    country: "Uganda",
    region: "Northern",
    sub_region: "Acholi",
    district: "Gulu",
    parish: "Layibi",
    attendance_status: "Registered",
    attended_from: "",
    attended_to: "",
    certificate_status: "Pending",
    notes: "",
    ...overrides,
  };
}

test("participant duplicate key prefers participant_external_id, then email, then phone", () => {
  assert.equal(
    createParticipantDuplicateKey(buildRow({ participant_external_id: "PART-001" })),
    "participant_external_id:part-001",
  );
  assert.equal(
    createParticipantDuplicateKey(buildRow({ participant_external_id: "", email: "RUTH@EXAMPLE.ORG" })),
    "email:ruth@example.org",
  );
  assert.equal(
    createParticipantDuplicateKey(buildRow({ participant_external_id: "", email: "", phone: "+256 700 000 001" })),
    "phone:+256700000001",
  );
});

test("participant duplicate key falls back to training plus name plus school reference", () => {
  const key = createParticipantDuplicateKey(
    buildRow({ participant_external_id: "", email: "", phone: "", school_external_id: "", school_name: "Riverbank" }),
    33,
  );
  assert.equal(key, "training:33|ruth|nakato|riverbank|gulu|layibi|uganda");
});

test("missing school key prefers school_external_id", () => {
  assert.equal(createMissingSchoolKey(buildRow({ school_external_id: "SCH-900" })), "school_external_id:sch-900");
});

test("missing school candidates deduplicate and collect affected rows", () => {
  const collection = new Map();
  addMissingSchoolCandidate(collection, buildRow({ school_external_id: "SCH-404" }), 4);
  addMissingSchoolCandidate(collection, buildRow({ school_external_id: "SCH-404", school_name: "Alt Name" }), 9);

  assert.equal(collection.size, 1);
  const row = collection.get("school_external_id:sch-404");
  assert.ok(row);
  assert.deepEqual(row?.affected_rows, [4, 9]);
});

test("missing school candidates fall back to school name and location when no external id exists", () => {
  const collection = new Map();
  addMissingSchoolCandidate(collection, buildRow({ school_external_id: "", school_name: "Riverbank School" }), 2);
  addMissingSchoolCandidate(collection, buildRow({ school_external_id: "", school_name: "Riverbank School" }), 7);

  assert.equal(collection.size, 1);
  const key = "riverbank school|gulu|layibi|uganda";
  assert.deepEqual(collection.get(key)?.affected_rows, [2, 7]);
});

test("missing school error constant stays aligned with the preview workflow", () => {
  assert.equal(MISSING_SCHOOL_ERROR, "School not found. Import the school first or provide school_external_id.");
});
