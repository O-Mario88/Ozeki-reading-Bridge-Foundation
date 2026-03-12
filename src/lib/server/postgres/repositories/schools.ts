import type { SchoolDirectoryRecord } from "@/lib/types";
import { queryPostgres } from "@/lib/server/postgres/client";

export type SchoolDirectoryFilters = {
  district?: string;
  query?: string;
  scopedDistrict?: string;
};

function normalizeSchoolRecord(row: Record<string, unknown>): SchoolDirectoryRecord {
  const id = Number(row.id);
  return {
    id,
    schoolUid: String(row.schoolUid ?? "").trim() || `sch-pg-${id}`,
    schoolCode: String(row.schoolCode ?? ""),
    name: String(row.name ?? ""),
    region: String(row.region ?? ""),
    subRegion: String(row.subRegion ?? ""),
    district: String(row.district ?? ""),
    subCounty: String(row.subCounty ?? ""),
    parish: String(row.parish ?? ""),
    village: row.village ? String(row.village) : null,
    notes: row.notes ? String(row.notes) : null,
    enrollmentTotal: Number(row.enrollmentTotal ?? 0),
    enrollmentByGrade: row.enrollmentByGrade ? String(row.enrollmentByGrade) : null,
    enrolledBoys: Number(row.enrolledBoys ?? 0),
    enrolledGirls: Number(row.enrolledGirls ?? 0),
    enrolledLearners: Number(row.enrolledLearners ?? 0),
    directImpactLearners: Number(row.directImpactLearners ?? 0),
    enrolledBaby: Number(row.enrolledBaby ?? 0),
    enrolledMiddle: Number(row.enrolledMiddle ?? 0),
    enrolledTop: Number(row.enrolledTop ?? 0),
    enrolledP1: Number(row.enrolledP1 ?? 0),
    enrolledP2: Number(row.enrolledP2 ?? 0),
    enrolledP3: Number(row.enrolledP3 ?? 0),
    enrolledP4: Number(row.enrolledP4 ?? 0),
    enrolledP5: Number(row.enrolledP5 ?? 0),
    enrolledP6: Number(row.enrolledP6 ?? 0),
    enrolledP7: Number(row.enrolledP7 ?? 0),
    gpsLat: row.gpsLat ? String(row.gpsLat) : null,
    gpsLng: row.gpsLng ? String(row.gpsLng) : null,
    contactName: row.contactName ? String(row.contactName) : null,
    contactPhone: row.contactPhone ? String(row.contactPhone) : null,
    primaryContactId: row.primaryContactId === null || row.primaryContactId === undefined ? null : Number(row.primaryContactId),
    primaryContactName: row.primaryContactName ? String(row.primaryContactName) : null,
    primaryContactCategory: row.primaryContactCategory ? String(row.primaryContactCategory) as SchoolDirectoryRecord["primaryContactCategory"] : null,
    programStatus: String(row.programStatus ?? "active") as SchoolDirectoryRecord["programStatus"],
    graduatedAt: row.graduatedAt ? String(row.graduatedAt) : null,
    graduatedByUserId: row.graduatedByUserId === null || row.graduatedByUserId === undefined ? null : Number(row.graduatedByUserId),
    graduationNotes: row.graduationNotes ? String(row.graduationNotes) : null,
    graduationVersion: row.graduationVersion ? String(row.graduationVersion) : null,
    createdAt: String(row.createdAt ?? new Date(0).toISOString()),
  };
}

