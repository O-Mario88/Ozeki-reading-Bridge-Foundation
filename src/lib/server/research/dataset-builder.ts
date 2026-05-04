import crypto from "node:crypto";
import { queryPostgres } from "@/lib/server/postgres/client";

/**
 * Deterministic hash for opaque IDs. Uses HMAC-SHA256 with a server-side
 * salt so the same school ID always hashes to the same string within a
 * release, but cannot be reversed without the salt.
 */
function hashId(value: string | number | null, salt: string): string {
  if (value === null || value === undefined) return "";
  return crypto
    .createHmac("sha256", salt)
    .update(String(value))
    .digest("hex")
    .slice(0, 16);
}

function termFromDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  // Uganda primary-school terms: 1 = Feb-Apr, 2 = May-Aug, 3 = Sep-Nov.
  const term = m <= 4 ? 1 : m <= 8 ? 2 : 3;
  return `${y}-T${term}`;
}

function monthFromDate(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 7);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines: string[] = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

function getSalt(): string {
  return process.env.RESEARCH_DATASET_SALT?.trim()
    || process.env.SECRET_KEY?.trim()
    || "ozeki-default-salt-change-me";
}

export type DatasetSlug =
  | "assessments-anonymised"
  | "coaching-visits-anonymised"
  | "school-roster-anonymised";

export type BuiltDataset = {
  slug: DatasetSlug;
  rowCount: number;
  csv: string;
  fileName: string;
};

export async function buildDataset(slug: DatasetSlug): Promise<BuiltDataset> {
  const salt = getSalt();
  if (slug === "assessments-anonymised") {
    const result = await queryPostgres<{
      learner_uid: string | null;
      school_id: number | null;
      district: string | null;
      region: string | null;
      assessment_type: string | null;
      assessment_date: string | null;
      reading_stage_label: string | null;
      reading_stage_order: number | null;
      story_reading_score: number | null;
      reading_comprehension_score: number | null;
    }>(
      `SELECT ar.learner_uid, ar.school_id,
              sd.district, sd.region,
              ar.assessment_type, ar.assessment_date::text AS assessment_date,
              ar.reading_stage_label, ar.reading_stage_order,
              ar.story_reading_score, ar.reading_comprehension_score
       FROM assessment_records ar
       LEFT JOIN schools_directory sd ON sd.id = ar.school_id
       WHERE ar.learner_uid IS NOT NULL
       ORDER BY ar.assessment_date ASC`,
    );
    const rows = result.rows.map((r) => ({
      learner_hash: hashId(r.learner_uid, salt),
      school_hash: hashId(r.school_id, salt),
      district: r.district ?? "",
      region: r.region ?? "",
      assessment_type: r.assessment_type ?? "",
      assessment_term: termFromDate(r.assessment_date),
      reading_stage_label: r.reading_stage_label ?? "",
      reading_stage_order: r.reading_stage_order ?? "",
      story_reading_score: r.story_reading_score ?? "",
      reading_comprehension_score: r.reading_comprehension_score ?? "",
    }));
    const headers = [
      "learner_hash", "school_hash", "district", "region",
      "assessment_type", "assessment_term",
      "reading_stage_label", "reading_stage_order",
      "story_reading_score", "reading_comprehension_score",
    ];
    return {
      slug,
      rowCount: rows.length,
      csv: rowsToCsv(headers, rows),
      fileName: `ozeki-${slug}-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  if (slug === "coaching-visits-anonymised") {
    const result = await queryPostgres<{
      id: number;
      school_id: number | null;
      district: string | null;
      region: string | null;
      visit_date: string | null;
      visit_type: string | null;
      implementation_status: string | null;
      visit_pathway: string | null;
    }>(
      `SELECT cv.id, cv.school_id,
              sd.district, sd.region,
              cv.visit_date::text AS visit_date,
              cv.visit_type, cv.implementation_status, cv.visit_pathway
       FROM coaching_visits cv
       LEFT JOIN schools_directory sd ON sd.id = cv.school_id
       ORDER BY cv.visit_date ASC`,
    );
    const rows = result.rows.map((r) => ({
      visit_hash: hashId(r.id, salt),
      school_hash: hashId(r.school_id, salt),
      district: r.district ?? "",
      region: r.region ?? "",
      visit_month: monthFromDate(r.visit_date),
      visit_type: r.visit_type ?? "",
      implementation_status: r.implementation_status ?? "",
      visit_pathway: r.visit_pathway ?? "",
    }));
    const headers = ["visit_hash", "school_hash", "district", "region", "visit_month", "visit_type", "implementation_status", "visit_pathway"];
    return {
      slug,
      rowCount: rows.length,
      csv: rowsToCsv(headers, rows),
      fileName: `ozeki-${slug}-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  // school-roster-anonymised
  const result = await queryPostgres<{
    id: number;
    district: string;
    sub_county: string | null;
    region: string | null;
    enrollment_total: number | null;
    school_active: boolean | null;
  }>(
    `SELECT id, district, sub_county, region, enrollment_total, school_active
     FROM schools_directory ORDER BY district, sub_county, id`,
  );
  const rows = result.rows.map((r) => ({
    school_hash: hashId(r.id, salt),
    district: r.district ?? "",
    sub_county: r.sub_county ?? "",
    region: r.region ?? "",
    enrollment_total: r.enrollment_total ?? 0,
    school_active: r.school_active === false ? "false" : "true",
  }));
  const headers = ["school_hash", "district", "sub_county", "region", "enrollment_total", "school_active"];
  return {
    slug,
    rowCount: rows.length,
    csv: rowsToCsv(headers, rows),
    fileName: `ozeki-${slug}-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}
