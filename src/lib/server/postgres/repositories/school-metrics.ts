import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";

export interface SchoolEnrollmentRecord {
  id: string;
  schoolId: number;
  boysCount: number;
  girlsCount: number;
  totalEnrollment: number;
  updatedFrom: string;
  academicTerm: string | null;
  recordedAt: string;
  recordedById: number | null;
}

export interface SchoolLiteracyImpactRecord {
  id: string;
  schoolId: number;
  babyClassImpacted: number;
  middleClassImpacted: number;
  topClassImpacted: number;
  p1Impacted: number;
  p2Impacted: number;
  p3Impacted: number;
  totalImpacted: number;
  recordedAt: string;
  recordedById: number | null;
}

export type CreateEnrollmentInput = Omit<SchoolEnrollmentRecord, "id" | "recordedAt">;
export type CreateLiteracyImpactInput = Omit<SchoolLiteracyImpactRecord, "id" | "recordedAt">;

function normalizeEnrollment(row: Record<string, unknown>): SchoolEnrollmentRecord {
  return {
    id: String(row.id),
    schoolId: Number(row.school_id),
    boysCount: Number(row.boys_count),
    girlsCount: Number(row.girls_count),
    totalEnrollment: Number(row.total_enrollment),
    updatedFrom: String(row.updated_from),
    academicTerm: row.academic_term ? String(row.academic_term) : null,
    recordedAt: String(row.recorded_at),
    recordedById: row.recorded_by_id ? Number(row.recorded_by_id) : null,
  };
}

function normalizeLiteracyImpact(row: Record<string, unknown>): SchoolLiteracyImpactRecord {
  return {
    id: String(row.id),
    schoolId: Number(row.school_id),
    babyClassImpacted: Number(row.baby_class_impacted),
    middleClassImpacted: Number(row.middle_class_impacted),
    topClassImpacted: Number(row.top_class_impacted),
    p1Impacted: Number(row.p1_impacted),
    p2Impacted: Number(row.p2_impacted),
    p3Impacted: Number(row.p3_impacted),
    totalImpacted: Number(row.total_impacted),
    recordedAt: String(row.recorded_at),
    recordedById: row.recorded_by_id ? Number(row.recorded_by_id) : null,
  };
}

export async function createSchoolEnrollment(input: CreateEnrollmentInput): Promise<SchoolEnrollmentRecord> {
  return withPostgresClient(async (client) => {
    // 1. Insert the new chronological record
    const result = await client.query(
      `
        INSERT INTO school_enrollments (
          school_id, 
          boys_count, 
          girls_count, 
          total_enrollment, 
          updated_from, 
          academic_term, 
          recorded_by_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        input.schoolId,
        input.boysCount,
        input.girlsCount,
        input.totalEnrollment,
        input.updatedFrom,
        input.academicTerm,
        input.recordedById,
      ]
    );

    // 2. Sync the latest values into the aggregated schools_directory card
    await client.query(
      `
        UPDATE schools_directory
        SET 
          enrolled_boys = $2,
          enrolled_girls = $3,
          enrollment_total = $4
        WHERE id = $1
      `,
      [
        input.schoolId,
        input.boysCount,
        input.girlsCount,
        input.totalEnrollment,
      ]
    );

    return normalizeEnrollment(result.rows[0]);
  });
}

export async function getSchoolEnrollments(schoolId: number): Promise<SchoolEnrollmentRecord[]> {
  const result = await queryPostgres(
    `
      SELECT * FROM school_enrollments
      WHERE school_id = $1
      ORDER BY recorded_at DESC
    `,
    [schoolId]
  );
  return result.rows.map(normalizeEnrollment);
}

export async function createSchoolLiteracyImpact(input: CreateLiteracyImpactInput): Promise<SchoolLiteracyImpactRecord> {
  return withPostgresClient(async (client) => {
    // 1. Insert the new chronological record
    const result = await client.query(
      `
        INSERT INTO school_literacy_impacts (
          school_id,
          baby_class_impacted,
          middle_class_impacted,
          top_class_impacted,
          p1_impacted,
          p2_impacted,
          p3_impacted,
          total_impacted,
          recorded_by_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        input.schoolId,
        input.babyClassImpacted,
        input.middleClassImpacted,
        input.topClassImpacted,
        input.p1Impacted,
        input.p2Impacted,
        input.p3Impacted,
        input.totalImpacted,
        input.recordedById,
      ]
    );

    // 2. Sync the latest values into the aggregated schools_directory card
    await client.query(
      `
        UPDATE schools_directory
        SET 
          enrolled_baby = $2,
          enrolled_middle = $3,
          enrolled_top = $4,
          enrolled_p1 = $5,
          enrolled_p2 = $6,
          enrolled_p3 = $7
        WHERE id = $1
      `,
      [
        input.schoolId,
        input.babyClassImpacted,
        input.middleClassImpacted,
        input.topClassImpacted,
        input.p1Impacted,
        input.p2Impacted,
        input.p3Impacted,
      ]
    );

    return normalizeLiteracyImpact(result.rows[0]);
  });
}

export async function getSchoolLiteracyImpacts(schoolId: number): Promise<SchoolLiteracyImpactRecord[]> {
  const result = await queryPostgres(
    `
      SELECT * FROM school_literacy_impacts
      WHERE school_id = $1
      ORDER BY recorded_at DESC
    `,
    [schoolId]
  );
  return result.rows.map(normalizeLiteracyImpact);
}
