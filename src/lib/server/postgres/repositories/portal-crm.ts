import type {
  CrmActivityItem,
  CrmListCell,
  PortalCrmListViewModel,
  PortalCrmProfileViewModel,
} from "@/lib/portal-crm-types";
import { queryPostgres } from "@/lib/server/postgres/client";

function text(value: unknown, fallback = "-") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function nullableText(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function whole(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function formatNumber(value: unknown) {
  return whole(value, 0).toLocaleString();
}

function formatDate(value: unknown) {
  const normalized = nullableText(value);
  if (!normalized) {
    return "-";
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return normalized;
  }
  return new Intl.DateTimeFormat("en-UG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: unknown) {
  const normalized = nullableText(value);
  if (!normalized) {
    return "-";
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return normalized;
  }
  return new Intl.DateTimeFormat("en-UG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function safeJson(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value.trim()) {
    return {};
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

function listFromValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function payloadText(payload: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = nullableText(payload[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function payloadInt(payload: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (value === null || value === undefined || value === "") {
      continue;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return null;
}

function buildCell(value: unknown, href?: string | null, muted = false): CrmListCell {
  return {
    value: text(value),
    href: href ?? null,
    muted,
  };
}

function activity(
  id: number | string,
  title: string,
  subtitle?: string | null,
  meta?: string | null,
  date?: string | null,
  href?: string | null,
  status?: string | null,
): CrmActivityItem {
  return { id, title, subtitle, meta, date, href, status };
}

async function getPortalRecordBase(module: "training" | "visit" | "assessment" | "story", id: number) {
  const result = await queryPostgres(
    `
      SELECT
        pr.id,
        pr.record_code AS "recordCode",
        pr.module,
        pr.date::text AS date,
        pr.status,
        pr.program_type AS "programType",
        COALESCE(pr.payload_json, '{}') AS "payloadJson",
        pr.school_id AS "schoolId",
        pr.school_name AS "schoolName",
        pr.district,
        pr.follow_up_date::text AS "followUpDate",
        pr.follow_up_type AS "followUpType",
        pr.review_note AS "reviewNote",
        pr.created_at::text AS "createdAt",
        pr.updated_at::text AS "updatedAt",
        pu.full_name AS "createdByName",
        sd.country,
        sd.region,
        sd.sub_region AS "subRegion",
        sd.sub_county AS "subCounty",
        sd.parish,
        sd.school_code AS "schoolCode"
      FROM portal_records pr
      LEFT JOIN portal_users pu ON pu.id = pr.created_by_user_id
      LEFT JOIN schools_directory sd ON sd.id = pr.school_id
      WHERE pr.module = $1
        AND pr.id = $2
        AND pr.deleted_at IS NULL
      LIMIT 1
    `,
    [module, id],
  );
  return result.rows[0] as Record<string, unknown> | undefined;
}

export async function listTrainingCrmRows(): Promise<PortalCrmListViewModel> {
  const result = await queryPostgres(
    `
      SELECT
        pr.id,
        pr.record_code AS "recordCode",
        pr.date::text AS date,
        pr.status,
        pr.school_name AS "schoolName",
        pr.payload_json AS "payloadJson",
        COALESCE(sd.country, 'Uganda') AS country,
        pu.full_name AS "createdByName"
      FROM portal_records pr
      LEFT JOIN schools_directory sd ON sd.id = pr.school_id
      LEFT JOIN portal_users pu ON pu.id = pr.created_by_user_id
      WHERE pr.module = 'training'
        AND pr.deleted_at IS NULL
      ORDER BY pr.date DESC, pr.updated_at DESC
      LIMIT 500
    `,
  );

  return {
    badge: "Training Sessions",
    title: "Training Sessions",
    subtitle: "Recorded trainings stored directly in PostgreSQL with linked school, presenter, and participant context.",
    primaryActionLabel: "Open Training Form Workspace",
    primaryActionHref: "/portal/trainings/manage",
    secondaryActionLabel: "Training Reports",
    secondaryActionHref: "/portal/reports?module=training",
    columns: [
      { key: "name", label: "Training Session Name" },
      { key: "organization", label: "Training Organization" },
      { key: "date", label: "Session Date" },
      { key: "presenter", label: "Training Presenter" },
      { key: "country", label: "Country" },
      { key: "type", label: "Training Type" },
      { key: "invited", label: "Total Invited" },
    ],
    rows: result.rows.map((row) => {
      const payload = safeJson(row.payloadJson);
      const title = payloadText(payload, "trainingName") ?? text(row.recordCode);
      const organization =
        payloadText(payload, "trainingOrganization", "sponsoredBy") ?? text(row.schoolName);
      const presenter =
        payloadText(payload, "trainingPresenter", "facilitators") ?? text(row.createdByName);
      const trainingType = payloadText(payload, "deliveryMode") ?? "In Person";
      const totalInvited =
        payloadInt(payload, "totalInvited", "numberAttended") ?? 0;
      return {
        id: Number(row.id),
        href: `/portal/trainings/${row.id}`,
        cells: {
          name: buildCell(title, `/portal/trainings/${row.id}`),
          organization: buildCell(organization),
          date: buildCell(formatDate(row.date)),
          presenter: buildCell(presenter),
          country: buildCell(row.country ?? "Uganda"),
          type: buildCell(trainingType),
          invited: buildCell(String(totalInvited)),
        },
      };
    }),
  };
}

export async function getTrainingCrmProfile(id: number): Promise<PortalCrmProfileViewModel | null> {
  const row = await getPortalRecordBase("training", id);
  if (!row) {
    return null;
  }
  const payload = safeJson(row.payloadJson);
  const attendanceResult = await queryPostgres(
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE attended IS TRUE)::int AS attended,
        COUNT(*) FILTER (WHERE participant_role = 'Classroom teacher' AND attended IS TRUE)::int AS teachers,
        COUNT(*) FILTER (WHERE participant_role = 'School Leader' AND attended IS TRUE)::int AS leaders,
        COUNT(*) FILTER (WHERE lower(COALESCE(gender, '')) = 'female' AND attended IS TRUE)::int AS female,
        COUNT(*) FILTER (WHERE lower(COALESCE(gender, '')) = 'male' AND attended IS TRUE)::int AS male
      FROM portal_training_attendance
      WHERE portal_record_id = $1
    `,
    [id],
  );
  const filesResult = await queryPostgres<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM portal_evidence WHERE record_id = $1 AND module = 'training'`,
    [id],
  );
  const participantResult = await queryPostgres(
    `
      SELECT
        pta.id,
        pta.participant_name AS "participantName",
        COALESCE(pta.role_at_time, pta.participant_role) AS role,
        COALESCE(sc.full_name, sd.name, '') AS "linkedSchoolName",
        pta.created_at::text AS "createdAt"
      FROM portal_training_attendance pta
      LEFT JOIN school_contacts sc ON sc.contact_id = pta.contact_id
      LEFT JOIN schools_directory sd ON sd.id = pta.school_id
      WHERE pta.portal_record_id = $1
      ORDER BY pta.participant_role ASC, pta.participant_name ASC
      LIMIT 50
    `,
    [id],
  );

  const attended = whole(attendanceResult.rows[0]?.attended);
  const trainingName = payloadText(payload, "trainingName") ?? text(row.recordCode);
  const presenter = payloadText(payload, "trainingPresenter", "facilitators") ?? text(row.createdByName);
  const organization = payloadText(payload, "trainingOrganization", "sponsoredBy") ?? text(row.schoolName);
  const trainingType = payloadText(payload, "deliveryMode") ?? "In Person";
  const venue = payloadText(payload, "trainingVenue") ?? text(row.schoolName);
  const language = payloadText(payload, "trainingLanguage") ?? "English";
  const audience = payloadText(payload, "audience") ?? "Both";
  const objectives = listFromValue(payload.objectivesCovered).join(", ") || "-";
  const modulesDelivered = listFromValue(payload.modulesDelivered).join(", ") || "-";
  const totalInvited = payloadInt(payload, "totalInvited", "numberAttended") ?? whole(attendanceResult.rows[0]?.total);

  return {
    badge: "Training Session",
    title: trainingName,
    subtitle: `${text(row.schoolName)} • ${text(row.recordCode)} • ${text(row.status)}`,
    heroFields: [
      { label: "Training Type", value: trainingType },
      { label: "Session Date", value: formatDate(row.date) },
      { label: "Training Presenter", value: presenter },
      { label: "Total Attendees", value: String(attended) },
    ],
    primaryActions: [
      { label: "Training Workspace", href: "/portal/trainings/manage", tone: "ghost" },
      { label: "School Account", href: `/portal/schools/${row.schoolId}` },
    ],
    notice: "Training data is linked to the school account, participant roster, evidence files, and follow-up workflow.",
    quickLinks: [
      { label: "Participants", count: whole(attendanceResult.rows[0]?.total), href: "#participants", icon: "TR" },
      { label: "Files", count: whole(filesResult.rows[0]?.total), href: `/portal/reports?module=training&search=${encodeURIComponent(text(row.recordCode))}`, icon: "FL" },
      { label: "Assessments", count: 0, href: `/portal/assessments?school=${encodeURIComponent(text(row.schoolName))}`, icon: "AS" },
      { label: "School Visits", count: 0, href: `/portal/visits?school=${encodeURIComponent(text(row.schoolName))}`, icon: "VS" },
    ],
    detailsLeft: [
      { label: "Training Session Name", value: trainingName },
      { label: "Country", value: text(row.country, "Uganda") },
      { label: "School Account", value: text(row.schoolName), href: row.schoolId ? `/portal/schools/${row.schoolId}` : null },
      { label: "Session Date", value: formatDate(row.date) },
      { label: "Start Time", value: payloadText(payload, "startTime") ?? "-" },
      { label: "End Time", value: payloadText(payload, "endTime") ?? "-" },
      { label: "Training Venue", value: venue },
      { label: "Cluster Name", value: payloadText(payload, "clusterName") ?? "-" },
      { label: "Audience", value: audience },
      { label: "Objectives Covered", value: objectives },
      { label: "Modules Delivered", value: modulesDelivered },
    ],
    detailsRight: [
      { label: "Training Organization", value: organization },
      { label: "Training Presenter", value: presenter },
      { label: "Other Facilitators", value: payloadText(payload, "facilitators") ?? "-" },
      { label: "Training Language", value: language },
      { label: "Training Type", value: trainingType },
      { label: "Total Invited", value: String(totalInvited) },
      { label: "Attended", value: String(attended) },
      { label: "Female Attended", value: formatNumber(attendanceResult.rows[0]?.female) },
      { label: "Male Attended", value: formatNumber(attendanceResult.rows[0]?.male) },
      { label: "Teachers Trained", value: formatNumber(attendanceResult.rows[0]?.teachers) },
      { label: "School Leaders Trained", value: formatNumber(attendanceResult.rows[0]?.leaders) },
      { label: "Follow-up Date", value: formatDate(row.followUpDate) },
      { label: "Follow-up Type", value: text(row.followUpType) },
      { label: "Workflow Status", value: text(row.status) },
      { label: "Review Note", value: text(row.reviewNote) },
      { label: "Created At", value: formatDateTime(row.createdAt) },
    ],
    tabs: [
      {
        id: "participants",
        label: "Participant List",
        emptyLabel: "No training participants have been linked yet.",
        items: participantResult.rows.map((item) =>
          activity(
            Number(item.id),
            text(item.participantName),
            text(item.role),
            text(item.linkedSchoolName),
            formatDateTime(item.createdAt),
          ),
        ),
      },
      {
        id: "followup",
        label: "Follow-up",
        emptyLabel: "No follow-up note captured yet.",
        items: [
          activity(
            `followup-${id}`,
            payloadText(payload, "insightsConclusionsNextSteps") ?? "Follow-up plan",
            payloadText(payload, "trainingFeedbackBundleJson") ?? payloadText(payload, "insightsKeyFindings"),
            payloadText(payload, "supportNeededFromOzeki") ?? organization,
            formatDate(row.followUpDate),
            null,
            text(row.status),
          ),
        ].filter((item) => item.title !== "Follow-up plan" || item.subtitle),
      },
    ],
    sidebarCards: [
      {
        title: "Delivery Summary",
        items: [
          { label: "Presenter", value: presenter },
          { label: "Organization", value: organization },
          { label: "Attendees", value: String(attended) },
          { label: "School Code", value: text(row.schoolCode) },
        ],
      },
    ],
  };
}

export async function listContactCrmRows(): Promise<PortalCrmListViewModel> {
  const result = await queryPostgres(
    `
      SELECT
        sc.contact_id AS id,
        sc.full_name AS "fullName",
        sd.id AS "schoolId",
        sd.name AS "schoolName",
        COALESCE(sc.role_title, sc.category) AS role,
        COALESCE(sd.country, 'Uganda') AS country,
        sd.region,
        sc.phone,
        sc.email,
        COALESCE(sc.contact_record_type, 'School Contact') AS "contactRecordType",
        sc.category,
        sc.updated_at::text AS "updatedAt"
      FROM school_contacts sc
      JOIN schools_directory sd ON sd.id = sc.school_id
      ORDER BY sc.full_name ASC
      LIMIT 1000
    `,
  );

  return {
    badge: "Contacts",
    title: "All School Contacts",
    subtitle: "Teachers, school leaders, and proprietors linked directly to school accounts and activities.",
    primaryActionLabel: "Open School Accounts",
    primaryActionHref: "/portal/schools",
    secondaryActionLabel: "Contact Profiles",
    secondaryActionHref: "/portal/contacts",
    columns: [
      { key: "name", label: "Name" },
      { key: "account", label: "Account Name" },
      { key: "role", label: "Role" },
      { key: "country", label: "Country" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "region", label: "Account Region" },
      { key: "recordType", label: "Contact Record Type" },
    ],
    rows: result.rows.map((row) => ({
      id: Number(row.id),
      href: `/portal/contacts/${row.id}`,
      cells: {
        name: buildCell(row.fullName, `/portal/contacts/${row.id}`),
        account: buildCell(row.schoolName, row.schoolId ? `/portal/schools/${row.schoolId}` : null),
        role: buildCell(row.role ?? row.category),
        country: buildCell(row.country ?? "Uganda"),
        phone: buildCell(row.phone),
        email: buildCell(row.email),
        region: buildCell(row.region),
        recordType: buildCell(row.contactRecordType),
      },
    })),
  };
}

export async function getContactCrmProfile(id: number): Promise<PortalCrmProfileViewModel | null> {
  const baseResult = await queryPostgres(
    `
      SELECT
        sc.contact_id AS id,
        sc.contact_uid AS "contactUid",
        sc.teacher_uid AS "teacherUid",
        sc.school_id AS "schoolId",
        sc.full_name AS "fullName",
        sc.gender,
        sc.phone,
        sc.email,
        sc.whatsapp,
        sc.category,
        sc.role_title AS "roleTitle",
        sc.is_primary_contact AS "isPrimaryContact",
        sc.class_taught AS "classTaught",
        sc.subject_taught AS "subjectTaught",
        sc.nickname,
        COALESCE(sc.contact_record_type, 'School Contact') AS "contactRecordType",
        COALESCE(sc.leadership_role, FALSE) AS "leadershipRole",
        sc.sub_role AS "subRole",
        sc.role_formula AS "roleFormula",
        sc.last_ssa_sent::text AS "lastSsaSent",
        COALESCE(sc.trainer, FALSE) AS trainer,
        sc.notes,
        sc.created_at::text AS "createdAt",
        sc.updated_at::text AS "updatedAt",
        sd.name AS "schoolName",
        sd.country,
        sd.region,
        sd.district,
        sd.school_code AS "schoolCode"
      FROM school_contacts sc
      JOIN schools_directory sd ON sd.id = sc.school_id
      WHERE sc.contact_id = $1
      LIMIT 1
    `,
    [id],
  );
  const row = baseResult.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    return null;
  }

  const [trainingCount, visitCount, storyCount, linkedRows] = await Promise.all([
    queryPostgres<{ total: number }>(`SELECT COUNT(*)::int AS total FROM portal_training_attendance WHERE contact_id = $1`, [id]),
    queryPostgres<{ total: number }>(`SELECT COUNT(*)::int AS total FROM visit_participants WHERE contact_id = $1`, [id]),
    queryPostgres<{ total: number }>(`SELECT COUNT(*)::int AS total FROM story_activity_participants WHERE contact_id = $1`, [id]),
    queryPostgres(
      `
        SELECT
          pr.id,
          pr.module,
          pr.record_code AS "recordCode",
          pr.date::text AS date,
          pr.status,
          pr.school_name AS "schoolName",
          COALESCE(pr.program_type, pr.module) AS title
        FROM portal_records pr
        WHERE (
          pr.id IN (SELECT portal_record_id FROM portal_training_attendance WHERE contact_id = $1)
          OR pr.id IN (
            SELECT cv.portal_record_id
            FROM visit_participants vp
            JOIN coaching_visits cv ON cv.id = vp.visit_id
            WHERE vp.contact_id = $1 AND cv.portal_record_id IS NOT NULL
          )
          OR pr.id IN (
            SELECT sa.portal_record_id
            FROM story_activity_participants sap
            JOIN story_activities sa ON sa.id = sap.story_activity_id
            WHERE sap.contact_id = $1 AND sa.portal_record_id IS NOT NULL
          )
        )
        ORDER BY pr.date DESC
        LIMIT 30
      `,
      [id],
    ),
  ]);

  return {
    badge: "Contact",
    title: text(row.fullName),
    subtitle: `${text(row.contactRecordType)} • ${text(row.schoolName)} • ${text(row.roleTitle ?? row.category)}`,
    heroFields: [
      { label: "Account Name", value: text(row.schoolName), href: `/portal/schools/${row.schoolId}` },
      { label: "Role", value: text(row.roleTitle ?? row.category) },
    ],
    primaryActions: [
      { label: "School Account", href: `/portal/schools/${row.schoolId}`, tone: "ghost" },
      { label: "Contact List", href: "/portal/contacts" },
    ],
    notice: text(row.isPrimaryContact ? "This contact is the primary account contact for the linked school." : "This contact is linked to the school account and can be attached to trainings, visits, and 1001 story activities."),
    quickLinks: [
      { label: "Trainings", count: whole(trainingCount.rows[0]?.total), href: `/portal/trainings?contact=${encodeURIComponent(text(row.fullName))}`, icon: "TR" },
      { label: "School Visits", count: whole(visitCount.rows[0]?.total), href: `/portal/visits?contact=${encodeURIComponent(text(row.fullName))}`, icon: "VS" },
      { label: "1001 Story", count: whole(storyCount.rows[0]?.total), href: `/portal/story?contact=${encodeURIComponent(text(row.fullName))}`, icon: "ST" },
      { label: "Assessments", count: 0, href: `/portal/assessments?school=${encodeURIComponent(text(row.schoolName))}`, icon: "AS" },
    ],
    detailsLeft: [
      { label: "Name", value: text(row.fullName) },
      { label: "Contact Record Type", value: text(row.contactRecordType) },
      { label: "Account Name", value: text(row.schoolName), href: `/portal/schools/${row.schoolId}` },
      { label: "Nickname", value: text(row.nickname) },
      { label: "Gender", value: text(row.gender) },
      { label: "Role Formula", value: text(row.roleFormula) },
      { label: "Trainer", value: row.trainer ? "Yes" : "No" },
      { label: "Country", value: text(row.country, "Uganda") },
      { label: "Region", value: text(row.region) },
      { label: "District", value: text(row.district) },
    ],
    detailsRight: [
      { label: "Leadership Role", value: row.leadershipRole ? "Yes" : "No" },
      { label: "Role", value: text(row.roleTitle ?? row.category) },
      { label: "Sub-role", value: text(row.subRole) },
      { label: "Last SSA Sent", value: formatDate(row.lastSsaSent) },
      { label: "Phone", value: text(row.phone) },
      { label: "Email", value: text(row.email) },
      { label: "WhatsApp", value: text(row.whatsapp) },
      { label: "Class Taught", value: text(row.classTaught) },
      { label: "Subject Taught", value: text(row.subjectTaught) },
      { label: "Teacher UID", value: text(row.teacherUid) },
      { label: "Updated At", value: formatDateTime(row.updatedAt) },
      { label: "Notes", value: text(row.notes) },
    ],
    tabs: [
      {
        id: "activity",
        label: "Most Recent Interactions",
        emptyLabel: "No linked activities yet.",
        items: linkedRows.rows.map((item) =>
          activity(
            Number(item.id),
            text(item.title),
            text(item.schoolName),
            text(item.recordCode),
            formatDate(item.date),
            item.module === "training"
              ? `/portal/trainings/${item.id}`
              : item.module === "visit"
                ? `/portal/visits/${item.id}`
                : `/portal/story/${item.id}`,
            text(item.status),
          ),
        ),
      },
    ],
    sidebarCards: [
      {
        title: "Account Summary",
        items: [
          { label: "School Code", value: text(row.schoolCode) },
          { label: "Primary Contact", value: row.isPrimaryContact ? "Yes" : "No" },
          { label: "Trainings", value: formatNumber(trainingCount.rows[0]?.total) },
          { label: "Visits", value: formatNumber(visitCount.rows[0]?.total) },
        ],
      },
    ],
  };
}

export async function listAssessmentCrmRows(): Promise<PortalCrmListViewModel> {
  const result = await queryPostgres(
    `
      SELECT
        s.id,
        COALESCE(pr.record_code, 'AN-' || LPAD(s.id::text, 4, '0')) AS "assessmentNumber",
        s.assessment_date::text AS "assessmentDate",
        COALESCE(pr.status, 'Completed') AS status,
        COALESCE(pr.payload_json, '{}') AS "payloadJson",
        COALESCE(pr.program_type, s.assessment_type) AS type,
        pu.full_name AS assessor,
        sd.name AS "schoolName",
        p_up.full_name AS "updatedByName"
      FROM assessment_sessions s
      LEFT JOIN portal_records pr ON pr.id = s.portal_record_id
      LEFT JOIN schools_directory sd ON sd.id = s.school_id
      LEFT JOIN portal_users pu ON pu.id = s.assessor_user_id
      LEFT JOIN portal_users p_up ON p_up.id = pr.updated_by_user_id
      ORDER BY s.assessment_date DESC, s.id DESC
      LIMIT 500
    `,
  );

  return {
    badge: "Assessments",
    title: "All Assessments",
    subtitle: "Assessment sessions and learner evidence stored directly in PostgreSQL.",
    primaryActionLabel: "Open Assessment Form Workspace",
    primaryActionHref: "/portal/assessments/manage",
    secondaryActionLabel: "Assessment Reports",
    secondaryActionHref: "/portal/reports?module=learner-assessment",
    columns: [
      { key: "number", label: "Assessment Number" },
      { key: "assessor", label: "Assessor" },
      { key: "school", label: "School" },
      { key: "contact", label: "Contact" },
      { key: "date", label: "Data Collection Date" },
      { key: "status", label: "Status" },
      { key: "type", label: "Type" },
      { key: "reviewYear", label: "Review Year" },
    ],
    rows: result.rows.map((row) => {
      const payload = safeJson(row.payloadJson);
      const assessor =
        payloadText(payload, "assessmentAssessorName", "assessor") ?? text(row.assessor, "Unassigned");
      const contactName = payloadText(payload, "assessmentContactName", "contactName") ?? "-";
      return {
        id: Number(row.id),
        href: `/portal/assessments/${row.id}`,
        cells: {
          number: buildCell(row.assessmentNumber, `/portal/assessments/${row.id}`),
          assessor: buildCell(assessor),
          school: buildCell(row.schoolName),
          contact: buildCell(contactName),
          date: buildCell(formatDate(row.assessmentDate)),
          status: buildCell(row.status),
          type: buildCell(row.type),
          reviewYear: buildCell(payloadText(payload, "reviewYear") ?? payloadText(payload, "programType") ?? "Baseline"),
        },
      };
    }),
  };
}

export async function getAssessmentCrmProfile(id: number): Promise<PortalCrmProfileViewModel | null> {
  const result = await queryPostgres(
    `
      SELECT
        s.id,
        s.session_uid AS "sessionUid",
        s.portal_record_id AS "portalRecordId",
        s.assessment_date::text AS "assessmentDate",
        s.assessment_type AS "assessmentType",
        s.class_grade AS "classGrade",
        s.tool_version AS "toolVersion",
        s.model_version AS "modelVersion",
        s.benchmark_version AS "benchmarkVersion",
        s.scoring_profile_version AS "scoringProfileVersion",
        pr.record_code AS "recordCode",
        COALESCE(pr.status, 'Completed') AS status,
        COALESCE(pr.program_type, s.assessment_type) AS "programType",
        COALESCE(pr.payload_json, '{}') AS "payloadJson",
        pr.created_at::text AS "createdAt",
        pr.updated_at::text AS "updatedAt",
        sd.id AS "schoolId",
        sd.name AS "schoolName",
        sd.school_code AS "schoolCode",
        pu.full_name AS assessor,
        p_up.full_name AS "updatedByName"
      FROM assessment_sessions s
      LEFT JOIN portal_records pr ON pr.id = s.portal_record_id
      LEFT JOIN schools_directory sd ON sd.id = s.school_id
      LEFT JOIN portal_users pu ON pu.id = s.assessor_user_id
      LEFT JOIN portal_users p_up ON p_up.id = pr.updated_by_user_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [id],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    return null;
  }
  const payload = safeJson(row.payloadJson);
  const [responsesResult, filesResult, recordsResult] = await Promise.all([
    queryPostgres<{ total: number }>(
      `
        SELECT COUNT(*)::int AS total
        FROM assessment_item_responses air
        JOIN assessment_records ar ON ar.id = air.learner_result_id
        WHERE ar.source_portal_record_id = $1 OR air.assessment_session_result_id IN (
          SELECT id FROM assessment_session_results WHERE session_id = $2
        )
      `,
      [row.portalRecordId ?? -1, id],
    ),
    queryPostgres<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM portal_evidence WHERE record_id = $1 AND module = 'assessment'`,
      [row.portalRecordId ?? -1],
    ),
    queryPostgres(
      `
        SELECT
          ar.id,
          COALESCE(ar.child_name, ar.learner_uid, 'Learner Result') AS title,
          ar.reading_stage_label AS stage,
          ar.story_reading_score AS "storyReadingScore",
          ar.reading_comprehension_score AS "comprehensionScore",
          ar.created_at::text AS "createdAt"
        FROM assessment_records ar
        WHERE ar.source_portal_record_id = $1 OR (
          ar.school_id = $2 AND ar.assessment_date = $3::date AND ar.assessment_type = $4
        )
        ORDER BY ar.created_at DESC
        LIMIT 40
      `,
      [row.portalRecordId ?? -1, row.schoolId, row.assessmentDate, row.assessmentType],
    ),
  ]);

  const assessmentNumber = text(row.recordCode, `AN-${String(id).padStart(4, "0")}`);
  return {
    badge: "Assessment",
    title: assessmentNumber,
    subtitle: `${text(row.schoolName)} • ${text(row.status)} • ${text(row.programType)}`,
    heroFields: [
      { label: "School", value: text(row.schoolName), href: `/portal/schools/${row.schoolId}` },
      { label: "Assessor", value: payloadText(payload, "assessmentAssessorName", "assessor") ?? text(row.assessor) },
      { label: "Status", value: text(row.status) },
      { label: "Data Collection Date", value: formatDate(row.assessmentDate) },
    ],
    primaryActions: [
      { label: "Assessment Workspace", href: "/portal/assessments/manage", tone: "ghost" },
      { label: "School Account", href: `/portal/schools/${row.schoolId}` },
    ],
    notice: "Assessment summaries, reading-level evidence, and report-generation metrics are sourced from the assessment tables in PostgreSQL.",
    quickLinks: [
      { label: "Files", count: whole(filesResult.rows[0]?.total), href: `/portal/reports?module=learner-assessment&search=${encodeURIComponent(assessmentNumber)}`, icon: "FL" },
      { label: "Question Responses", count: whole(responsesResult.rows[0]?.total), href: "#responses", icon: "QR" },
      { label: "School Account", count: 1, href: `/portal/schools/${row.schoolId}`, icon: "SC" },
      { label: "Training Session", count: payloadText(payload, "trainingSessionName") ? 1 : 0, href: "/portal/trainings", icon: "TR" },
    ],
    detailsLeft: [
      { label: "Survey", value: payloadText(payload, "surveyName") ?? text(row.toolVersion, "Annual School Assessment (Core)") },
      { label: "Assessment Number", value: assessmentNumber },
      { label: "Status", value: text(row.status) },
      { label: "Type", value: text(row.programType, row.assessmentType) },
      { label: "Review Year", value: payloadText(payload, "reviewYear") ?? "Baseline" },
      { label: "Training Session", value: payloadText(payload, "trainingSessionName") ?? "-" },
      { label: "Total Questions Unanswered", value: String(payloadInt(payload, "totalQuestionsUnanswered") ?? 0) },
      { label: "Created Date and Time", value: formatDateTime(row.createdAt) },
    ],
    detailsRight: [
      { label: "School", value: text(row.schoolName), href: `/portal/schools/${row.schoolId}` },
      { label: "Contact", value: payloadText(payload, "assessmentContactName") ?? "-" },
      { label: "Assessor", value: payloadText(payload, "assessmentAssessorName", "assessor") ?? text(row.assessor) },
      { label: "Language", value: payloadText(payload, "assessmentLanguage") ?? "English" },
      { label: "Data Collection Date", value: formatDate(row.assessmentDate) },
      { label: "Collection Method", value: payloadText(payload, "collectionMethod") ?? "Form-based" },
      { label: "Model Version", value: text(row.modelVersion) },
      { label: "Benchmark Version", value: text(row.benchmarkVersion) },
      { label: "Scoring Profile Version", value: text(row.scoringProfileVersion) },
      { label: "Last Modified By", value: text(row.updatedByName) },
      { label: "Updated At", value: formatDateTime(row.updatedAt) },
    ],
    tabs: [
      {
        id: "responses",
        label: "Assessment Responses",
        emptyLabel: "No learner response summaries linked yet.",
        items: recordsResult.rows.map((item) =>
          activity(
            Number(item.id),
            text(item.title),
            `Reading stage: ${text(item.stage)}`,
            `Story reading ${text(item.storyReadingScore)} • Comprehension ${text(item.comprehensionScore)}`,
            formatDateTime(item.createdAt),
          ),
        ),
      },
    ],
    sidebarCards: [
      {
        title: "Assessment Summary",
        items: [
          { label: "School Code", value: text(row.schoolCode) },
          { label: "Class Grade", value: text(row.classGrade) },
          { label: "Item Responses", value: formatNumber(responsesResult.rows[0]?.total) },
          { label: "Files", value: formatNumber(filesResult.rows[0]?.total) },
        ],
      },
    ],
  };
}

export async function listVisitCrmRows(): Promise<PortalCrmListViewModel> {
  const result = await queryPostgres(
    `
      SELECT
        pr.id,
        pr.record_code AS "recordCode",
        pr.date::text AS date,
        pr.status,
        pr.school_name AS "schoolName",
        COALESCE(pr.payload_json, '{}') AS "payloadJson",
        cv.visit_type AS "visitType",
        cv.visit_pathway AS "visitPathway",
        sd.country,
        pu.full_name AS observer
      FROM portal_records pr
      LEFT JOIN coaching_visits cv ON cv.portal_record_id = pr.id
      LEFT JOIN schools_directory sd ON sd.id = pr.school_id
      LEFT JOIN portal_users pu ON pu.id = cv.coach_user_id
      WHERE pr.module = 'visit'
        AND pr.deleted_at IS NULL
      ORDER BY pr.date DESC, pr.updated_at DESC
      LIMIT 500
    `,
  );

  return {
    badge: "School Visits",
    title: "All School Visits",
    subtitle: "Coaching visits, implementation checks, and leadership meetings linked directly to school accounts.",
    primaryActionLabel: "Open Visit Form Workspace",
    primaryActionHref: "/portal/visits/manage",
    secondaryActionLabel: "Visit Reports",
    secondaryActionHref: "/portal/reports?module=visit",
    columns: [
      { key: "name", label: "Visit Record" },
      { key: "school", label: "School" },
      { key: "date", label: "Visit Date" },
      { key: "observer", label: "Coach / Observer" },
      { key: "country", label: "Country" },
      { key: "pathway", label: "Pathway" },
      { key: "status", label: "Status" },
    ],
    rows: result.rows.map((row) => {
      const payload = safeJson(row.payloadJson);
      return {
        id: Number(row.id),
        href: `/portal/visits/${row.id}`,
        cells: {
          name: buildCell(text(row.recordCode), `/portal/visits/${row.id}`),
          school: buildCell(row.schoolName),
          date: buildCell(formatDate(row.date)),
          observer: buildCell(payloadText(payload, "coachObserver") ?? row.observer),
          country: buildCell(row.country ?? "Uganda"),
          pathway: buildCell(row.visitPathway ?? payloadText(payload, "visitPathway") ?? row.visitType),
          status: buildCell(row.status),
        },
      };
    }),
  };
}

export async function getVisitCrmProfile(id: number): Promise<PortalCrmProfileViewModel | null> {
  const row = await getPortalRecordBase("visit", id);
  if (!row) {
    return null;
  }
  const payload = safeJson(row.payloadJson);
  const [visitResult, participantCount, evaluationCount, filesCount] = await Promise.all([
    queryPostgres(
      `
        SELECT
          cv.visit_type AS "visitType",
          cv.visit_pathway AS "visitPathway",
          cv.coaching_cycle_number AS "coachingCycleNumber",
          cv.implementation_status AS "implementationStatus",
          vd.demo_focus AS "demoFocus",
          vd.daily_reading_time_minutes AS "dailyReadingTimeMinutes",
          vlm.next_visit_date::text AS "nextVisitDate",
          vlm.summary_text AS "meetingSummary"
        FROM coaching_visits cv
        LEFT JOIN visit_demo vd ON vd.visit_id = cv.id
        LEFT JOIN visit_leadership_meeting vlm ON vlm.visit_id = cv.id
        WHERE cv.portal_record_id = $1
        LIMIT 1
      `,
      [id],
    ),
    queryPostgres<{ total: number }>(
      `
        SELECT COUNT(*)::int AS total
        FROM visit_participants vp
        JOIN coaching_visits cv ON cv.id = vp.visit_id
        WHERE cv.portal_record_id = $1
      `,
      [id],
    ),
    queryPostgres<{ total: number }>(
      `
        SELECT COUNT(*)::int AS total
        FROM lesson_evaluations le
        WHERE le.school_id = $1 AND le.lesson_date = $2::date AND le.status != 'void'
      `,
      [row.schoolId ?? -1, row.date],
    ),
    queryPostgres<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM portal_evidence WHERE record_id = $1 AND module = 'visit'`,
      [id],
    ),
  ]);
  const visit = (visitResult.rows[0] ?? {}) as Record<string, unknown>;
  return {
    badge: "School Visit",
    title: text(row.recordCode),
    subtitle: `${text(row.schoolName)} • ${formatDate(row.date)} • ${text(row.status)}`,
    heroFields: [
      { label: "School", value: text(row.schoolName), href: `/portal/schools/${row.schoolId}` },
      { label: "Visit Date", value: formatDate(row.date) },
      { label: "Coach / Observer", value: payloadText(payload, "coachObserver") ?? text(row.createdByName) },
      { label: "Pathway", value: text(visit.visitPathway ?? payloadText(payload, "visitPathway")) },
    ],
    primaryActions: [
      { label: "Visit Workspace", href: "/portal/visits/manage", tone: "ghost" },
      { label: "School Account", href: `/portal/schools/${row.schoolId}` },
    ],
    notice: "Visit profiles combine implementation checks, coaching notes, demo follow-through, and leadership meeting evidence from PostgreSQL.",
    quickLinks: [
      { label: "Participants", count: whole(participantCount.rows[0]?.total), href: "#participants", icon: "PT" },
      { label: "Teacher Evaluations", count: whole(evaluationCount.rows[0]?.total), href: `/portal/schools/${row.schoolId}/teachers`, icon: "TE" },
      { label: "Files", count: whole(filesCount.rows[0]?.total), href: `/portal/reports?module=visit&search=${encodeURIComponent(text(row.recordCode))}`, icon: "FL" },
      { label: "School Account", count: 1, href: `/portal/schools/${row.schoolId}`, icon: "SC" },
    ],
    detailsLeft: [
      { label: "Visit Record", value: text(row.recordCode) },
      { label: "School", value: text(row.schoolName), href: `/portal/schools/${row.schoolId}` },
      { label: "Visit Type", value: text(visit.visitType, text(row.programType)) },
      { label: "Visit Date", value: formatDate(row.date) },
      { label: "Start Time", value: payloadText(payload, "startTime") ?? "-" },
      { label: "End Time", value: payloadText(payload, "endTime") ?? "-" },
      { label: "Teacher Observed", value: payloadText(payload, "teacherObserved") ?? "-" },
      { label: "Class Observed", value: payloadText(payload, "classLevel") ?? "-" },
      { label: "Lesson Focus", value: listFromValue(payload.lessonFocusAreas).join(", ") || "-" },
      { label: "Implementation Status", value: text(visit.implementationStatus) },
      { label: "Pathway", value: text(visit.visitPathway) },
    ],
    detailsRight: [
      { label: "Coach / Observer", value: payloadText(payload, "coachObserver") ?? text(row.createdByName) },
      { label: "Coaching Cycle", value: text(visit.coachingCycleNumber) },
      { label: "Demo Focus", value: text(visit.demoFocus) },
      { label: "Daily Reading Time", value: text(visit.dailyReadingTimeMinutes ? `${visit.dailyReadingTimeMinutes} min` : "-") },
      { label: "Next Visit Date", value: formatDate(visit.nextVisitDate) },
      { label: "Leadership Summary", value: text(visit.meetingSummary) },
      { label: "Findings", value: payloadText(payload, "strengthsObserved", "insightsKeyFindings") ?? "-" },
      { label: "Challenges", value: payloadText(payload, "gapsIdentified", "insightsChallenges") ?? "-" },
      { label: "Action Points", value: payloadText(payload, "teacherActions", "insightsConclusionsNextSteps") ?? "-" },
      { label: "Workflow Status", value: text(row.status) },
      { label: "Review Note", value: text(row.reviewNote) },
    ],
    tabs: [
      {
        id: "implementation",
        label: "Implementation Notes",
        emptyLabel: "No implementation notes captured yet.",
        items: [
          activity(
            `implementation-${id}`,
            payloadText(payload, "leadershipSummary", "coachingProvided") ?? "Implementation note",
            payloadText(payload, "leadershipAgreements", "teacherActions"),
            payloadText(payload, "leadershipRisks", "gapsIdentified"),
            formatDate(row.date),
          ),
        ].filter((item) => item.title !== "Implementation note" || item.subtitle || item.meta),
      },
    ],
    sidebarCards: [
      {
        title: "Visit Summary",
        items: [
          { label: "School Code", value: text(row.schoolCode) },
          { label: "Participants", value: formatNumber(participantCount.rows[0]?.total) },
          { label: "Teacher Evaluations", value: formatNumber(evaluationCount.rows[0]?.total) },
          { label: "Evidence Files", value: formatNumber(filesCount.rows[0]?.total) },
        ],
      },
    ],
  };
}

export async function listStoryProjectCrmRows(): Promise<PortalCrmListViewModel> {
  const result = await queryPostgres(
    `
      SELECT
        pr.id,
        pr.record_code AS "recordCode",
        pr.date::text AS date,
        pr.status,
        pr.school_name AS "schoolName",
        COALESCE(pr.payload_json, '{}') AS "payloadJson",
        COALESCE(sd.country, 'Uganda') AS country,
        sd.region
      FROM portal_records pr
      LEFT JOIN schools_directory sd ON sd.id = pr.school_id
      WHERE pr.module = 'story'
        AND pr.deleted_at IS NULL
      ORDER BY pr.date DESC, pr.updated_at DESC
      LIMIT 500
    `,
  );

  return {
    badge: "1001 Story Project",
    title: "1001 Story Project Records",
    subtitle: "Story-support sessions, draft reviews, and anthology readiness records linked to school accounts.",
    primaryActionLabel: "Open 1001 Story Form Workspace",
    primaryActionHref: "/portal/story/manage",
    secondaryActionLabel: "Story Library",
    secondaryActionHref: "/portal/stories",
    columns: [
      { key: "name", label: "Project Session" },
      { key: "school", label: "School" },
      { key: "date", label: "Session Date" },
      { key: "activity", label: "Activity Type" },
      { key: "learners", label: "Learners Involved" },
      { key: "drafts", label: "Stories Drafted" },
      { key: "approved", label: "Stories Approved" },
    ],
    rows: result.rows.map((row) => {
      const payload = safeJson(row.payloadJson);
      return {
        id: Number(row.id),
        href: `/portal/story/${row.id}`,
        cells: {
          name: buildCell(text(row.recordCode), `/portal/story/${row.id}`),
          school: buildCell(row.schoolName),
          date: buildCell(formatDate(row.date)),
          activity: buildCell(payloadText(payload, "theme", "editingStatus") ?? text(row.recordCode)),
          learners: buildCell(String(payloadInt(payload, "learnersInvolved") ?? 0)),
          drafts: buildCell(String(payloadInt(payload, "storiesDrafted") ?? 0)),
          approved: buildCell(String(payloadInt(payload, "storiesApproved") ?? 0)),
        },
      };
    }),
  };
}

export async function getStoryProjectCrmProfile(id: number): Promise<PortalCrmProfileViewModel | null> {
  const row = await getPortalRecordBase("story", id);
  if (!row) {
    return null;
  }
  const payload = safeJson(row.payloadJson);
  const [storyActivityCount, publishedStoriesCount, storyList] = await Promise.all([
    queryPostgres<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM story_activities WHERE portal_record_id = $1 OR school_id = $2 AND date = $3::date`,
      [id, row.schoolId ?? -1, row.date],
    ),
    queryPostgres<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM story_library WHERE school_id = $1 AND publish_status = 'published' AND consent_status = 'approved'`,
      [row.schoolId ?? -1],
    ),
    queryPostgres(
      `
        SELECT
          sl.id,
          sl.title,
          sl.grade,
          sl.language,
          sl.publish_status AS status,
          sl.created_at::text AS "createdAt"
        FROM story_library sl
        WHERE sl.school_id = $1
        ORDER BY sl.created_at DESC
        LIMIT 20
      `,
      [row.schoolId ?? -1],
    ),
  ]);

  const learnersInvolved = payloadInt(payload, "learnersInvolved") ?? 0;
  return {
    badge: "1001 Story Project",
    title: payloadText(payload, "storyProjectName", "trainingName", "theme") ?? text(row.recordCode),
    subtitle: `${text(row.schoolName)} • ${text(row.recordCode)} • ${text(row.status)}`,
    heroFields: [
      { label: "School", value: text(row.schoolName), href: `/portal/schools/${row.schoolId}` },
      { label: "Session Date", value: formatDate(row.date) },
      { label: "Activity Type", value: text(row.programType) },
      { label: "Learners Involved", value: String(learnersInvolved) },
    ],
    primaryActions: [
      { label: "1001 Story Workspace", href: "/portal/story/manage", tone: "ghost" },
      { label: "Story Library", href: "/portal/stories" },
    ],
    notice: "1001 Story project records are linked to school account progress, draft counts, and published story outputs in PostgreSQL.",
    quickLinks: [
      { label: "Story Activities", count: whole(storyActivityCount.rows[0]?.total), href: "/portal/story", icon: "SA" },
      { label: "Published Stories", count: whole(publishedStoriesCount.rows[0]?.total), href: `/stories?schoolId=${row.schoolId}`, icon: "PB" },
      { label: "School Account", count: 1, href: `/portal/schools/${row.schoolId}`, icon: "SC" },
      { label: "Evidence Files", count: 0, href: `/portal/reports?module=story&search=${encodeURIComponent(text(row.recordCode))}`, icon: "FL" },
    ],
    detailsLeft: [
      { label: "Project Session", value: text(row.recordCode) },
      { label: "School", value: text(row.schoolName), href: `/portal/schools/${row.schoolId}` },
      { label: "Activity Type", value: text(row.programType) },
      { label: "Theme Used", value: payloadText(payload, "theme") ?? "-" },
      { label: "Grades", value: payloadText(payload, "grades") ?? "-" },
      { label: "Learners Involved", value: String(learnersInvolved) },
      { label: "Stories Drafted", value: String(payloadInt(payload, "storiesDrafted") ?? 0) },
      { label: "Stories Received", value: String(payloadInt(payload, "storiesReceived") ?? 0) },
    ],
    detailsRight: [
      { label: "Teacher Support Given", value: payloadText(payload, "teacherSupportGiven") ?? "-" },
      { label: "Project Lead", value: payloadText(payload, "projectLead") ?? "-" },
      { label: "Mentor Contacts", value: payloadText(payload, "mentorContacts") ?? "-" },
      { label: "Editing Status", value: payloadText(payload, "editingStatus") ?? "-" },
      { label: "Book Status", value: payloadText(payload, "bookStatus") ?? "-" },
      { label: "Anthology Stage", value: payloadText(payload, "anthologyStage") ?? "-" },
      { label: "Stories Approved", value: String(payloadInt(payload, "storiesApproved") ?? 0) },
      { label: "Common Gaps", value: listFromValue(payload.commonGaps).join(", ") || "-" },
      { label: "Next Steps", value: payloadText(payload, "nextSteps", "insightsConclusionsNextSteps") ?? "-" },
      { label: "Workflow Status", value: text(row.status) },
      { label: "Created At", value: formatDateTime(row.createdAt) },
    ],
    tabs: [
      {
        id: "library",
        label: "Story Library",
        emptyLabel: "No school stories have been linked yet.",
        items: storyList.rows.map((item) =>
          activity(
            Number(item.id),
            text(item.title),
            `${text(item.grade)} • ${text(item.language)}`,
            text(item.status),
            formatDateTime(item.createdAt),
            `/portal/stories`,
          ),
        ),
      },
    ],
    sidebarCards: [
      {
        title: "Project Output",
        items: [
          { label: "Published Stories", value: formatNumber(publishedStoriesCount.rows[0]?.total) },
          { label: "Story Activities", value: formatNumber(storyActivityCount.rows[0]?.total) },
          { label: "District", value: text(row.district) },
          { label: "School Code", value: text(row.schoolCode) },
        ],
      },
    ],
  };
}
