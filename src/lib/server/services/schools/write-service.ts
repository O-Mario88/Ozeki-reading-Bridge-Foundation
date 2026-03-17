import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getSchoolDirectoryRecordPostgres } from "@/lib/server/postgres/repositories/schools";
import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
import { assertImportScope, collapseWhitespace, normalizeBooleanString, normalizeOptionalInteger, normalizeOptionalNumber, normalizeText } from "@/lib/server/imports/utils";
import type { PortalUser, SchoolContactCategory, SchoolDirectoryRecord } from "@/lib/types";

export interface SchoolDirectoryWriteInput {
  schoolId?: number | null;
  schoolExternalId?: string | null;
  name?: string | null;
  alternativeSchoolNames?: string | null;
  country?: string | null;
  region?: string | null;
  subRegion?: string | null;
  district?: string | null;
  parish?: string | null;
  emisCode?: string | null;
  schoolLevel?: string | null;
  ownership?: string | null;
  denomination?: string | null;
  schoolPhone?: string | null;
  schoolEmail?: string | null;
  schoolShippingAddress?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  yearFounded?: number | null;
  isActive?: boolean | null;
  subCounty?: string | null;
  village?: string | null;
  notes?: string | null;
  schoolStatus?: string | null;
  schoolStatusDate?: string | null;
  currentPartnerType?: string | null;
  accountRecordType?: string | null;
  schoolType?: string | null;
  parentAccountLabel?: string | null;
  schoolRelationshipStatus?: string | null;
  schoolRelationshipStatusDate?: string | null;
  protestantDenomination?: string | null;
  clientSchoolNumber?: number | null;
  firstMetricDate?: string | null;
  metricCount?: number | null;
  runningTotalMaxEnrollment?: number | null;
  partnerType?: string | null;
  currentPartnerSchool?: boolean | null;
  schoolActive?: boolean | null;
  website?: string | null;
  description?: string | null;
  enrollmentTotal?: number | null;
  enrollmentByGrade?: string | null;
  enrolledBoys?: number | null;
  enrolledGirls?: number | null;
  enrolledBaby?: number | null;
  enrolledMiddle?: number | null;
  enrolledTop?: number | null;
  enrolledP1?: number | null;
  enrolledP2?: number | null;
  enrolledP3?: number | null;
  enrolledP4?: number | null;
  enrolledP5?: number | null;
  enrolledP6?: number | null;
  enrolledP7?: number | null;
  primaryContact?: {
    fullName?: string | null;
    gender?: "Male" | "Female" | "Other" | null;
    phone?: string | null;
    email?: string | null;
    whatsapp?: string | null;
    category?: SchoolContactCategory | null;
    roleTitle?: string | null;
  } | null;
}

interface SchoolWriteRow {
  id: number;
  schoolUid: string | null;
  schoolCode: string;
  schoolExternalId: string | null;
  name: string;
  alternativeSchoolNames: string | null;
  country: string;
  region: string;
  subRegion: string;
  district: string;
  subCounty: string;
  parish: string;
  parishId: number | null;
  emisCode: string | null;
  schoolLevel: string | null;
  ownership: string | null;
  denomination: string | null;
  schoolPhone: string | null;
  schoolEmail: string | null;
  schoolShippingAddress: string | null;
  gpsLat: string | null;
  gpsLng: string | null;
  yearFounded: number | null;
  schoolStatus: string;
  schoolStatusDate: string | null;
  currentPartnerType: string;
  accountRecordType: string;
  schoolType: string;
  parentAccountLabel: string;
  schoolRelationshipStatus: string | null;
  schoolRelationshipStatusDate: string | null;
  protestantDenomination: string | null;
  clientSchoolNumber: number;
  firstMetricDate: string | null;
  metricCount: number;
  runningTotalMaxEnrollment: number;
  partnerType: string | null;
  currentPartnerSchool: boolean;
  schoolActive: boolean;
  website: string | null;
  description: string | null;
  enrollmentTotal: number;
  enrollmentByGrade: string | null;
  enrolledBoys: number;
  enrolledGirls: number;
  enrolledBaby: number;
  enrolledMiddle: number;
  enrolledTop: number;
  enrolledP1: number;
  enrolledP2: number;
  enrolledP3: number;
  enrolledP4: number;
  enrolledP5: number;
  enrolledP6: number;
  enrolledP7: number;
  notes: string | null;
  village: string | null;
  primaryContactId: number | null;
  primaryContactName: string | null;
  primaryContactPhone: string | null;
  primaryContactEmail: string | null;
  primaryContactGender: "Male" | "Female" | "Other" | null;
  primaryContactCategory: SchoolContactCategory | null;
  primaryContactRoleTitle: string | null;
}

interface LocationHierarchy {
  countryId: number;
  countryName: string;
  regionId: number;
  regionName: string;
  subRegionId: number;
  subRegionName: string;
  districtId: number;
  districtName: string;
  parishId: number;
  parishName: string;
}

interface SchoolImportMatch {
  schoolId: number | null;
  action: "CREATE" | "UPDATE";
  matchReason: "external_id" | "name_parish" | "name_district_country" | "create";
}

