import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { assertImportScope, collapseWhitespace, normalizeOptionalDate, normalizePhone, normalizeText } from "@/lib/server/imports/utils";
import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
import type { PortalUser, SchoolContactCategory } from "@/lib/types";

type ParticipantPayloadRole = "Teacher" | "Leader";
type AttendanceRole = "Classroom teacher" | "School Leader";
type AttendanceStatus = "Registered" | "Invited" | "Confirmed" | "Attended" | "Absent" | "Excused";
type CertificateStatus = "Pending" | "Issued" | "Not Required" | "Rejected";

type ResolvedTrainingRecord = {
  id: number;
  recordCode: string;
  schoolId: number | null;
  schoolName: string | null;
  district: string | null;
  payloadJson: string;
};

type ResolvedSchoolLink = {
  id: number;
  schoolCode: string;
  schoolExternalId: string | null;
  name: string;
  country: string;
  region: string;
  subRegion: string;
  district: string;
  parish: string;
};

type ResolvedParticipantContact = {
  contactId: number;
  contactUid: string;
  schoolId: number;
  fullName: string;
  gender: "Male" | "Female" | "Other";
  phone: string | null;
  email: string | null;
  category: SchoolContactCategory;
  roleTitle: string | null;
  teacherUid: string | null;
  participantExternalId: string | null;
};

type ExistingTrainingRegistration = {
  id: number;
  contactId: number;
  schoolId: number | null;
  participantRole: string;
  roleAtTime: string | null;
  attendanceStatus: string | null;
  attendedFrom: string | null;
  attendedTo: string | null;
  certificateStatus: string | null;
  notes: string | null;
  participantType: string | null;
  invited: boolean;
  confirmed: boolean;
  attended: boolean;
};

type PreparedTrainingParticipantWrite = {
  training: ResolvedTrainingRecord;
  school: ResolvedSchoolLink;
  contact: ResolvedParticipantContact | null;
  existingRegistration: ExistingTrainingRegistration | null;
  action: "CREATE" | "UPDATE" | "SKIP";
  contactMatchReason: "participant_external_id" | "email" | "phone" | "name_school" | "none";
  normalizedData: TrainingParticipantNormalizedData;
  warningMessage: string | null;
};

export interface TrainingParticipantWriteInput {
  trainingRecordId?: number | null;
  trainingCode?: string | null;
  participantExternalId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  sex?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  jobTitle?: string | null;
  schoolId?: number | null;
  schoolExternalId?: string | null;
  schoolName?: string | null;
  country?: string | null;
  region?: string | null;
  subRegion?: string | null;
  district?: string | null;
  parish?: string | null;
  attendanceStatus?: string | null;
  attendedFrom?: string | null;
  attendedTo?: string | null;
  certificateStatus?: string | null;
  notes?: string | null;
}

export interface TrainingParticipantNormalizedData {
  trainingRecordId: number;
  trainingCode: string;
  participantExternalId: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  sex: "Male" | "Female" | "Other";
  phone: string | null;
  email: string | null;
  role: string;
  jobTitle: string | null;
  schoolId: number;
  schoolExternalId: string | null;
  schoolName: string;
  country: string;
  region: string;
  subRegion: string;
  district: string;
  parish: string;
  attendanceStatus: AttendanceStatus;
  attendedFrom: string | null;
  attendedTo: string | null;
  certificateStatus: CertificateStatus;
  notes: string | null;
}

interface TrainingParticipantWriteResult {
  action: "CREATE" | "UPDATE" | "SKIP";
  trainingRecordId: number;
  trainingCode: string;
  contactId: number;
  schoolId: number;
  warningMessage: string | null;
  normalizedData: TrainingParticipantNormalizedData;
}

type ParticipantPayloadRow = {
  contactId: number;
  contactUid: string;
  participantName: string;
  participantExternalId: string | null;
  schoolAccountId: number;
  schoolAttachedTo: string;
  schoolAccountCode: string | null;
  schoolExternalId: string | null;
  role: ParticipantPayloadRole;
  gender: "Male" | "Female" | "Other";
  phoneContact: string;
  email: string;
  participantType: "In Person" | "Online" | "Hybrid";
  invited: boolean;
  confirmed: boolean;
  attended: boolean;
  attendanceStatus: AttendanceStatus;
  attendedFrom: string | null;
  attendedTo: string | null;
  certificateStatus: CertificateStatus;
  notes: string | null;
};

