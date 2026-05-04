import { queryPostgres } from "@/lib/server/postgres/client";

export type DistrictAssignmentRow = {
  id: number;
  externalUserId: number;
  district: string;
  region: string | null;
  scope: "view" | "schedule" | "admin";
  assignedAt: string;
  revokedAt: string | null;
};

export type DistrictRosterSchool = {
  id: number;
  schoolCode: string;
  name: string;
  district: string;
  subCounty: string | null;
  region: string | null;
  enrollmentTotal: number | null;
  active: boolean;
};

export type InterventionRow = {
  id: number;
  district: string;
  schoolId: number | null;
  schoolName: string | null;
  interventionType: string;
  scheduledFor: string;
  status: "planned" | "completed" | "cancelled";
  notes: string | null;
  scheduledByExternalId: number | null;
  scheduledByPortalUserId: number | null;
  completedAt: string | null;
  createdAt: string;
};

export type FidelityScoreRow = {
  id: number;
  schoolId: number;
  schoolName: string | null;
  district: string | null;
  periodStart: string;
  periodEnd: string;
  visitsPlanned: number;
  visitsDelivered: number;
  visitsWithGps: number;
  visitsWithPhoto: number;
  trainingsAttended: number;
  fidelityScore: number;
  computedAt: string;
};

export async function listDistrictAssignmentsForUser(
  externalUserId: number,
): Promise<DistrictAssignmentRow[]> {
  const result = await queryPostgres(
    `SELECT id, external_user_id AS "externalUserId", district, region, scope,
            assigned_at AS "assignedAt", revoked_at AS "revokedAt"
     FROM district_officer_assignments
     WHERE external_user_id = $1 AND revoked_at IS NULL
     ORDER BY district`,
    [externalUserId],
  );
  return result.rows as DistrictAssignmentRow[];
}

export async function getDistrictAssignmentByDistrict(
  externalUserId: number,
  district: string,
): Promise<DistrictAssignmentRow | null> {
  const result = await queryPostgres(
    `SELECT id, external_user_id AS "externalUserId", district, region, scope,
            assigned_at AS "assignedAt", revoked_at AS "revokedAt"
     FROM district_officer_assignments
     WHERE external_user_id = $1 AND lower(district) = lower($2) AND revoked_at IS NULL
     LIMIT 1`,
    [externalUserId, district],
  );
  return (result.rows[0] as DistrictAssignmentRow | undefined) ?? null;
}

export async function listSchoolsInDistrict(district: string): Promise<DistrictRosterSchool[]> {
  const result = await queryPostgres(
    `SELECT
       sd.id,
       sd.school_code AS "schoolCode",
       sd.name,
       sd.district,
       sd.sub_county AS "subCounty",
       sd.region,
       sd.enrollment_total AS "enrollmentTotal",
       COALESCE(sd.school_active, TRUE) AS active
     FROM schools_directory sd
     WHERE lower(sd.district) = lower($1)
     ORDER BY lower(sd.name)`,
    [district],
  );
  return result.rows as DistrictRosterSchool[];
}

export async function listInterventionsForDistrict(
  district: string,
  limit = 200,
): Promise<InterventionRow[]> {
  const result = await queryPostgres(
    `SELECT
       i.id, i.district, i.school_id AS "schoolId",
       sd.name AS "schoolName",
       i.intervention_type AS "interventionType",
       i.scheduled_for AS "scheduledFor",
       i.status,
       i.notes,
       i.scheduled_by_external_id AS "scheduledByExternalId",
       i.scheduled_by_portal_user_id AS "scheduledByPortalUserId",
       i.completed_at AS "completedAt",
       i.created_at AS "createdAt"
     FROM district_intervention_schedule i
     LEFT JOIN schools_directory sd ON sd.id = i.school_id
     WHERE lower(i.district) = lower($1)
     ORDER BY i.scheduled_for DESC, i.id DESC
     LIMIT $2`,
    [district, Math.min(Math.max(limit, 1), 500)],
  );
  return result.rows as InterventionRow[];
}

export async function createInterventionForDistrict(input: {
  district: string;
  schoolId: number | null;
  interventionType: string;
  scheduledFor: string;
  scheduledByExternalId: number | null;
  notes?: string | null;
}): Promise<InterventionRow> {
  const result = await queryPostgres(
    `INSERT INTO district_intervention_schedule (
       district, school_id, intervention_type, scheduled_for,
       scheduled_by_external_id, notes
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING
       id, district, school_id AS "schoolId", NULL AS "schoolName",
       intervention_type AS "interventionType",
       scheduled_for AS "scheduledFor", status, notes,
       scheduled_by_external_id AS "scheduledByExternalId",
       scheduled_by_portal_user_id AS "scheduledByPortalUserId",
       completed_at AS "completedAt", created_at AS "createdAt"`,
    [
      input.district,
      input.schoolId,
      input.interventionType,
      input.scheduledFor,
      input.scheduledByExternalId,
      input.notes ?? null,
    ],
  );
  return result.rows[0] as InterventionRow;
}

export async function listFidelityScoresForDistrict(
  district: string,
  limit = 200,
): Promise<FidelityScoreRow[]> {
  const result = await queryPostgres(
    `SELECT
       fs.id, fs.school_id AS "schoolId",
       sd.name AS "schoolName",
       fs.district,
       fs.period_start AS "periodStart",
       fs.period_end AS "periodEnd",
       fs.visits_planned AS "visitsPlanned",
       fs.visits_delivered AS "visitsDelivered",
       fs.visits_with_gps AS "visitsWithGps",
       fs.visits_with_photo AS "visitsWithPhoto",
       fs.trainings_attended AS "trainingsAttended",
       fs.fidelity_score AS "fidelityScore",
       fs.computed_at AS "computedAt"
     FROM school_fidelity_scores fs
     LEFT JOIN schools_directory sd ON sd.id = fs.school_id
     WHERE lower(fs.district) = lower($1)
     ORDER BY fs.period_end DESC, lower(sd.name)
     LIMIT $2`,
    [district, Math.min(Math.max(limit, 1), 500)],
  );
  return result.rows.map((r) => ({
    ...(r as FidelityScoreRow),
    fidelityScore: Number((r as { fidelityScore: string | number }).fidelityScore),
  }));
}
