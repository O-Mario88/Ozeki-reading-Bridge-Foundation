import assert from "node:assert/strict";
import test from "node:test";
import { getPublicImpactAggregate } from "../lib/db";
import { toPublicImpactResponse } from "../app/api/impact/helpers";

const RESTRICTED_KEYS = new Set([
  "child_name",
  "child_id",
  "internal_child_id",
  "full_name",
  "age",
  "learner_uid",
  "teacher_uid",
]);

function normalizedKey(key: string) {
  return key.trim().toLowerCase();
}

function findRestrictedKeyPaths(
  value: unknown,
  path = "$",
  findings: string[] = [],
): string[] {
  if (!value || typeof value !== "object") {
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      findRestrictedKeyPaths(entry, `${path}[${index}]`, findings);
    });
    return findings;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
    if (RESTRICTED_KEYS.has(normalizedKey(key))) {
      findings.push(`${path}.${key}`);
    }
    findRestrictedKeyPaths(nested, `${path}.${key}`, findings);
  });
  return findings;
}

test("public impact payloads do not expose restricted keys", () => {
  const country = getPublicImpactAggregate("country", "Uganda", "FY");
  const subRegionId = country.navigator.subRegions[0] ?? "Central";
  const districtId = country.navigator.districts[0] ?? "Kampala";
  const schoolId = String(country.navigator.schools[0]?.id ?? "unknown-school");

  const payloads = [
    country,
    getPublicImpactAggregate("subregion", subRegionId, "TERM"),
    getPublicImpactAggregate("district", districtId, "QTR"),
    getPublicImpactAggregate("school", schoolId, "FY"),
  ];

  payloads.forEach((payload) => {
    const rawFindings = findRestrictedKeyPaths(payload);
    assert.equal(
      rawFindings.length,
      0,
      `Restricted keys found in aggregate payload: ${rawFindings.join(", ")}`,
    );

    const responseFindings = findRestrictedKeyPaths(toPublicImpactResponse(payload));
    assert.equal(
      responseFindings.length,
      0,
      `Restricted keys found in public response payload: ${responseFindings.join(", ")}`,
    );
  });
});

test("public impact response includes aggregate KPI contract aliases", () => {
  const payload = getPublicImpactAggregate("country", "Uganda", "FY");
  const response = toPublicImpactResponse(payload) as Record<string, unknown>;
  const kpis = response.kpis as Record<string, unknown>;

  assert.ok(kpis, "Missing kpis block in public response");
  assert.ok(kpis.schools_supported !== undefined, "Missing schools_supported");
  assert.ok(kpis.teachers_supported_male !== undefined, "Missing teachers_supported_male");
  assert.ok(kpis.teachers_supported_female !== undefined, "Missing teachers_supported_female");
  assert.ok(kpis.enrollment_total !== undefined, "Missing enrollment_total");
  assert.ok(kpis.learners_assessed_unique !== undefined, "Missing learners_assessed_unique");
  assert.ok(kpis.visits_total !== undefined, "Missing visits_total");
  assert.ok(kpis.assessments_baseline_count !== undefined, "Missing assessments_baseline_count");
  assert.ok(kpis.assessments_progress_count !== undefined, "Missing assessments_progress_count");
  assert.ok(kpis.assessments_endline_count !== undefined, "Missing assessments_endline_count");
});
