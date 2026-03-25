import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import {
  SCHOOL_IMPORT_HEADERS,
  TRAINING_PARTICIPANT_IMPORT_HEADERS,
  type MissingSchoolCandidate,
} from "../lib/server/imports/constants";
import {
  buildSchoolsCsvTemplate,
  buildTrainingParticipantsCsvTemplate,
  generateMissingSchoolsTemplate,
  mapMissingSchoolsToTemplateRows,
} from "../lib/server/imports/templates";
import { canonicalizeHeader, normalizeHeaderCells } from "../lib/server/imports/utils";

test("schools CSV template uses the official header order", () => {
  const csv = buildSchoolsCsvTemplate();
  assert.equal(csv.trim(), SCHOOL_IMPORT_HEADERS.join(","));
});

test("training participants CSV template uses the official header order", () => {
  const csv = buildTrainingParticipantsCsvTemplate();
  assert.equal(csv.trim(), TRAINING_PARTICIPANT_IMPORT_HEADERS.join(","));
});

test("missing schools template mapping fills official defaults", () => {
  const missingSchools: MissingSchoolCandidate[] = [
    {
      school_external_id: "SCH-001",
      school_name: "Bright Future Primary",
      country: "Uganda",
      region: "Northern",
      sub_region: "Acholi",
      district: "Gulu",
      parish: "Layibi",
      affected_rows: [4, 10],
    },
  ];

  const rows = mapMissingSchoolsToTemplateRows(missingSchools);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.school_name, "Bright Future Primary");
  assert.equal(rows[0]?.country, "Uganda");
  assert.equal(rows[0]?.district, "Gulu");
});

test("missing schools template XLSX is directly uploadable with the official sheets", async () => {
  const missingSchools: MissingSchoolCandidate[] = [
    {
      school_external_id: "",
      school_name: "New Hope School",
      country: "Uganda",
      region: "Central",
      sub_region: "Busoga",
      district: "Jinja",
      parish: "Budondo",
      affected_rows: [8],
    },
  ];

  const workbookBody = await generateMissingSchoolsTemplate({
    format: "xlsx",
    missingSchools,
  });
  assert.equal(typeof workbookBody, "object");
  const workbook = XLSX.read(Buffer.from(workbookBody as Buffer), { type: "buffer" });
  assert.deepEqual(workbook.SheetNames, ["Instructions", "Schools_Template", "Examples"]);

  const templateRows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets.Schools_Template, {
    header: 1,
    defval: "",
    raw: false,
  });
  const rawHeader = templateRows[0] ?? [];
  const header = rawHeader.filter((h: string) => h !== "");
  assert.deepEqual(header, [...SCHOOL_IMPORT_HEADERS]);
  assert.equal(templateRows[1]?.[0], "New Hope School");
});

test("missing schools template CSV includes only official headers and missing rows", async () => {
  const missingSchools: MissingSchoolCandidate[] = [
    {
      school_external_id: "SCH-404",
      school_name: "Riverbank School",
      country: "Uganda",
      region: "Western",
      sub_region: "Ankole",
      district: "Mbarara",
      parish: "Kakoba",
      affected_rows: [2, 3],
    },
  ];

  const csv = await generateMissingSchoolsTemplate({
    format: "csv",
    missingSchools,
  });
  const lines = String(csv).trim().split(/\r?\n/);
  assert.equal(lines[0], SCHOOL_IMPORT_HEADERS.join(","));
  assert.equal(lines.length, 2);
  assert.match(lines[1] ?? "", /Riverbank School/);
});

// ── Header canonicalization tests ─────────────────────────────────────

test("canonicalizeHeader normalizes common variations to snake_case", () => {
  assert.equal(canonicalizeHeader("school_name"), "school_name");
  assert.equal(canonicalizeHeader("School Name"), "school_name");
  assert.equal(canonicalizeHeader("SCHOOL_NAME"), "school_name");
  assert.equal(canonicalizeHeader("school-name"), "school_name");
  assert.equal(canonicalizeHeader("  School  Name  "), "school_name");
  assert.equal(canonicalizeHeader("Head Teacher Phone"), "head_teacher_phone");
});

test("normalizeHeaderCells resolves UPPERCASE headers to official template columns", () => {
  const uppercaseHeaders = SCHOOL_IMPORT_HEADERS.map((h) => h.toUpperCase());
  const normalized = normalizeHeaderCells(uppercaseHeaders);
  assert.deepEqual(normalized, [...SCHOOL_IMPORT_HEADERS]);
});

test("normalizeHeaderCells resolves space-separated Title Case headers", () => {
  const spacedHeaders = SCHOOL_IMPORT_HEADERS.map((h) =>
    h.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
  );
  const normalized = normalizeHeaderCells(spacedHeaders);
  assert.deepEqual(normalized, [...SCHOOL_IMPORT_HEADERS]);
});

test("normalizeHeaderCells resolves mixed-case training participant headers", () => {
  const variants = TRAINING_PARTICIPANT_IMPORT_HEADERS.map((h) =>
    h.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
  );
  const normalized = normalizeHeaderCells(variants);
  assert.deepEqual(normalized, [...TRAINING_PARTICIPANT_IMPORT_HEADERS]);
});