function createUid(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function formatSchoolCode(id: number) {
  return `S-${String(id).padStart(4, "0")}`;
}

function nullableText(value: string | number | null | undefined) {
  const normalized = collapseWhitespace(String(value ?? ""));
  return normalized || null;
}

function nullableCoordinate(value: string | number | null | undefined) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Coordinates must be valid decimal values.");
  }
  return parsed.toFixed(6);
}

function wholeNumber(value: number | null | undefined, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(parsed));
}

function normalizeContactCategory(value: SchoolContactCategory | string | null | undefined): SchoolContactCategory {
  const normalized = normalizeText(value);
  if (normalized === "proprietor" || normalized === "director") return "Proprietor";
  if (normalized === "head teacher" || normalized === "headteacher") return "Head Teacher";
  if (normalized === "deputy head teacher" || normalized === "deputy") return "Deputy Head Teacher";
  if (normalized === "administrator" || normalized === "admin") return "Administrator";
  if (normalized === "accountant" || normalized === "bursar") return "Accountant";
  if (normalized === "dos") return "DOS";
  return "Teacher";
}

async function loadSchoolWriteRow(client: PoolClient, schoolId: number) {
  const result = await client.query<SchoolWriteRow>(
    `
      SELECT
        s.id,
        s.school_uid AS "schoolUid",
        s.school_code AS "schoolCode",
        s.school_external_id AS "schoolExternalId",
        s.name,
        s.alternate_school_names AS "alternativeSchoolNames",
        s.country,
        s.region,
        s.sub_region AS "subRegion",
        s.district,
        s.sub_county AS "subCounty",
        s.parish,
        s.parish_id AS "parishId",
        s.emis_code AS "emisCode",
        s.school_level AS "schoolLevel",
        s.ownership,
        s.denomination,
        s.contact_phone AS "schoolPhone",
        s.contact_email AS "schoolEmail",
        s.school_shipping_address AS "schoolShippingAddress",
        s.gps_lat AS "gpsLat",
        s.gps_lng AS "gpsLng",
        s.year_founded AS "yearFounded",
        COALESCE(s.school_status, 'Open') AS "schoolStatus",
        s.school_status_date::text AS "schoolStatusDate",
        COALESCE(s.current_partner_type, 'NA') AS "currentPartnerType",
        COALESCE(s.account_record_type, 'School') AS "accountRecordType",
        COALESCE(s.school_type, 'School') AS "schoolType",
        COALESCE(s.parent_account_label, 'Uganda') AS "parentAccountLabel",
        s.school_relationship_status AS "schoolRelationshipStatus",
        s.school_relationship_status_date::text AS "schoolRelationshipStatusDate",
        s.protestant_denomination AS "protestantDenomination",
        COALESCE(s.client_school_number, 0) AS "clientSchoolNumber",
        s.first_metric_date::text AS "firstMetricDate",
        COALESCE(s.metric_count, 0) AS "metricCount",
        COALESCE(s.running_total_max_enrollment, 0) AS "runningTotalMaxEnrollment",
        s.partner_type AS "partnerType",
        COALESCE(s.current_partner_school, FALSE) AS "currentPartnerSchool",
        COALESCE(s.school_active, TRUE) AS "schoolActive",
        s.website,
        s.description,
        COALESCE(s.enrollment_total, 0) AS "enrollmentTotal",
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
        s.notes,
        s.village,
        s.primary_contact_id AS "primaryContactId",
        sc.full_name AS "primaryContactName",
        sc.phone AS "primaryContactPhone",
        sc.email AS "primaryContactEmail",
        sc.gender AS "primaryContactGender",
        sc.category AS "primaryContactCategory",
        sc.role_title AS "primaryContactRoleTitle"
      FROM schools_directory s
      LEFT JOIN school_contacts sc ON sc.contact_id = s.primary_contact_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [schoolId],
  );
  return result.rows[0] ?? null;
}

export async function resolveSchoolLocationHierarchy(client: PoolClient, input: {
  country: string;
  region: string;
  subRegion: string;
  district: string;
  parish: string;
}): Promise<LocationHierarchy> {
  const countryResult = await client.query<{ id: number; name: string }>(
    `SELECT id, name FROM geo_countries WHERE lower(name) = lower($1) LIMIT 2`,
    [input.country],
  );
  if (countryResult.rows.length === 0) {
    throw new Error(`Country not found: ${input.country}.`);
  }
  const country = countryResult.rows[0];

  const regionResult = await client.query<{ id: number; name: string }>(
    `SELECT id, name FROM geo_regions WHERE country_id = $1 AND lower(name) = lower($2) LIMIT 2`,
    [country.id, input.region],
  );
  if (regionResult.rows.length === 0) {
    throw new Error(`Region ${input.region} does not belong to ${country.name}.`);
  }
  const region = regionResult.rows[0];

  let subRegion: { id: number; name: string } | null = null;
  let districtResult: { rows: Array<{ id: number; name: string }> };

  if (input.subRegion.trim()) {
    const subRegionResult = await client.query<{ id: number; name: string }>(
      `SELECT id, name FROM geo_subregions WHERE region_id = $1 AND lower(name) = lower($2) LIMIT 2`,
      [region.id, input.subRegion],
    );
    if (subRegionResult.rows.length === 0) {
      throw new Error(`Sub-region ${input.subRegion} does not belong to ${region.name}.`);
    }
    subRegion = subRegionResult.rows[0];
    districtResult = await client.query<{ id: number; name: string }>(
      `SELECT id, name FROM geo_districts WHERE subregion_id = $1 AND lower(name) = lower($2) LIMIT 2`,
      [subRegion.id, input.district],
    );
  } else {
    const derivedDistrictResult = await client.query<{
      id: number;
      name: string;
      subRegionId: number;
      subRegionName: string;
    }>(
      `
        SELECT
          d.id,
          d.name,
          sr.id AS "subRegionId",
          sr.name AS "subRegionName"
        FROM geo_districts d
        JOIN geo_subregions sr ON sr.id = d.subregion_id
        WHERE sr.region_id = $1
          AND lower(d.name) = lower($2)
        LIMIT 2
      `,
      [region.id, input.district],
    );
    if (derivedDistrictResult.rows.length === 0) {
      throw new Error(`District ${input.district} does not belong to selected region.`);
    }
    subRegion = {
      id: derivedDistrictResult.rows[0].subRegionId,
      name: derivedDistrictResult.rows[0].subRegionName,
    };
    districtResult = {
      rows: derivedDistrictResult.rows.map((row) => ({ id: row.id, name: row.name })),
    };
  }
  if (districtResult.rows.length === 0) {
    throw new Error(`District ${input.district} does not belong to selected sub_region.`);
  }
  const district = districtResult.rows[0];

  const parishResult = await client.query<{ id: number; name: string }>(
    `
      SELECT id, name
      FROM geo_parishes
      WHERE district_id_direct = $1
        AND lower(name) = lower($2)
      LIMIT 2
    `,
    [district.id, input.parish],
  );
  if (parishResult.rows.length === 0) {
    throw new Error(`Parish ${input.parish} does not belong to selected district.`);
  }
  const parish = parishResult.rows[0];

  return {
    countryId: country.id,
    countryName: country.name,
    regionId: region.id,
    regionName: region.name,
    subRegionId: subRegion.id,
    subRegionName: subRegion.name,
    districtId: district.id,
    districtName: district.name,
    parishId: parish.id,
    parishName: parish.name,
  };
}

async function ensureTeacherRoster(client: PoolClient, args: {
  schoolId: number;
  teacherUid?: string | null;
  fullName: string;
  gender: string | null;
  phone: string | null;
  email: string | null;
  roleTitle: string | null;
}) {
  const teacherUid = nullableText(args.teacherUid) ?? createUid("tch");
  const existing = await client.query<{ id: number }>(
    `SELECT id FROM teacher_roster WHERE teacher_uid = $1 LIMIT 1`,
    [teacherUid],
  );
  if (existing.rows[0]?.id) {
    await client.query(
      `
        UPDATE teacher_roster
        SET
          school_id = $2,
          full_name = $3,
          gender = $4,
          phone = $5,
          email = $6,
          role_title = $7,
          updated_at = NOW()
        WHERE teacher_uid = $1
      `,
      [teacherUid, args.schoolId, args.fullName, args.gender, args.phone, args.email, args.roleTitle],
    );
    return teacherUid;
  }

  await client.query(
    `
      INSERT INTO teacher_roster (
        teacher_uid,
        school_id,
        full_name,
        gender,
        phone,
        email,
        role_title,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      )
    `,
    [teacherUid, args.schoolId, args.fullName, args.gender, args.phone, args.email, args.roleTitle],
  );
  return teacherUid;
}

async function upsertPrimaryContact(client: PoolClient, args: {
  schoolId: number;
  currentContactId?: number | null;
  fullName: string;
  gender: "Male" | "Female" | "Other";
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  category: SchoolContactCategory;
  roleTitle: string | null;
}) {
  const teacherUid =
    args.category === "Teacher"
      ? await ensureTeacherRoster(client, {
          schoolId: args.schoolId,
          fullName: args.fullName,
          gender: args.gender,
          phone: args.phone,
          email: args.email,
          roleTitle: args.roleTitle,
        })
      : null;

  if (args.currentContactId) {
    await client.query(
      `
        UPDATE school_contacts
        SET
          school_id = $2,
          full_name = $3,
          gender = $4,
          phone = $5,
          email = $6,
          whatsapp = $7,
          category = $8,
          role_title = $9,
          is_primary_contact = TRUE,
          teacher_uid = $10,
          updated_at = NOW()
        WHERE contact_id = $1
      `,
      [
        args.currentContactId,
        args.schoolId,
        args.fullName,
        args.gender,
        args.phone,
        args.email,
        args.whatsapp,
        args.category,
        args.roleTitle,
        teacherUid,
      ],
    );
    await client.query(
      `UPDATE school_contacts SET is_primary_contact = FALSE, updated_at = NOW() WHERE school_id = $1 AND contact_id != $2`,
      [args.schoolId, args.currentContactId],
    );
    return args.currentContactId;
  }

  const insertResult = await client.query<{ contactId: number }>(
    `
      INSERT INTO school_contacts (
        contact_uid,
        school_id,
        full_name,
        gender,
        phone,
        email,
        whatsapp,
        category,
        role_title,
        is_primary_contact,
        teacher_uid,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, NOW(), NOW()
      )
      RETURNING contact_id AS "contactId"
    `,
    [
      createUid("cnt"),
      args.schoolId,
      args.fullName,
      args.gender,
      args.phone,
      args.email,
      args.whatsapp,
      args.category,
      args.roleTitle,
      teacherUid,
    ],
  );
  const contactId = Number(insertResult.rows[0]?.contactId ?? 0);
  await client.query(
    `UPDATE school_contacts SET is_primary_contact = FALSE, updated_at = NOW() WHERE school_id = $1 AND contact_id != $2`,
    [args.schoolId, contactId],
  );
  return contactId;
}

async function insertAuditLog(client: PoolClient, args: {
  userId: number;
  userName: string;
  action: string;
  targetId: number;
  detail: string;
  payloadAfter: Record<string, unknown>;
}) {
  await client.query(
    `
      INSERT INTO audit_logs (
        user_id,
        user_name,
        action,
        target_table,
        target_id,
        payload_after,
        detail
      ) VALUES (
        $1, $2, $3, 'schools_directory', $4, $5, $6
      )
    `,
    [args.userId, args.userName, args.action, String(args.targetId), JSON.stringify(args.payloadAfter), args.detail],
  );
}

export async function resolveSchoolForImport(client: PoolClient, input: {
  schoolExternalId?: string | null;
  schoolName: string;
  country: string;
  district: string;
  parish: string;
}) : Promise<SchoolImportMatch> {
  const externalId = nullableText(input.schoolExternalId);
  if (externalId) {
    const externalResult = await client.query<{ id: number }>(
      `
        SELECT id
        FROM schools_directory
        WHERE lower(btrim(school_external_id)) = lower(btrim($1))
        LIMIT 2
      `,
      [externalId],
    );
    if (externalResult.rows.length > 1) {
      throw new Error(`Multiple schools matched school_external_id ${externalId}.`);
    }
    if (externalResult.rows[0]?.id) {
      return { schoolId: externalResult.rows[0].id, action: "UPDATE", matchReason: "external_id" };
    }
  }

  const parishResult = await client.query<{ id: number }>(
    `
      SELECT id
      FROM schools_directory
      WHERE lower(btrim(name)) = lower(btrim($1))
        AND lower(btrim(parish)) = lower(btrim($2))
      LIMIT 2
    `,
    [input.schoolName, input.parish],
  );
  if (parishResult.rows.length > 1) {
    throw new Error(`Multiple schools matched ${input.schoolName} in parish ${input.parish}.`);
  }
  if (parishResult.rows[0]?.id) {
    return { schoolId: parishResult.rows[0].id, action: "UPDATE", matchReason: "name_parish" };
  }

  const districtResult = await client.query<{ id: number }>(
    `
      SELECT id
      FROM schools_directory
      WHERE lower(btrim(name)) = lower(btrim($1))
        AND lower(btrim(district)) = lower(btrim($2))
        AND lower(btrim(country)) = lower(btrim($3))
      LIMIT 2
    `,
    [input.schoolName, input.district, input.country],
  );
  if (districtResult.rows.length > 1) {
    throw new Error(`Multiple schools matched ${input.schoolName} in district ${input.district}.`);
  }
  if (districtResult.rows[0]?.id) {
    return { schoolId: districtResult.rows[0].id, action: "UPDATE", matchReason: "name_district_country" };
  }

  return { schoolId: null, action: "CREATE", matchReason: "create" };
}

export async function writeSchoolDirectoryRecord(args: {
  actor: PortalUser;
  input: SchoolDirectoryWriteInput;
}) {
  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      const current = args.input.schoolId ? await loadSchoolWriteRow(client, args.input.schoolId) : null;
      if (args.input.schoolId && !current) {
        throw new Error("School not found.");
      }

      const name = nullableText(args.input.name) ?? current?.name ?? null;
      const country = nullableText(args.input.country) ?? current?.country ?? "Uganda";
      const region = nullableText(args.input.region) ?? current?.region ?? null;
      const subRegion = nullableText(args.input.subRegion) ?? current?.subRegion ?? null;
      const district = nullableText(args.input.district) ?? current?.district ?? null;
      const parish = nullableText(args.input.parish) ?? current?.parish ?? null;

      if (!name) {
        throw new Error("School name is required.");
      }
      if (!country || !region || !district || !parish) {
        throw new Error("Country, region, district, and parish are required.");
      }

      const hierarchy = await resolveSchoolLocationHierarchy(client, {
        country,
        region,
        subRegion: subRegion ?? "",
        district,
        parish,
      });
      assertImportScope(args.actor, {
        country: hierarchy.countryName,
        region: hierarchy.regionName,
        district: hierarchy.districtName,
      });

      const schoolExternalId = nullableText(args.input.schoolExternalId) ?? current?.schoolExternalId ?? null;
      const schoolPhone = nullableText(args.input.schoolPhone) ?? current?.schoolPhone ?? null;
      const schoolEmail = nullableText(args.input.schoolEmail) ?? current?.schoolEmail ?? null;
      const primaryContactName =
        nullableText(args.input.primaryContact?.fullName) ??
        current?.primaryContactName ??
        `${name} School Account`;
      const primaryContactGender = args.input.primaryContact?.gender ?? current?.primaryContactGender ?? "Other";
      const primaryContactPhone = nullableText(args.input.primaryContact?.phone) ?? current?.primaryContactPhone ?? schoolPhone;
      const primaryContactEmail = nullableText(args.input.primaryContact?.email) ?? current?.primaryContactEmail ?? schoolEmail;
      const primaryContactCategory = normalizeContactCategory(
        args.input.primaryContact?.category ?? current?.primaryContactCategory ?? "Administrator",
      );
      const primaryContactRoleTitle =
        nullableText(args.input.primaryContact?.roleTitle) ??
        current?.primaryContactRoleTitle ??
        (primaryContactCategory === "Teacher" ? "Teacher" : "School Account");

      const resolved = {
        schoolUid: current?.schoolUid ?? createUid("sch"),
        schoolExternalId,
        name,
        alternativeSchoolNames: nullableText(args.input.alternativeSchoolNames) ?? current?.alternativeSchoolNames ?? null,
        country: hierarchy.countryName,
        region: hierarchy.regionName,
        subRegion: hierarchy.subRegionName,
        district: hierarchy.districtName,
        subCounty: nullableText(args.input.subCounty) ?? current?.subCounty ?? "Unspecified",
        parish: hierarchy.parishName,
        parishId: hierarchy.parishId,
        emisCode: nullableText(args.input.emisCode) ?? current?.emisCode ?? null,
        schoolLevel: nullableText(args.input.schoolLevel) ?? current?.schoolLevel ?? null,
        ownership: nullableText(args.input.ownership) ?? current?.ownership ?? null,
        denomination: nullableText(args.input.denomination) ?? current?.denomination ?? null,
        schoolPhone,
        schoolEmail,
        schoolShippingAddress: nullableText(args.input.schoolShippingAddress) ?? current?.schoolShippingAddress ?? null,
        gpsLat: nullableCoordinate(args.input.latitude) ?? current?.gpsLat ?? null,
        gpsLng: nullableCoordinate(args.input.longitude) ?? current?.gpsLng ?? null,
        yearFounded:
          args.input.yearFounded === undefined
            ? current?.yearFounded ?? null
            : normalizeOptionalInteger(String(args.input.yearFounded ?? "")),
        schoolStatus: nullableText(args.input.schoolStatus) ?? current?.schoolStatus ?? "Open",
        schoolStatusDate: nullableText(args.input.schoolStatusDate) ?? current?.schoolStatusDate ?? null,
        currentPartnerType: nullableText(args.input.currentPartnerType) ?? current?.currentPartnerType ?? "NA",
        accountRecordType: nullableText(args.input.accountRecordType) ?? current?.accountRecordType ?? "School",
        schoolType: nullableText(args.input.schoolType) ?? current?.schoolType ?? "School",
        parentAccountLabel: nullableText(args.input.parentAccountLabel) ?? current?.parentAccountLabel ?? "Uganda",
        schoolRelationshipStatus:
          nullableText(args.input.schoolRelationshipStatus) ?? current?.schoolRelationshipStatus ?? null,
        schoolRelationshipStatusDate:
          nullableText(args.input.schoolRelationshipStatusDate) ?? current?.schoolRelationshipStatusDate ?? null,
        protestantDenomination:
          nullableText(args.input.protestantDenomination) ?? current?.protestantDenomination ?? null,
        clientSchoolNumber: wholeNumber(args.input.clientSchoolNumber, current?.clientSchoolNumber ?? 0),
        firstMetricDate: nullableText(args.input.firstMetricDate) ?? current?.firstMetricDate ?? null,
        metricCount: wholeNumber(args.input.metricCount, current?.metricCount ?? 0),
        runningTotalMaxEnrollment: wholeNumber(
          args.input.runningTotalMaxEnrollment,
          current?.runningTotalMaxEnrollment ?? 0,
        ),
        partnerType: nullableText(args.input.partnerType) ?? current?.partnerType ?? null,
        currentPartnerSchool:
          args.input.currentPartnerSchool ?? current?.currentPartnerSchool ?? false,
        schoolActive:
          args.input.schoolActive ?? args.input.isActive ?? current?.schoolActive ?? true,
        website: nullableText(args.input.website) ?? current?.website ?? null,
        description: nullableText(args.input.description) ?? current?.description ?? null,
        enrolledBoys: wholeNumber(args.input.enrolledBoys, current?.enrolledBoys ?? 0),
        enrolledGirls: wholeNumber(args.input.enrolledGirls, current?.enrolledGirls ?? 0),
        enrolledBaby: wholeNumber(args.input.enrolledBaby, current?.enrolledBaby ?? 0),
        enrolledMiddle: wholeNumber(args.input.enrolledMiddle, current?.enrolledMiddle ?? 0),
        enrolledTop: wholeNumber(args.input.enrolledTop, current?.enrolledTop ?? 0),
        enrolledP1: wholeNumber(args.input.enrolledP1, current?.enrolledP1 ?? 0),
        enrolledP2: wholeNumber(args.input.enrolledP2, current?.enrolledP2 ?? 0),
        enrolledP3: wholeNumber(args.input.enrolledP3, current?.enrolledP3 ?? 0),
        enrolledP4: wholeNumber(args.input.enrolledP4, current?.enrolledP4 ?? 0),
        enrolledP5: wholeNumber(args.input.enrolledP5, current?.enrolledP5 ?? 0),
        enrolledP6: wholeNumber(args.input.enrolledP6, current?.enrolledP6 ?? 0),
        enrolledP7: wholeNumber(args.input.enrolledP7, current?.enrolledP7 ?? 0),
        notes: nullableText(args.input.notes) ?? current?.notes ?? null,
        village: nullableText(args.input.village) ?? current?.village ?? null,
        enrollmentByGrade: nullableText(args.input.enrollmentByGrade) ?? current?.enrollmentByGrade ?? null,
        primaryContactName,
        primaryContactGender,
        primaryContactPhone,
        primaryContactEmail,
        primaryContactCategory,
        primaryContactRoleTitle,
        primaryContactWhatsapp: nullableText(args.input.primaryContact?.whatsapp),
      };

      const providedEnrollment =
        args.input.enrollmentTotal === undefined || args.input.enrollmentTotal === null
          ? null
          : wholeNumber(args.input.enrollmentTotal, 0);
      const autoEnrollment = resolved.enrolledBoys + resolved.enrolledGirls;
      const directImpact =
        resolved.enrolledBaby +
        resolved.enrolledMiddle +
        resolved.enrolledTop +
        resolved.enrolledP1 +
        resolved.enrolledP2 +
        resolved.enrolledP3;
      const enrollmentTotal = providedEnrollment ?? (autoEnrollment > 0 ? autoEnrollment : directImpact);

      let schoolId = current?.id ?? null;
      let action: "CREATE" | "UPDATE" = current ? "UPDATE" : "CREATE";

      if (schoolExternalId) {
        const externalConflict = await client.query<{ id: number }>(
          `
            SELECT id
            FROM schools_directory
            WHERE lower(btrim(school_external_id)) = lower(btrim($1))
              AND ($2::int IS NULL OR id != $2::int)
            LIMIT 1
          `,
          [schoolExternalId, current?.id ?? null],
        );
        if (externalConflict.rows[0]?.id) {
          throw new Error(`school_external_id ${schoolExternalId} is already assigned to another school.`);
        }
      }

      const duplicateConflict = await client.query<{ id: number }>(
        `
          SELECT id
          FROM schools_directory
          WHERE lower(btrim(name)) = lower(btrim($1))
            AND lower(btrim(parish)) = lower(btrim($2))
            AND lower(btrim(district)) = lower(btrim($3))
            AND ($4::int IS NULL OR id != $4::int)
          LIMIT 1
        `,
        [resolved.name, resolved.parish, resolved.district, current?.id ?? null],
      );
      if (duplicateConflict.rows[0]?.id) {
        throw new Error(`A school named ${resolved.name} already exists in ${resolved.parish}, ${resolved.district}.`);
      }

      if (!schoolId) {
        const insertResult = await client.query<{ id: number }>(
          `
            INSERT INTO schools_directory (
              school_uid,
              school_code,
              school_external_id,
              name,
              alternate_school_names,
              country,
              region,
              sub_region,
              district,
              sub_county,
              parish,
              parish_id,
              emis_code,
              school_level,
              ownership,
              denomination,
              contact_phone,
              contact_email,
              school_shipping_address,
              gps_lat,
              gps_lng,
              year_founded,
              school_status,
              school_status_date,
              current_partner_type,
              account_record_type,
              school_type,
              parent_account_label,
              school_relationship_status,
              school_relationship_status_date,
              protestant_denomination,
              client_school_number,
              first_metric_date,
              metric_count,
              running_total_max_enrollment,
              partner_type,
              current_partner_school,
              school_active,
              website,
              description,
              enrollment_total,
              enrollment_by_grade,
              enrolled_boys,
              enrolled_girls,
              enrolled_baby,
              enrolled_middle,
              enrolled_top,
              enrolled_p1,
              enrolled_p2,
              enrolled_p3,
              enrolled_p4,
              enrolled_p5,
              enrolled_p6,
              enrolled_p7,
              enrolled_learners,
              notes,
              village,
              contact_name,
              created_at
            ) VALUES (
              $1, 'S-PENDING', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21, $22, $23::date, $24, $25, $26, $27, $28, $29::date,
              $30, $31, $32::date, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44,
              $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, NOW()
            ) RETURNING id
          `,
          [
            resolved.schoolUid,
            resolved.schoolExternalId,
            resolved.name,
            resolved.alternativeSchoolNames,
            resolved.country,
            resolved.region,
            resolved.subRegion,
            resolved.district,
            resolved.subCounty,
            resolved.parish,
            resolved.parishId,
            resolved.emisCode,
            resolved.schoolLevel,
            resolved.ownership,
            resolved.denomination,
            resolved.schoolPhone,
            resolved.schoolEmail,
            resolved.schoolShippingAddress,
            resolved.gpsLat,
            resolved.gpsLng,
            resolved.yearFounded,
            resolved.schoolStatus,
            resolved.schoolStatusDate,
            resolved.currentPartnerType,
            resolved.accountRecordType,
            resolved.schoolType,
            resolved.parentAccountLabel,
            resolved.schoolRelationshipStatus,
            resolved.schoolRelationshipStatusDate,
            resolved.protestantDenomination,
            resolved.clientSchoolNumber,
            resolved.firstMetricDate,
            resolved.metricCount,
            resolved.runningTotalMaxEnrollment,
            resolved.partnerType,
            resolved.currentPartnerSchool,
            resolved.schoolActive,
            resolved.website,
            resolved.description,
            enrollmentTotal,
            resolved.enrollmentByGrade,
            resolved.enrolledBoys,
            resolved.enrolledGirls,
            resolved.enrolledBaby,
            resolved.enrolledMiddle,
            resolved.enrolledTop,
            resolved.enrolledP1,
            resolved.enrolledP2,
            resolved.enrolledP3,
            resolved.enrolledP4,
            resolved.enrolledP5,
            resolved.enrolledP6,
            resolved.enrolledP7,
            enrollmentTotal,
            resolved.notes,
            resolved.village,
            resolved.primaryContactName,
          ],
        );
        schoolId = Number(insertResult.rows[0]?.id ?? 0);
        if (!schoolId) {
          throw new Error("Could not create school.");
        }
        await client.query(`UPDATE schools_directory SET school_code = $1 WHERE id = $2`, [formatSchoolCode(schoolId), schoolId]);
      } else {
        await client.query(
          `
            UPDATE schools_directory
            SET
              school_external_id = $2,
              name = $3,
              alternate_school_names = $4,
              country = $5,
              region = $6,
              sub_region = $7,
              district = $8,
              sub_county = $9,
              parish = $10,
              parish_id = $11,
              emis_code = $12,
              school_level = $13,
              ownership = $14,
              denomination = $15,
              contact_phone = $16,
              contact_email = $17,
              school_shipping_address = $18,
              gps_lat = $19,
              gps_lng = $20,
              year_founded = $21,
              school_status = $22,
              school_status_date = $23::date,
              current_partner_type = $24,
              account_record_type = $25,
              school_type = $26,
              parent_account_label = $27,
              school_relationship_status = $28,
              school_relationship_status_date = $29::date,
              protestant_denomination = $30,
              client_school_number = $31,
              first_metric_date = $32::date,
              metric_count = $33,
              running_total_max_enrollment = $34,
              partner_type = $35,
              current_partner_school = $36,
              school_active = $37,
              website = $38,
              description = $39,
              enrollment_total = $40,
              enrollment_by_grade = $41,
              enrolled_boys = $42,
              enrolled_girls = $43,
              enrolled_baby = $44,
              enrolled_middle = $45,
              enrolled_top = $46,
              enrolled_p1 = $47,
              enrolled_p2 = $48,
              enrolled_p3 = $49,
              enrolled_p4 = $50,
              enrolled_p5 = $51,
              enrolled_p6 = $52,
              enrolled_p7 = $53,
              enrolled_learners = $40,
              notes = $54,
              village = $55,
              contact_name = $56,
              updated_at = NOW()
            WHERE id = $1
          `,
          [
            schoolId,
            resolved.schoolExternalId,
            resolved.name,
            resolved.alternativeSchoolNames,
            resolved.country,
            resolved.region,
            resolved.subRegion,
            resolved.district,
            resolved.subCounty,
            resolved.parish,
            resolved.parishId,
            resolved.emisCode,
            resolved.schoolLevel,
            resolved.ownership,
            resolved.denomination,
            resolved.schoolPhone,
            resolved.schoolEmail,
            resolved.schoolShippingAddress,
            resolved.gpsLat,
            resolved.gpsLng,
            resolved.yearFounded,
            resolved.schoolStatus,
            resolved.schoolStatusDate,
            resolved.currentPartnerType,
            resolved.accountRecordType,
            resolved.schoolType,
            resolved.parentAccountLabel,
            resolved.schoolRelationshipStatus,
            resolved.schoolRelationshipStatusDate,
            resolved.protestantDenomination,
            resolved.clientSchoolNumber,
            resolved.firstMetricDate,
            resolved.metricCount,
            resolved.runningTotalMaxEnrollment,
            resolved.partnerType,
            resolved.currentPartnerSchool,
            resolved.schoolActive,
            resolved.website,
            resolved.description,
            enrollmentTotal,
            resolved.enrollmentByGrade,
            resolved.enrolledBoys,
            resolved.enrolledGirls,
            resolved.enrolledBaby,
            resolved.enrolledMiddle,
            resolved.enrolledTop,
            resolved.enrolledP1,
            resolved.enrolledP2,
            resolved.enrolledP3,
            resolved.enrolledP4,
            resolved.enrolledP5,
            resolved.enrolledP6,
            resolved.enrolledP7,
            resolved.notes,
            resolved.village,
            resolved.primaryContactName,
          ],
        );
      }

      const primaryContactId = await upsertPrimaryContact(client, {
        schoolId,
        currentContactId: current?.primaryContactId ?? null,
        fullName: resolved.primaryContactName,
        gender: primaryContactGender,
        phone: resolved.primaryContactPhone,
        email: resolved.primaryContactEmail,
        whatsapp: resolved.primaryContactWhatsapp,
        category: resolved.primaryContactCategory,
        roleTitle: resolved.primaryContactRoleTitle,
      });

      await client.query(
        `
          UPDATE schools_directory
          SET
            primary_contact_id = $2,
            contact_name = $3,
            contact_phone = $4,
            contact_email = $5,
            updated_at = NOW()
          WHERE id = $1
        `,
        [schoolId, primaryContactId, resolved.primaryContactName, resolved.primaryContactPhone, resolved.primaryContactEmail],
      );

      await insertAuditLog(client, {
        userId: args.actor.id,
        userName: args.actor.fullName,
        action: current ? "update" : "create",
        targetId: schoolId,
        detail: current ? `Updated school ${resolved.name}.` : `Created school ${resolved.name}.`,
        payloadAfter: {
          schoolExternalId: resolved.schoolExternalId,
          name: resolved.name,
          district: resolved.district,
          parish: resolved.parish,
          schoolActive: resolved.schoolActive,
        },
      });

      await client.query("COMMIT");
      const school = await getSchoolDirectoryRecordPostgres(schoolId);
      if (!school) {
        throw new Error("Could not load saved school.");
      }
      return {
        action,
        school,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function createOrUpdateSchool(args: {
  actor: PortalUser;
  input: SchoolDirectoryWriteInput;
}) {
  return writeSchoolDirectoryRecord(args);
}

export async function getSchoolImportMatch(input: {
  schoolExternalId?: string | null;
  schoolName: string;
  country: string;
  district: string;
  parish: string;
}) {
  return withPostgresClient(async (client) => resolveSchoolForImport(client, input));
}

export async function loadSchoolImportCandidate(schoolId: number) {
  const result = await queryPostgres<{
    id: number;
    schoolExternalId: string | null;
    name: string;
    district: string;
    parish: string;
    country: string;
    region: string;
    subRegion: string;
    emisCode: string | null;
    schoolLevel: string | null;
    ownership: string | null;
    denomination: string | null;
    schoolPhone: string | null;
    schoolEmail: string | null;
    schoolShippingAddress: string | null;
    gpsLat: string | null;
    gpsLng: string | null;
    yearFounded: number | null;
    schoolActive: boolean;
    alternateSchoolNames: string | null;
  }>(
    `
      SELECT
        id,
        school_external_id AS "schoolExternalId",
        name,
        district,
        parish,
        country,
        region,
        sub_region AS "subRegion",
        emis_code AS "emisCode",
        school_level AS "schoolLevel",
        ownership,
        denomination,
        contact_phone AS "schoolPhone",
        contact_email AS "schoolEmail",
        school_shipping_address AS "schoolShippingAddress",
        gps_lat AS "gpsLat",
        gps_lng AS "gpsLng",
        year_founded AS "yearFounded",
        COALESCE(school_active, TRUE) AS "schoolActive",
        alternate_school_names AS "alternateSchoolNames"
      FROM schools_directory
      WHERE id = $1
      LIMIT 1
    `,
    [schoolId],
  );
  return result.rows[0] ?? null;
}

export async function schoolImportFieldsChanged(schoolId: number, input: SchoolDirectoryWriteInput) {
  const current = await loadSchoolImportCandidate(schoolId);
  if (!current) {
    return true;
  }
  const comparePairs: Array<[unknown, unknown]> = [
    [current.schoolExternalId, nullableText(input.schoolExternalId)],
    [current.name, nullableText(input.name)],
    [current.alternateSchoolNames, nullableText(input.alternativeSchoolNames)],
    [current.country, nullableText(input.country)],
    [current.region, nullableText(input.region)],
    [current.subRegion, nullableText(input.subRegion)],
    [current.district, nullableText(input.district)],
    [current.parish, nullableText(input.parish)],
    [current.emisCode, nullableText(input.emisCode)],
    [current.schoolLevel, nullableText(input.schoolLevel)],
    [current.ownership, nullableText(input.ownership)],
    [current.denomination, nullableText(input.denomination)],
    [current.schoolPhone, nullableText(input.schoolPhone)],
    [current.schoolEmail, nullableText(input.schoolEmail)],
    [current.schoolShippingAddress, nullableText(input.schoolShippingAddress)],
    [current.gpsLat, nullableCoordinate(input.latitude)],
    [current.gpsLng, nullableCoordinate(input.longitude)],
    [current.yearFounded, input.yearFounded ?? null],
    [current.schoolActive, input.schoolActive ?? input.isActive ?? null],
  ];
  return comparePairs.some(([left, right]) => {
    if (right === null || right === undefined || right === "") {
      return false;
    }
    return normalizeText(String(left ?? "")) !== normalizeText(String(right ?? ""));
  });
}