const SCHOOL_SELECT = `
  SELECT
    s.id,
    COALESCE(s.school_uid, '') AS "schoolUid",
    s.school_code AS "schoolCode",
    s.name,
    COALESCE(s.region, '') AS region,
    COALESCE(s.sub_region, '') AS "subRegion",
    s.district,
    s.sub_county AS "subCounty",
    s.parish,
    s.village,
    s.notes,
    CASE
      WHEN COALESCE(s.enrollment_total, 0) > 0 THEN COALESCE(s.enrollment_total, 0)
      WHEN COALESCE(s.enrolled_boys, 0) + COALESCE(s.enrolled_girls, 0) > 0
        THEN COALESCE(s.enrolled_boys, 0) + COALESCE(s.enrolled_girls, 0)
      ELSE COALESCE(s.enrolled_learners, 0)
    END AS "enrollmentTotal",
    s.enrollment_by_grade AS "enrollmentByGrade",
    COALESCE(s.enrolled_boys, 0) AS "enrolledBoys",
    COALESCE(s.enrolled_girls, 0) AS "enrolledGirls",
    COALESCE(s.enrolled_baby, 0) AS "enrolledBaby",
    COALESCE(s.enrolled_middle, 0) AS "enrolledMiddle",
    COALESCE(s.enrolled_top, 0) AS "enrolledTop",
    COALESCE(s.enrolled_p1, 0) AS "enrolledP1",
    COALESCE(s.enrolled_p2, 0) AS "enrolledP2",
    COALESCE(s.enrolled_p3, 0) AS "enrolledP3",
    COALESCE(s.enrolled_p4, 0) AS "enrolledP4",
    COALESCE(s.enrolled_p5, 0) AS "enrolledP5",
    COALESCE(s.enrolled_p6, 0) AS "enrolledP6",
    COALESCE(s.enrolled_p7, 0) AS "enrolledP7",
    CASE
      WHEN COALESCE(s.enrolled_boys, 0) + COALESCE(s.enrolled_girls, 0) > 0
        THEN COALESCE(s.enrolled_boys, 0) + COALESCE(s.enrolled_girls, 0)
      ELSE COALESCE(s.enrolled_learners, 0)
    END AS "enrolledLearners",
    (
      COALESCE(s.enrolled_baby, 0) +
      COALESCE(s.enrolled_middle, 0) +
      COALESCE(s.enrolled_top, 0) +
      COALESCE(s.enrolled_p1, 0) +
      COALESCE(s.enrolled_p2, 0) +
      COALESCE(s.enrolled_p3, 0)
    ) AS "directImpactLearners",
    s.gps_lat AS "gpsLat",
    s.gps_lng AS "gpsLng",
    s.contact_name AS "contactName",
    s.contact_phone AS "contactPhone",
    s.primary_contact_id AS "primaryContactId",
    sc.full_name AS "primaryContactName",
    sc.category AS "primaryContactCategory",
    COALESCE(s.program_status, 'active') AS "programStatus",
    s.graduated_at AS "graduatedAt",
    s.graduated_by_user_id AS "graduatedByUserId",
    s.graduation_notes AS "graduationNotes",
    s.graduation_version AS "graduationVersion",
    s.created_at AS "createdAt"
  FROM schools_directory s
  LEFT JOIN school_contacts sc
    ON sc.contact_id = s.primary_contact_id
`;

export async function listSchoolDirectoryRecordsPostgres(filters: SchoolDirectoryFilters = {}) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.scopedDistrict) {
    params.push(filters.scopedDistrict);
    clauses.push(`lower(s.district) = lower($${params.length})`);
  }

  if (filters.district) {
    params.push(`%${filters.district.trim()}%`);
    clauses.push(`s.district ILIKE $${params.length}`);
  }

  if (filters.query) {
    params.push(`%${filters.query.trim()}%`);
    const placeholder = `$${params.length}`;
    clauses.push(`(s.name ILIKE ${placeholder} OR s.school_code ILIKE ${placeholder})`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `${SCHOOL_SELECT}
     ${whereClause}
     ORDER BY s.created_at DESC
     LIMIT 500`,
    params,
  );
  return result.rows.map((row) => normalizeSchoolRecord(row));
}

export async function getSchoolDirectoryRecordPostgres(id: number) {
  const result = await queryPostgres(
    `${SCHOOL_SELECT}
     WHERE s.id = $1
     LIMIT 1`,
    [id],
  );
  const row = result.rows[0];
  return row ? normalizeSchoolRecord(row) : null;
}