function createUid(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function nullableText(value: unknown) {
  const normalized = collapseWhitespace(String(value ?? ""));
  return normalized || null;
}

function requiredText(value: unknown, label: string) {
  const normalized = nullableText(value);
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

function safeJsonObject(value: string | null | undefined) {
  if (!value) {
    return {} as Record<string, unknown>;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function asRecordArray(value: unknown) {
  let source = value;
  if (typeof source === "string" && source.trim()) {
    try {
      source = JSON.parse(source);
    } catch {
      return [] as Array<Record<string, unknown>>;
    }
  }
  if (!Array.isArray(source)) {
    return [] as Array<Record<string, unknown>>;
  }
  return source.filter((entry) => entry && typeof entry === "object") as Array<Record<string, unknown>>;
}

function normalizeSex(value: unknown): "Male" | "Female" | "Other" {
  const normalized = normalizeText(String(value ?? ""));
  if (normalized === "male" || normalized === "m") {
    return "Male";
  }
  if (normalized === "female" || normalized === "f") {
    return "Female";
  }
  return "Other";
}

function normalizeAttendanceStatus(value: unknown): AttendanceStatus {
  const normalized = normalizeText(String(value ?? ""));
  if (["attended", "present", "completed"].includes(normalized)) {
    return "Attended";
  }
  if (["absent", "no show", "noshow"].includes(normalized)) {
    return "Absent";
  }
  if (["excused", "excused absence"].includes(normalized)) {
    return "Excused";
  }
  if (["confirmed", "registered_confirmed"].includes(normalized)) {
    return "Confirmed";
  }
  if (["invited", "invite", "invitation sent"].includes(normalized)) {
    return "Invited";
  }
  return "Registered";
}

function normalizeCertificateStatus(value: unknown): CertificateStatus {
  const normalized = normalizeText(String(value ?? ""));
  if (["issued", "certified", "completed", "yes"].includes(normalized)) {
    return "Issued";
  }
  if (["not required", "not_required", "n/a", "na", "none"].includes(normalized)) {
    return "Not Required";
  }
  if (["rejected", "revoked", "failed"].includes(normalized)) {
    return "Rejected";
  }
  return "Pending";
}

function normalizeParticipantType(value: unknown): "In Person" | "Online" | "Hybrid" {
  const normalized = normalizeText(String(value ?? ""));
  if (normalized === "online" || normalized === "virtual") {
    return "Online";
  }
  if (normalized === "hybrid") {
    return "Hybrid";
  }
  return "In Person";
}

function normalizeRoleMetadata(value: unknown, jobTitle: unknown) {
  const roleText = collapseWhitespace(String(value ?? ""));
  const jobTitleText = nullableText(jobTitle);
  const combined = `${roleText} ${jobTitleText ?? ""}`.trim().toLowerCase();

  if (combined.includes("deputy")) {
    return {
      payloadRole: "Leader" as ParticipantPayloadRole,
      attendanceRole: "School Leader" as AttendanceRole,
      contactCategory: "Deputy Head Teacher" as SchoolContactCategory,
      roleTitle: jobTitleText ?? "Deputy Head Teacher",
    };
  }
  if (combined.includes("head teacher") || combined.includes("headteacher")) {
    return {
      payloadRole: "Leader" as ParticipantPayloadRole,
      attendanceRole: "School Leader" as AttendanceRole,
      contactCategory: "Head Teacher" as SchoolContactCategory,
      roleTitle: jobTitleText ?? "Head Teacher",
    };
  }
  if (combined.includes("proprietor") || combined.includes("director")) {
    return {
      payloadRole: "Leader" as ParticipantPayloadRole,
      attendanceRole: "School Leader" as AttendanceRole,
      contactCategory: "Proprietor" as SchoolContactCategory,
      roleTitle: jobTitleText ?? "Proprietor",
    };
  }
  if (combined.includes("dos")) {
    return {
      payloadRole: "Leader" as ParticipantPayloadRole,
      attendanceRole: "School Leader" as AttendanceRole,
      contactCategory: "DOS" as SchoolContactCategory,
      roleTitle: jobTitleText ?? "DOS",
    };
  }
  if (combined.includes("accountant") || combined.includes("bursar")) {
    return {
      payloadRole: "Leader" as ParticipantPayloadRole,
      attendanceRole: "School Leader" as AttendanceRole,
      contactCategory: "Accountant" as SchoolContactCategory,
      roleTitle: jobTitleText ?? "Accountant",
    };
  }
  if (
    combined.includes("school leader") ||
    combined.includes("leader") ||
    combined.includes("administrator") ||
    combined.includes("admin")
  ) {
    return {
      payloadRole: "Leader" as ParticipantPayloadRole,
      attendanceRole: "School Leader" as AttendanceRole,
      contactCategory: "Administrator" as SchoolContactCategory,
      roleTitle: jobTitleText ?? "School Leader",
    };
  }
  return {
    payloadRole: "Teacher" as ParticipantPayloadRole,
    attendanceRole: "Classroom teacher" as AttendanceRole,
    contactCategory: "Teacher" as SchoolContactCategory,
    roleTitle: jobTitleText ?? (roleText || "Teacher"),
  };
}

function deriveAttendanceFlags(status: AttendanceStatus) {
  if (status === "Attended") {
    return { invited: true, confirmed: true, attended: true };
  }
  if (status === "Confirmed" || status === "Absent" || status === "Excused") {
    return { invited: true, confirmed: true, attended: false };
  }
  if (status === "Invited") {
    return { invited: true, confirmed: false, attended: false };
  }
  return { invited: true, confirmed: false, attended: false };
}

function compareNullable(left: unknown, right: unknown) {
  return normalizeText(String(left ?? "")) === normalizeText(String(right ?? ""));
}

async function loadTrainingRecord(
  client: PoolClient,
  input: Pick<TrainingParticipantWriteInput, "trainingRecordId" | "trainingCode">,
): Promise<ResolvedTrainingRecord> {
  if (input.trainingRecordId && Number.isInteger(input.trainingRecordId) && input.trainingRecordId > 0) {
    const result = await client.query<ResolvedTrainingRecord>(
      `
        SELECT
          id,
          record_code AS "recordCode",
          school_id AS "schoolId",
          school_name AS "schoolName",
          district,
          COALESCE(payload_json, '{}') AS "payloadJson"
        FROM portal_records
        WHERE id = $1
          AND module = 'training'
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [input.trainingRecordId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("Training not found.");
    }
    return row;
  }

  const trainingCode = requiredText(input.trainingCode, "Training code");
  const result = await client.query<ResolvedTrainingRecord>(
    `
      SELECT
        id,
        record_code AS "recordCode",
        school_id AS "schoolId",
        school_name AS "schoolName",
        district,
        COALESCE(payload_json, '{}') AS "payloadJson"
      FROM portal_records
      WHERE module = 'training'
        AND lower(btrim(record_code)) = lower(btrim($1))
        AND deleted_at IS NULL
      LIMIT 2
    `,
    [trainingCode],
  );

  if (result.rows.length === 0) {
    throw new Error(`Training code not found: ${trainingCode}.`);
  }
  if (result.rows.length > 1) {
    throw new Error(`Training code ${trainingCode} matched multiple records.`);
  }
  return result.rows[0];
}

async function loadSchoolById(client: PoolClient, schoolId: number): Promise<ResolvedSchoolLink | null> {
  const result = await client.query<ResolvedSchoolLink>(
    `
      SELECT
        id,
        school_code AS "schoolCode",
        school_external_id AS "schoolExternalId",
        name,
        COALESCE(country, 'Uganda') AS country,
        COALESCE(region, '') AS region,
        COALESCE(sub_region, '') AS "subRegion",
        COALESCE(district, '') AS district,
        COALESCE(parish, '') AS parish
      FROM schools_directory
      WHERE id = $1
      LIMIT 1
    `,
    [schoolId],
  );
  return result.rows[0] ?? null;
}

export async function resolveSchoolForTrainingParticipant(
  client: PoolClient,
  input: Pick<
    TrainingParticipantWriteInput,
    "schoolId" | "schoolExternalId" | "schoolName" | "country" | "region" | "subRegion" | "district" | "parish"
  >,
): Promise<ResolvedSchoolLink> {
  if (input.schoolId && Number.isInteger(input.schoolId) && input.schoolId > 0) {
    const school = await loadSchoolById(client, input.schoolId);
    if (!school) {
      throw new Error("Selected school was not found.");
    }
    return school;
  }

  const schoolExternalId = nullableText(input.schoolExternalId);
  if (schoolExternalId) {
    const result = await client.query<ResolvedSchoolLink>(
      `
        SELECT
          id,
          school_code AS "schoolCode",
          school_external_id AS "schoolExternalId",
          name,
          COALESCE(country, 'Uganda') AS country,
          COALESCE(region, '') AS region,
          COALESCE(sub_region, '') AS "subRegion",
          COALESCE(district, '') AS district,
          COALESCE(parish, '') AS parish
        FROM schools_directory
        WHERE lower(btrim(school_external_id)) = lower(btrim($1))
        LIMIT 2
      `,
      [schoolExternalId],
    );
    if (result.rows.length === 0) {
      throw new Error(`School not found. Import the school first or provide a valid school_external_id.`);
    }
    if (result.rows.length > 1) {
      throw new Error(`Multiple schools matched school_external_id ${schoolExternalId}.`);
    }
    return result.rows[0];
  }

  const schoolName = requiredText(input.schoolName, "School name");
  const params: unknown[] = [schoolName];
  const clauses = [`lower(btrim(name)) = lower(btrim($1))`];

  const optionalFilters: Array<[unknown, string]> = [
    [input.parish, 'parish'],
    [input.district, 'district'],
    [input.region, 'region'],
    [input.country, 'country'],
  ];
  for (const [value, column] of optionalFilters) {
    const normalized = nullableText(value);
    if (!normalized) {
      continue;
    }
    params.push(normalized);
    clauses.push(`lower(btrim(${column})) = lower(btrim($${params.length}))`);
  }

  const result = await client.query<ResolvedSchoolLink>(
    `
      SELECT
        id,
        school_code AS "schoolCode",
        school_external_id AS "schoolExternalId",
        name,
        COALESCE(country, 'Uganda') AS country,
        COALESCE(region, '') AS region,
        COALESCE(sub_region, '') AS "subRegion",
        COALESCE(district, '') AS district,
        COALESCE(parish, '') AS parish
      FROM schools_directory
      WHERE ${clauses.join(' AND ')}
      LIMIT 2
    `,
    params,
  );

  if (result.rows.length === 0) {
    throw new Error(`School not found. Import the school first or provide school_external_id.`);
  }
  if (result.rows.length > 1) {
    throw new Error(`Multiple schools matched this school_name. Add parish, district, region, or country to disambiguate.`);
  }
  return result.rows[0];
}

async function loadParticipantContactById(client: PoolClient, contactId: number) {
  const result = await client.query<ResolvedParticipantContact>(
    `
      SELECT
        contact_id AS "contactId",
        contact_uid AS "contactUid",
        school_id AS "schoolId",
        full_name AS "fullName",
        CASE
          WHEN lower(COALESCE(gender, '')) = 'male' THEN 'Male'
          WHEN lower(COALESCE(gender, '')) = 'female' THEN 'Female'
          ELSE 'Other'
        END AS gender,
        phone,
        email,
        category,
        role_title AS "roleTitle",
        teacher_uid AS "teacherUid",
        participant_external_id AS "participantExternalId"
      FROM school_contacts
      WHERE contact_id = $1
      LIMIT 1
    `,
    [contactId],
  );
  return result.rows[0] ?? null;
}

async function resolveParticipantContact(
  client: PoolClient,
  input: TrainingParticipantWriteInput,
  school: ResolvedSchoolLink,
): Promise<{ contact: ResolvedParticipantContact | null; matchReason: PreparedTrainingParticipantWrite["contactMatchReason"] }> {
  const participantExternalId = nullableText(input.participantExternalId);
  const email = nullableText(input.email);
  const phoneNormalized = normalizePhone(input.phone ?? null);
  const fullName = `${requiredText(input.firstName, "First name")} ${requiredText(input.lastName, "Last name")}`;

  if (participantExternalId) {
    const result = await client.query<ResolvedParticipantContact>(
      `
        SELECT
          contact_id AS "contactId",
          contact_uid AS "contactUid",
          school_id AS "schoolId",
          full_name AS "fullName",
          CASE
            WHEN lower(COALESCE(gender, '')) = 'male' THEN 'Male'
            WHEN lower(COALESCE(gender, '')) = 'female' THEN 'Female'
            ELSE 'Other'
          END AS gender,
          phone,
          email,
          category,
          role_title AS "roleTitle",
          teacher_uid AS "teacherUid",
          participant_external_id AS "participantExternalId"
        FROM school_contacts
        WHERE lower(btrim(participant_external_id)) = lower(btrim($1))
        LIMIT 2
      `,
      [participantExternalId],
    );
    if (result.rows.length > 1) {
      throw new Error(`Multiple participants matched participant_external_id ${participantExternalId}.`);
    }
    const contact = result.rows[0] ?? null;
    if (contact) {
      return { contact, matchReason: "participant_external_id" };
    }
  }

  if (email) {
    const result = await client.query<ResolvedParticipantContact>(
      `
        SELECT
          contact_id AS "contactId",
          contact_uid AS "contactUid",
          school_id AS "schoolId",
          full_name AS "fullName",
          CASE
            WHEN lower(COALESCE(gender, '')) = 'male' THEN 'Male'
            WHEN lower(COALESCE(gender, '')) = 'female' THEN 'Female'
            ELSE 'Other'
          END AS gender,
          phone,
          email,
          category,
          role_title AS "roleTitle",
          teacher_uid AS "teacherUid",
          participant_external_id AS "participantExternalId"
        FROM school_contacts
        WHERE lower(btrim(email)) = lower(btrim($1))
        LIMIT 2
      `,
      [email],
    );
    if (result.rows.length > 1) {
      throw new Error(`Multiple participant profiles matched email ${email}.`);
    }
    const contact = result.rows[0] ?? null;
    if (contact) {
      if (contact.schoolId !== school.id) {
        throw new Error("Email matched a participant profile in a different school. Use participant_external_id or correct the school link.");
      }
      return { contact, matchReason: "email" };
    }
  }

  if (phoneNormalized) {
    const result = await client.query<ResolvedParticipantContact>(
      `
        SELECT
          contact_id AS "contactId",
          contact_uid AS "contactUid",
          school_id AS "schoolId",
          full_name AS "fullName",
          CASE
            WHEN lower(COALESCE(gender, '')) = 'male' THEN 'Male'
            WHEN lower(COALESCE(gender, '')) = 'female' THEN 'Female'
            ELSE 'Other'
          END AS gender,
          phone,
          email,
          category,
          role_title AS "roleTitle",
          teacher_uid AS "teacherUid",
          participant_external_id AS "participantExternalId"
        FROM school_contacts
        WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]+', '', 'g') = $1
        LIMIT 2
      `,
      [phoneNormalized],
    );
    if (result.rows.length > 1) {
      throw new Error(`Multiple participant profiles matched phone ${input.phone}.`);
    }
    const contact = result.rows[0] ?? null;
    if (contact) {
      if (contact.schoolId !== school.id) {
        throw new Error("Phone matched a participant profile in a different school. Use participant_external_id or correct the school link.");
      }
      return { contact, matchReason: "phone" };
    }
  }

  const nameResult = await client.query<ResolvedParticipantContact>(
    `
      SELECT
        contact_id AS "contactId",
        contact_uid AS "contactUid",
        school_id AS "schoolId",
        full_name AS "fullName",
        CASE
          WHEN lower(COALESCE(gender, '')) = 'male' THEN 'Male'
          WHEN lower(COALESCE(gender, '')) = 'female' THEN 'Female'
          ELSE 'Other'
        END AS gender,
        phone,
        email,
        category,
        role_title AS "roleTitle",
        teacher_uid AS "teacherUid",
        participant_external_id AS "participantExternalId"
      FROM school_contacts
      WHERE school_id = $1
        AND lower(btrim(full_name)) = lower(btrim($2))
      LIMIT 2
    `,
    [school.id, fullName],
  );
  if (nameResult.rows.length > 1) {
    throw new Error(`Multiple participant profiles matched ${fullName} in ${school.name}.`);
  }
  return { contact: nameResult.rows[0] ?? null, matchReason: nameResult.rows[0] ? "name_school" : "none" };
}

async function loadExistingTrainingRegistration(
  client: PoolClient,
  trainingRecordId: number,
  contactId: number,
): Promise<ExistingTrainingRegistration | null> {
  const result = await client.query<ExistingTrainingRegistration>(
    `
      SELECT
        id,
        contact_id AS "contactId",
        school_id AS "schoolId",
        participant_role AS "participantRole",
        role_at_time AS "roleAtTime",
        attendance_status AS "attendanceStatus",
        attended_from::text AS "attendedFrom",
        attended_to::text AS "attendedTo",
        certificate_status AS "certificateStatus",
        notes,
        participant_type AS "participantType",
        invited,
        confirmed,
        attended
      FROM portal_training_attendance
      WHERE portal_record_id = $1
        AND contact_id = $2
      LIMIT 1
    `,
    [trainingRecordId, contactId],
  );
  return result.rows[0] ?? null;
}

function buildNormalizedTrainingParticipantData(args: {
  training: ResolvedTrainingRecord;
  school: ResolvedSchoolLink;
  input: TrainingParticipantWriteInput;
}) : TrainingParticipantNormalizedData {
  const firstName = requiredText(args.input.firstName, "First name");
  const lastName = requiredText(args.input.lastName, "Last name");
  const attendanceStatus = normalizeAttendanceStatus(args.input.attendanceStatus);
  return {
    trainingRecordId: args.training.id,
    trainingCode: args.training.recordCode,
    participantExternalId: nullableText(args.input.participantExternalId),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    sex: normalizeSex(args.input.sex),
    phone: nullableText(args.input.phone),
    email: nullableText(args.input.email),
    role: requiredText(args.input.role, "Role"),
    jobTitle: nullableText(args.input.jobTitle),
    schoolId: args.school.id,
    schoolExternalId: args.school.schoolExternalId,
    schoolName: args.school.name,
    country: args.school.country,
    region: args.school.region,
    subRegion: args.school.subRegion,
    district: args.school.district,
    parish: args.school.parish,
    attendanceStatus,
    attendedFrom: normalizeOptionalDate(args.input.attendedFrom),
    attendedTo: normalizeOptionalDate(args.input.attendedTo),
    certificateStatus: normalizeCertificateStatus(args.input.certificateStatus),
    notes: nullableText(args.input.notes),
  };
}

function buildParticipantPayloadRow(args: {
  contact: ResolvedParticipantContact;
  school: ResolvedSchoolLink;
  normalizedData: TrainingParticipantNormalizedData;
}) : ParticipantPayloadRow {
  const role = normalizeRoleMetadata(args.normalizedData.role, args.normalizedData.jobTitle);
  const statusFlags = deriveAttendanceFlags(args.normalizedData.attendanceStatus);
  return {
    contactId: args.contact.contactId,
    contactUid: args.contact.contactUid,
    participantName: args.normalizedData.fullName,
    participantExternalId: args.normalizedData.participantExternalId,
    schoolAccountId: args.school.id,
    schoolAttachedTo: args.school.name,
    schoolAccountCode: args.school.schoolCode,
    schoolExternalId: args.school.schoolExternalId,
    role: role.payloadRole,
    gender: args.normalizedData.sex,
    phoneContact: args.normalizedData.phone ?? args.contact.phone ?? "",
    email: args.normalizedData.email ?? args.contact.email ?? "",
    participantType: "In Person",
    invited: statusFlags.invited,
    confirmed: statusFlags.confirmed,
    attended: statusFlags.attended,
    attendanceStatus: args.normalizedData.attendanceStatus,
    attendedFrom: args.normalizedData.attendedFrom,
    attendedTo: args.normalizedData.attendedTo,
    certificateStatus: args.normalizedData.certificateStatus,
    notes: args.normalizedData.notes,
  };
}

function registrationWouldChange(args: {
  normalizedData: TrainingParticipantNormalizedData;
  contact: ResolvedParticipantContact | null;
  existingRegistration: ExistingTrainingRegistration | null;
}) {
  if (!args.contact) {
    return true;
  }

  const role = normalizeRoleMetadata(args.normalizedData.role, args.normalizedData.jobTitle);
  const flags = deriveAttendanceFlags(args.normalizedData.attendanceStatus);
  const contactChanged =
    !compareNullable(args.contact.fullName, args.normalizedData.fullName) ||
    !compareNullable(args.contact.gender, args.normalizedData.sex) ||
    !compareNullable(args.contact.phone, args.normalizedData.phone) ||
    !compareNullable(args.contact.email, args.normalizedData.email) ||
    !compareNullable(args.contact.roleTitle, role.roleTitle) ||
    !compareNullable(args.contact.category, role.contactCategory) ||
    !compareNullable(args.contact.participantExternalId, args.normalizedData.participantExternalId) ||
    args.contact.schoolId !== args.normalizedData.schoolId;

  if (!args.existingRegistration) {
    return true;
  }

  const registrationChanged =
    args.existingRegistration.schoolId !== args.normalizedData.schoolId ||
    !compareNullable(args.existingRegistration.participantRole, role.attendanceRole) ||
    !compareNullable(args.existingRegistration.roleAtTime, role.attendanceRole) ||
    !compareNullable(args.existingRegistration.attendanceStatus, args.normalizedData.attendanceStatus) ||
    !compareNullable(args.existingRegistration.attendedFrom, args.normalizedData.attendedFrom) ||
    !compareNullable(args.existingRegistration.attendedTo, args.normalizedData.attendedTo) ||
    !compareNullable(args.existingRegistration.certificateStatus, args.normalizedData.certificateStatus) ||
    !compareNullable(args.existingRegistration.notes, args.normalizedData.notes) ||
    !compareNullable(args.existingRegistration.participantType, "In Person") ||
    args.existingRegistration.invited !== flags.invited ||
    args.existingRegistration.confirmed !== flags.confirmed ||
    args.existingRegistration.attended !== flags.attended;

  return contactChanged || registrationChanged;
}

async function prepareTrainingParticipantWrite(
  client: PoolClient,
  actor: PortalUser,
  input: TrainingParticipantWriteInput,
): Promise<PreparedTrainingParticipantWrite> {
  const training = await loadTrainingRecord(client, input);
  const school = await resolveSchoolForTrainingParticipant(client, input);
  assertImportScope(actor, {
    country: school.country,
    region: school.region,
    district: school.district,
  });

  const normalizedData = buildNormalizedTrainingParticipantData({ training, school, input });
  const { contact, matchReason } = await resolveParticipantContact(client, input, school);
  const existingRegistration = contact
    ? await loadExistingTrainingRegistration(client, training.id, contact.contactId)
    : null;

  let action: "CREATE" | "UPDATE" | "SKIP" = "CREATE";
  if (contact && existingRegistration) {
    action = registrationWouldChange({ normalizedData, contact, existingRegistration }) ? "UPDATE" : "SKIP";
  }

  return {
    training,
    school,
    contact,
    existingRegistration,
    action,
    contactMatchReason: matchReason,
    normalizedData,
    warningMessage:
      !normalizedData.participantExternalId && !normalizedData.email && !normalizedData.phone
        ? "Add participant_external_id, email, or phone to improve future matching."
        : null,
  };
}

async function upsertParticipantContact(
  client: PoolClient,
  args: {
    school: ResolvedSchoolLink;
    existing: ResolvedParticipantContact | null;
    normalizedData: TrainingParticipantNormalizedData;
  },
) {
  const role = normalizeRoleMetadata(args.normalizedData.role, args.normalizedData.jobTitle);
  const teacherUid =
    role.contactCategory === "Teacher"
      ? await ensureTeacherRoster(
          client,
          args.existing?.teacherUid ?? null,
          args.school.id,
          args.normalizedData.fullName,
          args.normalizedData.sex,
          args.normalizedData.phone,
          args.normalizedData.email,
          role.roleTitle,
        )
      : null;

  if (args.existing) {
    await client.query(
      `
        UPDATE school_contacts
        SET
          school_id = $2,
          full_name = $3,
          gender = $4,
          phone = $5,
          email = $6,
          category = $7,
          role_title = $8,
          teacher_uid = $9,
          participant_external_id = $10,
          updated_at = NOW()
        WHERE contact_id = $1
      `,
      [
        args.existing.contactId,
        args.school.id,
        args.normalizedData.fullName,
        args.normalizedData.sex,
        args.normalizedData.phone,
        args.normalizedData.email,
        role.contactCategory,
        role.roleTitle,
        teacherUid,
        args.normalizedData.participantExternalId,
      ],
    );
    const updated = await loadParticipantContactById(client, args.existing.contactId);
    if (!updated) {
      throw new Error("Participant profile update failed.");
    }
    return {
      contact: updated,
      action: "UPDATE" as const,
    };
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
        category,
        role_title,
        is_primary_contact,
        teacher_uid,
        participant_external_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, $10, NOW(), NOW()
      )
      RETURNING contact_id AS "contactId"
    `,
    [
      createUid("cnt"),
      args.school.id,
      args.normalizedData.fullName,
      args.normalizedData.sex,
      args.normalizedData.phone,
      args.normalizedData.email,
      role.contactCategory,
      role.roleTitle,
      teacherUid,
      args.normalizedData.participantExternalId,
    ],
  );
  const contactId = Number(insertResult.rows[0]?.contactId ?? 0);
  const inserted = contactId ? await loadParticipantContactById(client, contactId) : null;
  if (!inserted) {
    throw new Error("Participant profile creation failed.");
  }
  return {
    contact: inserted,
    action: "CREATE" as const,
  };
}

async function ensureTeacherRoster(
  client: PoolClient,
  currentTeacherUid: string | null,
  schoolId: number,
  fullName: string,
  gender: "Male" | "Female" | "Other",
  phone: string | null,
  email: string | null,
  roleTitle: string | null,
) {
  const teacherUid = currentTeacherUid ?? createUid("tch");
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
      [teacherUid, schoolId, fullName, gender, phone, email, roleTitle],
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
    [teacherUid, schoolId, fullName, gender, phone, email, roleTitle],
  );
  return teacherUid;
}

function sortParticipantRows(rows: ParticipantPayloadRow[]) {
  return [...rows].sort((left, right) => {
    const schoolCompare = left.schoolAttachedTo.localeCompare(right.schoolAttachedTo, undefined, {
      sensitivity: "base",
    });
    if (schoolCompare !== 0) {
      return schoolCompare;
    }
    return left.participantName.localeCompare(right.participantName, undefined, {
      sensitivity: "base",
    });
  });
}

function mergeTrainingParticipantRow(existingPayload: Record<string, unknown>, nextRow: ParticipantPayloadRow) {
  const rows = asRecordArray(existingPayload.participants)
    .filter((row) => {
      const sameContactId = Number(row.contactId ?? 0) === nextRow.contactId;
      const sameContactUid =
        String(row.contactUid ?? "").trim() !== "" &&
        String(row.contactUid ?? "").trim().toLowerCase() === nextRow.contactUid.toLowerCase();
      const sameExternalId =
        nextRow.participantExternalId &&
        String(row.participantExternalId ?? "").trim().toLowerCase() === nextRow.participantExternalId.toLowerCase();
      return !(sameContactId || sameContactUid || sameExternalId);
    })
    .map(
      (row) =>
        ({
          contactId: Number(row.contactId ?? 0),
          contactUid: String(row.contactUid ?? "").trim(),
          participantName: String(row.participantName ?? "").trim(),
          participantExternalId: nullableText(row.participantExternalId),
          schoolAccountId: Number(row.schoolAccountId ?? 0),
          schoolAttachedTo: String(row.schoolAttachedTo ?? "").trim(),
          schoolAccountCode: nullableText(row.schoolAccountCode),
          schoolExternalId: nullableText(row.schoolExternalId),
          role: normalizeRoleMetadata(row.role, null).payloadRole,
          gender: normalizeSex(row.gender),
          phoneContact: String(row.phoneContact ?? row.phone ?? "").trim(),
          email: String(row.email ?? "").trim(),
          participantType: normalizeParticipantType(row.participantType),
          invited: row.invited !== false,
          confirmed: row.confirmed === false ? false : true,
          attended: row.attended === true,
          attendanceStatus: normalizeAttendanceStatus(row.attendanceStatus ?? (row.attended ? "Attended" : "Registered")),
          attendedFrom: normalizeOptionalDate(String(row.attendedFrom ?? "")),
          attendedTo: normalizeOptionalDate(String(row.attendedTo ?? "")),
          certificateStatus: normalizeCertificateStatus(row.certificateStatus),
          notes: nullableText(row.notes),
        }) satisfies ParticipantPayloadRow,
    );

  rows.push(nextRow);
  return sortParticipantRows(rows);
}

function applyTrainingParticipantSummary(payload: Record<string, unknown>, participantRows: ParticipantPayloadRow[]) {
  payload.participants = JSON.stringify(participantRows);
  payload.participantsTotal = participantRows.length;
  payload.totalInvited = participantRows.filter((row) => row.invited).length;
  payload.confirmedTotal = participantRows.filter((row) => row.confirmed).length;
  payload.classroomTeachers = participantRows.filter((row) => row.role === "Teacher").length;
  payload.schoolLeaders = participantRows.filter((row) => row.role === "Leader").length;
  payload.femaleCount = participantRows.filter((row) => row.attended && row.gender === "Female").length;
  payload.maleCount = participantRows.filter((row) => row.attended && row.gender === "Male").length;
  payload.teachersFemale = participantRows.filter(
    (row) => row.attended && row.role === "Teacher" && row.gender === "Female",
  ).length;
  payload.teachersMale = participantRows.filter(
    (row) => row.attended && row.role === "Teacher" && row.gender === "Male",
  ).length;
  payload.schoolLeadersFemale = participantRows.filter(
    (row) => row.attended && row.role === "Leader" && row.gender === "Female",
  ).length;
  payload.schoolLeadersMale = participantRows.filter(
    (row) => row.attended && row.role === "Leader" && row.gender === "Male",
  ).length;
  payload.numberAttended = participantRows.filter((row) => row.attended).length;
}

async function rebuildTrainingAttendance(
  client: PoolClient,
  trainingRecordId: number,
  participantRows: ParticipantPayloadRow[],
) {
  await client.query(`DELETE FROM portal_training_attendance WHERE portal_record_id = $1`, [trainingRecordId]);

  for (const row of participantRows) {
    const contact = await loadParticipantContactById(client, row.contactId);
    if (!contact) {
      throw new Error(`Participant contact ${row.contactId} no longer exists.`);
    }
    const school = await loadSchoolById(client, row.schoolAccountId);
    if (!school) {
      throw new Error(`School ${row.schoolAccountId} no longer exists.`);
    }
    const role = normalizeRoleMetadata(row.role, null);
    const statusFlags = deriveAttendanceFlags(row.attendanceStatus);

    await client.query(
      `
        INSERT INTO portal_training_attendance (
          portal_record_id,
          school_id,
          contact_id,
          contact_uid,
          participant_code,
          participant_name,
          participant_role,
          participant_type,
          invited,
          confirmed,
          role_at_time,
          gender,
          teacher_uid,
          attended,
          phone,
          email,
          mobile_number,
          school_name_snapshot,
          school_region_snapshot,
          school_district_snapshot,
          attendance_status,
          attended_from,
          attended_to,
          certificate_status,
          notes,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22::date, $23::date, $24, $25, NOW(), NOW()
        )
      `,
      [
        trainingRecordId,
        school.id,
        contact.contactId,
        contact.contactUid,
        row.participantExternalId ?? `TP-${trainingRecordId}-${contact.contactId}`,
        row.participantName,
        role.attendanceRole,
        row.participantType,
        statusFlags.invited,
        statusFlags.confirmed,
        role.attendanceRole,
        row.gender,
        contact.teacherUid,
        statusFlags.attended,
        row.phoneContact || contact.phone,
        row.email || contact.email,
        row.phoneContact || contact.phone,
        school.name,
        school.region,
        school.district,
        row.attendanceStatus,
        row.attendedFrom,
        row.attendedTo,
        row.certificateStatus,
        row.notes,
      ],
    );
  }
}

async function appendTrainingParticipantAuditLog(client: PoolClient, args: {
  actor: PortalUser;
  trainingRecordId: number;
  contactId: number;
  action: "CREATE" | "UPDATE";
  normalizedData: TrainingParticipantNormalizedData;
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
        $1, $2, $3, 'portal_training_attendance', $4, $5, $6
      )
    `,
    [
      args.actor.id,
      args.actor.fullName,
      args.action === "CREATE" ? "create" : "update",
      String(args.trainingRecordId),
      JSON.stringify({
        trainingRecordId: args.trainingRecordId,
        contactId: args.contactId,
        schoolId: args.normalizedData.schoolId,
        attendanceStatus: args.normalizedData.attendanceStatus,
      }),
      `${args.action === "CREATE" ? "Added" : "Updated"} training participant ${args.normalizedData.fullName}.`,
    ],
  );
}

export async function previewTrainingParticipantWrite(args: {
  actor: PortalUser;
  input: TrainingParticipantWriteInput;
}) {
  return withPostgresClient(async (client) => {
    const prepared = await prepareTrainingParticipantWrite(client, args.actor, args.input);
    return {
      action: prepared.action,
      linkedTrainingId: prepared.training.id,
      linkedSchoolId: prepared.school.id,
      normalizedData: prepared.normalizedData,
      warningMessage: prepared.warningMessage,
      isAlreadyRegistered: Boolean(prepared.existingRegistration),
    };
  });
}

export async function createOrUpdateTrainingParticipant(args: {
  actor: PortalUser;
  input: TrainingParticipantWriteInput;
}): Promise<TrainingParticipantWriteResult> {
  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      const prepared = await prepareTrainingParticipantWrite(client, args.actor, args.input);
      if (prepared.action === "SKIP" && prepared.contact) {
        await client.query("ROLLBACK");
        return {
          action: "SKIP",
          trainingRecordId: prepared.training.id,
          trainingCode: prepared.training.recordCode,
          contactId: prepared.contact.contactId,
          schoolId: prepared.school.id,
          warningMessage: prepared.warningMessage,
          normalizedData: prepared.normalizedData,
        };
      }

      const contactMutation = await upsertParticipantContact(client, {
        school: prepared.school,
        existing: prepared.contact,
        normalizedData: prepared.normalizedData,
      });
      const contact = contactMutation.contact;

      const payload = safeJsonObject(prepared.training.payloadJson);
      const mergedRows = mergeTrainingParticipantRow(payload, buildParticipantPayloadRow({
        contact,
        school: prepared.school,
        normalizedData: prepared.normalizedData,
      }));
      applyTrainingParticipantSummary(payload, mergedRows);

      await client.query(
        `
          UPDATE portal_records
          SET
            payload_json = $2,
            updated_by_user_id = $3,
            updated_at = NOW()
          WHERE id = $1
        `,
        [prepared.training.id, JSON.stringify(payload), args.actor.id],
      );

      await rebuildTrainingAttendance(client, prepared.training.id, mergedRows);
      await appendTrainingParticipantAuditLog(client, {
        actor: args.actor,
        trainingRecordId: prepared.training.id,
        contactId: contact.contactId,
        action: prepared.action === "CREATE" ? "CREATE" : contactMutation.action,
        normalizedData: prepared.normalizedData,
      });

      await client.query("COMMIT");
      return {
        action: prepared.action === "CREATE" ? "CREATE" : contactMutation.action,
        trainingRecordId: prepared.training.id,
        trainingCode: prepared.training.recordCode,
        contactId: contact.contactId,
        schoolId: prepared.school.id,
        warningMessage: prepared.warningMessage,
        normalizedData: prepared.normalizedData,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function listTrainingImportLookupRows() {
  const result = await queryPostgres<{
    id: number;
    trainingCode: string;
    trainingTitle: string;
    startDate: string | null;
    endDate: string | null;
  }>(
    `
      SELECT
        pr.id,
        pr.record_code AS "trainingCode",
        COALESCE(NULLIF(COALESCE(NULLIF(pr.payload_json, ''), '{}')::jsonb ->> 'trainingName', ''), pr.record_code) AS "trainingTitle",
        pr.date::text AS "startDate",
        NULLIF(COALESCE(NULLIF(pr.payload_json, ''), '{}')::jsonb ->> 'endTime', '') AS "endDate"
      FROM portal_records pr
      WHERE pr.module = 'training'
        AND pr.deleted_at IS NULL
      ORDER BY pr.date DESC, pr.id DESC
    `,
  );
  return result.rows;
}

export async function listTrainingParticipantSchoolLookupRows() {
  const result = await queryPostgres<ResolvedSchoolLink>(
    `
      SELECT
        id,
        school_code AS "schoolCode",
        school_external_id AS "schoolExternalId",
        name,
        COALESCE(country, 'Uganda') AS country,
        COALESCE(region, '') AS region,
        COALESCE(sub_region, '') AS "subRegion",
        COALESCE(district, '') AS district,
        COALESCE(parish, '') AS parish
      FROM schools_directory
      ORDER BY name ASC
    `,
  );
  return result.rows;
}
