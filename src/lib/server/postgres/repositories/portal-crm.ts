import type {
  CrmActivityItem,
  CrmListCell,
  PortalCrmListViewModel,
  PortalCrmProfileViewModel,
} from "@/lib/portal-crm-types";
import { queryPostgres } from "@/lib/server/postgres/client";
import { displayRegion } from "@/lib/uganda-locations";

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

function formatBool(value: unknown) {
  return value ? "Yes" : "No";
}

function lastToken(value: unknown) {
  const normalized = text(value, "");
  if (!normalized) {
    return "-";
  }
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens[tokens.length - 1] ?? normalized;
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
      { key: "region", label: "Region" },
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
      const trainingRegion = payloadText(payload, "trainingRegion") ?? displayRegion(row.region as string | undefined) ?? "-";
      return {
        id: Number(row.id),
        href: `/portal/trainings/${row.id}`,
        cells: {
          name: buildCell(title, `/portal/trainings/${row.id}`),
          organization: buildCell(organization),
          date: buildCell(formatDate(row.date)),
          presenter: buildCell(presenter),
          country: buildCell(row.country ?? "Uganda"),
          region: buildCell(trainingRegion),
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
  const [
    attendanceResult,
    filesResult,
    participantResult,
    relatedCountsResult,
    linkedActivityResult,
    schoolProgressResult,
    feedbackResult,
    schoolsImpactedResult,
    feedbackCountResult,
  ] = await Promise.all([
    queryPostgres(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE invited IS TRUE)::int AS invited,
          COUNT(*) FILTER (WHERE confirmed IS TRUE)::int AS confirmed,
          COUNT(*) FILTER (WHERE attended IS TRUE)::int AS attended,
          COUNT(*) FILTER (WHERE participant_role = 'Classroom teacher' AND attended IS TRUE)::int AS teachers,
          COUNT(*) FILTER (WHERE participant_role = 'School Leader' AND attended IS TRUE)::int AS leaders,
          COUNT(*) FILTER (WHERE lower(COALESCE(gender, '')) = 'female' AND attended IS TRUE)::int AS female,
          COUNT(*) FILTER (WHERE lower(COALESCE(gender, '')) = 'male' AND attended IS TRUE)::int AS male
        FROM portal_training_attendance
        WHERE portal_record_id = $1
      `,
      [id],
    ),
    queryPostgres<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM portal_evidence WHERE record_id = $1 AND module = 'training'`,
      [id],
    ),
    queryPostgres(
      `
        SELECT
          pta.id,
          COALESCE(pta.participant_code, 'TP-' || pta.portal_record_id::text || '-' || pta.id::text) AS "participantCode",
          pta.contact_id AS "contactId",
          pta.participant_name AS "participantName",
          COALESCE(pta.role_at_time, pta.participant_role) AS role,
          COALESCE(pta.school_name_snapshot, sd.name, '') AS "linkedSchoolName",
          pta.invited,
          pta.confirmed,
          pta.attended,
          COALESCE(pta.email, sc.email, '') AS email,
          COALESCE(pta.mobile_number, pta.phone, sc.phone, '') AS "mobileNumber",
          COALESCE(pta.participant_type, 'In Person') AS "participantType",
          pta.created_at::text AS "createdAt"
        FROM portal_training_attendance pta
        LEFT JOIN school_contacts sc ON sc.contact_id = pta.contact_id
        LEFT JOIN schools_directory sd ON sd.id = pta.school_id
        WHERE pta.portal_record_id = $1
        ORDER BY COALESCE(pta.role_at_time, pta.participant_role) ASC, pta.participant_name ASC
        LIMIT 120
      `,
      [id],
    ),
    queryPostgres(
      `
        SELECT
          (SELECT COUNT(*)::int FROM coaching_visits WHERE school_id = $1) AS visits,
          (SELECT COUNT(*)::int FROM assessment_sessions WHERE school_id = $1) AS assessments,
          (SELECT COUNT(*)::int FROM lesson_evaluations WHERE school_id = $1 AND status != 'void') AS evaluations,
          (SELECT COUNT(*)::int FROM story_activities WHERE school_id = $1) AS storyProjects
      `,
      [row.schoolId ?? -1],
    ),
    queryPostgres(
      `
        SELECT *
        FROM (
          SELECT
            pr.id,
            pr.module,
            COALESCE(NULLIF(pr.program_type, ''), initcap(pr.module)) AS title,
            pr.record_code AS "recordCode",
            pr.date::text AS date,
            pr.status
          FROM portal_records pr
          WHERE pr.school_id = $1
            AND pr.id <> $2
            AND pr.module IN ('visit', 'assessment', 'story')

          UNION ALL

          SELECT
            le.id,
            'teacherEvaluation' AS module,
            COALESCE(NULLIF(le.overall_level, ''), 'Lesson Evaluation') AS title,
            COALESCE(le.teacher_uid, '') AS "recordCode",
            le.lesson_date::text AS date,
            le.status
          FROM lesson_evaluations le
          WHERE le.school_id = $1
            AND le.status != 'void'
        ) linked
        ORDER BY linked.date DESC NULLS LAST, linked.id DESC
        LIMIT 24
      `,
      [row.schoolId ?? -1, id],
    ),
    queryPostgres(
      `
        SELECT
          COUNT(*)::int AS assessed,
          ROUND(AVG(COALESCE(story_reading_score, 0))::numeric, 1) AS "storyReadingAvg",
          ROUND(AVG(COALESCE(reading_comprehension_score, 0))::numeric, 1) AS "comprehensionAvg",
          ROUND(AVG(COALESCE(computed_level_band, 0))::numeric, 2) AS "readingLevelBandAvg",
          ROUND(
            (
              COUNT(*) FILTER (
                WHERE lower(COALESCE(expected_vs_actual_status, '')) IN ('at_expected', 'above_expected')
              )::numeric / NULLIF(COUNT(*)::numeric, 0)
            ) * 100,
            1
          ) AS "onBenchmarkPct"
        FROM assessment_records
        WHERE school_id = $1
      `,
      [row.schoolId ?? -1],
    ),
    queryPostgres(
      `
        SELECT
          ptf.id,
          ptf.effectiveness_rating AS "effectivenessRating",
          ptf.feedback_text AS "feedbackText",
          ptf.follow_up_recommendations AS "followUpRecommendations",
          pta.participant_name AS "participantName",
          pu.full_name AS "createdByName",
          ptf.created_at::text AS "createdAt"
        FROM portal_training_feedback ptf
        LEFT JOIN portal_training_attendance pta ON pta.id = ptf.participant_id
        LEFT JOIN portal_users pu ON pu.id = ptf.created_by_user_id
        WHERE ptf.portal_record_id = $1
        ORDER BY ptf.created_at DESC
        LIMIT 50
      `,
      [id],
    ).catch(() => ({ rows: [] as Array<Record<string, unknown>> })),
    /* Schools impacted: count distinct schools from which participants attended */
    queryPostgres<{ total: number }>(
      `SELECT COUNT(DISTINCT school_id)::int AS total FROM portal_training_attendance WHERE portal_record_id = $1 AND school_id IS NOT NULL`,
      [id],
    ),
    /* Feedback entries: count rows in portal_training_feedback */
    queryPostgres<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM portal_training_feedback WHERE portal_record_id = $1`,
      [id],
    ).catch(() => ({ rows: [{ total: 0 }] })),
  ]);

  const attended = whole(attendanceResult.rows[0]?.attended);
  const invited = whole(attendanceResult.rows[0]?.invited);
  const confirmed = whole(attendanceResult.rows[0]?.confirmed);
  const trainingName = payloadText(payload, "trainingName") ?? text(row.recordCode);
  const presenter = payloadText(payload, "trainingPresenter", "facilitators") ?? text(row.createdByName);
  const organization = payloadText(payload, "trainingOrganization", "sponsoredBy") ?? text(row.schoolName);
  const trainingType = payloadText(payload, "deliveryMode") ?? "In Person";
  const venue = payloadText(payload, "trainingVenue") ?? text(row.schoolName);
  const language = payloadText(payload, "trainingLanguage") ?? "English";
  const audience = payloadText(payload, "audience") ?? "Both";
  const objectives = listFromValue(payload.objectivesCovered).join(", ") || "-";
  const modulesDelivered = listFromValue(payload.modulesDelivered).join(", ") || "-";
  const trainerRecommendations = listFromValue(payload.trainerRecommendations).join(", ") || "-";
  const trainingRegion = payloadText(payload, "trainingRegion") ?? displayRegion(row.region as string | undefined) ?? "-";
  const trainingSubRegion = payloadText(payload, "trainingSubRegion") ?? text(row.subRegion);
  const trainingDistrict = payloadText(payload, "trainingDistrict") ?? text(row.district);
  const totalInvited =
    payloadInt(payload, "totalInvited") ??
    (invited > 0 ? invited : whole(attendanceResult.rows[0]?.total));
  const relatedCounts = relatedCountsResult.rows[0] as Record<string, unknown> | undefined;
  const progress = schoolProgressResult.rows[0] as Record<string, unknown> | undefined;

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
      { label: "Add Participant", href: `/portal/trainings/participants/new?trainingId=${id}&schoolId=${row.schoolId}` },
      { label: "Training Workspace", href: "/portal/trainings/manage", tone: "ghost" as const },
      { label: "School Account", href: `/portal/schools/${row.schoolId}`, tone: "ghost" as const },
    ],
    notice: "Training data is linked to the school account, participant roster, evidence files, and follow-up workflow.",
    quickLinks: [
      { label: "Participants", count: whole(attendanceResult.rows[0]?.total), href: "#participants", icon: "TR" },
      { label: "Feedback", count: whole(feedbackCountResult.rows[0]?.total), href: "#feedback", icon: "FL" },
      { label: "Schools Impacted", count: whole(schoolsImpactedResult.rows[0]?.total), href: `/portal/schools/${row.schoolId}`, icon: "SC" },
      { label: "Learners Assessed", count: whole(progress?.assessed), href: `/portal/assessments?school=${encodeURIComponent(text(row.schoolName))}`, icon: "AS" },
      { label: "School Visits", count: whole(relatedCounts?.visits), href: `/portal/visits?school=${encodeURIComponent(text(row.schoolName))}`, icon: "VS" },
      { label: "Teacher Evaluations", count: whole(relatedCounts?.evaluations), href: `/portal/schools/${row.schoolId}/teachers`, icon: "TE" },
    ],
    detailsLeft: [
      { label: "Training Session Name", value: trainingName },
      { label: "Country", value: text(row.country, "Uganda") },
      { label: "Region", value: trainingRegion },
      { label: "Sub-Region", value: trainingSubRegion },
      { label: "District", value: trainingDistrict },
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
      { label: "Confirmed", value: String(confirmed) },
      { label: "Attended", value: String(attended) },
      { label: "Female Attended", value: formatNumber(attendanceResult.rows[0]?.female) },
      { label: "Male Attended", value: formatNumber(attendanceResult.rows[0]?.male) },
      { label: "Teachers Trained", value: formatNumber(attendanceResult.rows[0]?.teachers) },
      { label: "School Leaders Trained", value: formatNumber(attendanceResult.rows[0]?.leaders) },
      { label: "Trainer Recommendations", value: trainerRecommendations },
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
        columns: [
          { key: "participantCode", label: "Participant Code" },
          { key: "name", label: "Participant Name" },
          { key: "lastName", label: "Last Name" },
          { key: "school", label: "Contact's School" },
          { key: "role", label: "Contact Role" },
          { key: "invited", label: "Invited" },
          { key: "confirmed", label: "Confirmed" },
          { key: "attended", label: "Attended" },
          { key: "email", label: "Email" },
          { key: "mobile", label: "Mobile Number" },
          { key: "participantType", label: "Participant Type" },
        ],
        rows: participantResult.rows.map((item) => ({
          id: Number(item.id),
          cells: {
            participantCode: buildCell(item.participantCode),
            name: buildCell(
              item.participantName,
              item.contactId ? `/portal/contacts/${item.contactId}` : null,
            ),
            lastName: buildCell(lastToken(item.participantName)),
            school: buildCell(item.linkedSchoolName),
            role: buildCell(item.role),
            invited: buildCell(formatBool(item.invited)),
            confirmed: buildCell(formatBool(item.confirmed)),
            attended: buildCell(formatBool(item.attended)),
            email: buildCell(item.email),
            mobile: buildCell(item.mobileNumber),
            participantType: buildCell(item.participantType),
          },
        })),
      },
      {
        id: "linked-activity",
        label: "Linked Activity Chain",
        emptyLabel: "No linked visits, assessments, teacher evaluations, or story activities found for this school yet.",
        items: linkedActivityResult.rows.map((item) =>
          activity(
            `${item.module}-${item.id}`,
            text(item.title),
            text(item.recordCode),
            text(item.module === "teacherEvaluation" ? "Teacher evaluation" : item.module),
            formatDate(item.date),
            item.module === "visit"
              ? `/portal/visits/${item.id}`
              : item.module === "assessment"
                ? `/portal/assessments/${item.id}`
                : item.module === "story"
                  ? `/portal/story/${item.id}`
                  : `/portal/schools/${row.schoolId}/teachers/${encodeURIComponent(text(item.recordCode, ""))}/improvement`,
            text(item.status),
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
      {
        id: "feedback",
        label: "Training Feedback",
        emptyLabel: "No participant feedback has been submitted for this training yet.",
        columns: [
          { key: "participant", label: "Participant" },
          { key: "rating", label: "Effectiveness Rating" },
          { key: "feedback", label: "Feedback" },
          { key: "recommendations", label: "Follow-up Recommendations" },
          { key: "submittedBy", label: "Submitted By" },
          { key: "date", label: "Date" },
        ],
        rows: (feedbackResult.rows as Array<Record<string, unknown>>).map((item) => ({
          id: Number(item.id),
          cells: {
            participant: buildCell(item.participantName ?? "Session-level"),
            rating: buildCell(item.effectivenessRating ? `${item.effectivenessRating}/5` : "-"),
            feedback: buildCell(item.feedbackText),
            recommendations: buildCell(item.followUpRecommendations),
            submittedBy: buildCell(item.createdByName),
            date: buildCell(formatDate(item.createdAt)),
          },
        })),
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
          { label: "Evidence Files", value: formatNumber(filesResult.rows[0]?.total) },
        ],
      },
      {
        title: "Literacy Progress Snapshot",
        items: [
          { label: "Learners Assessed", value: formatNumber(progress?.assessed) },
          { label: "Story Reading Avg", value: text(progress?.storyReadingAvg, "Data not available") },
          { label: "Comprehension Avg", value: text(progress?.comprehensionAvg, "Data not available") },
          { label: "Reading Level Band Avg", value: text(progress?.readingLevelBandAvg, "Data not available") },
          {
            label: "At / Above Benchmark",
            value:
              progress?.onBenchmarkPct === null || progress?.onBenchmarkPct === undefined
                ? "Data not available"
                : `${progress.onBenchmarkPct}%`,
          },
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

  const isTeacher = row.contactRecordType === 'Teacher' || row.teacherUid || String(row.roleTitle).toLowerCase().includes('teacher');

  const [trainingCount, visitCount, storyCount, evaluationCount, linkedRows, performanceResult] = await Promise.all([
    queryPostgres<{ total: number }>(`SELECT COUNT(*)::int AS total FROM portal_training_attendance WHERE contact_id = $1`, [id]),
    queryPostgres<{ total: number }>(`SELECT COUNT(*)::int AS total FROM visit_participants WHERE contact_id = $1`, [id]),
    queryPostgres<{ total: number }>(`SELECT COUNT(*)::int AS total FROM story_activity_participants WHERE contact_id = $1`, [id]),
    queryPostgres<{ total: number }>(`SELECT COUNT(*)::int AS total FROM lesson_evaluations WHERE teacher_uid = $1 AND status != 'void'`, [row.teacherUid || 'NONE']),
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
    isTeacher ? queryPostgres(`
      SELECT 
        COUNT(*)::int AS total_learners,
        ROUND(AVG(story_reading_score)::numeric, 1) as avg_reading,
        ROUND(AVG(reading_comprehension_score)::numeric, 1) as avg_comp
      FROM assessment_records
      WHERE teacher_name = $1 OR teacher_uid = $2
    `, [row.fullName, row.teacherUid]) : Promise.resolve({ rows: [] }),
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
      { label: "Edit Contact", href: `/portal/contacts/${id}/edit` },
      { label: "Add Contact to Training Session", href: `#add-to-training` },
      ...(isTeacher ? [
        { label: "New Evaluation", href: `/portal/schools/${row.schoolId}/teachers/${encodeURIComponent(text(row.teacherUid))}/improvement` },
        { label: "New Coaching", href: `/portal/visits?new=1&schoolId=${row.schoolId}&programType=Coaching+Visit` },
      ] : []),
      { label: "School Account", href: `/portal/schools/${row.schoolId}`, tone: "ghost" as const },
      { label: "Contact List", href: "/portal/contacts", tone: "ghost" as const },
    ],
    notice: text(row.isPrimaryContact ? "This contact is the primary account contact for the linked school." : "This contact is linked to the school account and can be attached to trainings, visits, and 1001 story activities."),
    quickLinks: [
      { label: "Trainings", count: whole(trainingCount.rows[0]?.total), href: `/portal/trainings?contact=${encodeURIComponent(text(row.fullName))}`, icon: "TR" },
      { label: "School Visits", count: whole(visitCount.rows[0]?.total), href: `/portal/visits?contact=${encodeURIComponent(text(row.fullName))}`, icon: "VS" },
      { label: "1001 Story", count: whole(storyCount.rows[0]?.total), href: `/portal/story?contact=${encodeURIComponent(text(row.fullName))}`, icon: "ST" },
      { label: "Assessments", count: whole(performanceResult.rows[0]?.total_learners), href: `/portal/assessments?school=${encodeURIComponent(text(row.schoolName))}`, icon: "AS" },
      { label: "Evaluations", count: whole(evaluationCount.rows[0]?.total), href: "#growth", icon: "TE" },
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
        items: (linkedRows.rows as Array<Record<string, unknown>>).map((item) =>
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
      ...(isTeacher ? [
        {
          id: "performance",
          label: "Learner Impact",
          emptyLabel: "No assessment data found for learners assigned to this teacher.",
          sidebarCards: [
            {
              title: "Performance Snapshot",
              items: [
                { label: "Learners Linked", value: String(performanceResult.rows[0]?.total_learners || 0) },
                { label: "Avg Reading Score", value: String(performanceResult.rows[0]?.avg_reading || 0) },
                { label: "Avg Comp Score", value: String(performanceResult.rows[0]?.avg_comp || 0) },
              ]
            }
          ]
        },
        {
          id: "growth",
          label: "Professional Growth",
          emptyLabel: "No evaluation or coaching history recorded for this teacher.",
          columns: [
            { key: "date", label: "Date" },
            { key: "activity", label: "Activity" },
            { key: "score", label: "Outcome/Level" },
            { key: "status", label: "Status" },
          ],
          rows: (linkedRows.rows as Array<{id: number, module: string, title: string, date: string, status: string}>)
            .filter(item => item.module === 'lessonEvaluation' || item.module === 'visit')
            .map(item => ({
              id: item.id,
              cells: {
                date: buildCell(formatDate(item.date)),
                activity: buildCell(item.title, item.module === 'visit' ? `/portal/visits/${item.id}` : null),
                score: buildCell(text(item.status)),
                status: buildCell(text(item.status))
              }
            }))
        }
      ] : [])
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
  const [responsesResult, filesResult, recordsResult, learnersCountResult] = await Promise.all([
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
    queryPostgres<{ total: number }>(
      `
        SELECT COUNT(*)::int AS total
        FROM assessment_records ar
        WHERE ar.source_portal_record_id = $1 OR (
          ar.school_id = $2 AND ar.assessment_date = $3::date AND ar.assessment_type = $4
        )
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
      { label: "Learners Assessed", count: whole(learnersCountResult.rows[0]?.total), href: "#results", icon: "LR" },
      { label: "Files", count: whole(filesResult.rows[0]?.total), href: `/portal/reports?module=learner-assessment&search=${encodeURIComponent(assessmentNumber)}`, icon: "FL" },
      { label: "Question Responses", count: whole(responsesResult.rows[0]?.total), href: "#responses", icon: "QR" },
      { label: "School Account", count: 1, href: `/portal/schools/${row.schoolId}`, icon: "SC" },
    ],
    detailsLeft: [
      { label: "Survey", value: payloadText(payload, "surveyName") ?? text(row.toolVersion, "Annual School Assessment (Core)") },
      { label: "Assessment Number", value: assessmentNumber },
      { label: "Status", value: text(row.status) },
      { label: "Type", value: text(row.programType, nullableText(row.assessmentType) ?? undefined) },
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
  const [
    visitResult,
    participantCount,
    evaluationCount,
    filesCount,
    participantRows,
    relatedCountsResult,
    relatedActivityRows,
    schoolProgressResult,
  ] = await Promise.all([
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
    queryPostgres(
      `
        SELECT
          vp.id,
          vp.contact_id AS "contactId",
          sc.full_name AS "fullName",
          COALESCE(sc.role_title, sc.category, vp.role_at_time) AS role,
          COALESCE(sc.phone, '') AS phone,
          COALESCE(sc.email, '') AS email,
          vp.attended,
          vp.created_at::text AS "createdAt"
        FROM visit_participants vp
        JOIN coaching_visits cv ON cv.id = vp.visit_id
        LEFT JOIN school_contacts sc ON sc.contact_id = vp.contact_id
        WHERE cv.portal_record_id = $1
        ORDER BY sc.full_name ASC
      `,
      [id],
    ),
    queryPostgres(
      `
        SELECT
          (SELECT COUNT(*)::int FROM portal_records WHERE module = 'training' AND school_id = $1) AS trainings,
          (SELECT COUNT(*)::int FROM assessment_sessions WHERE school_id = $1) AS assessments,
          (SELECT COUNT(*)::int FROM story_activities WHERE school_id = $1) AS storyProjects
      `,
      [row.schoolId ?? -1],
    ),
    queryPostgres(
      `
        SELECT *
        FROM (
          SELECT
            pr.id,
            pr.module,
            COALESCE(NULLIF(pr.program_type, ''), initcap(pr.module)) AS title,
            pr.record_code AS "recordCode",
            pr.date::text AS date,
            pr.status
          FROM portal_records pr
          WHERE pr.school_id = $1
            AND pr.id <> $2
            AND pr.module IN ('training', 'assessment', 'story')

          UNION ALL

          SELECT
            le.id,
            'teacherEvaluation' AS module,
            COALESCE(NULLIF(le.overall_level, ''), 'Lesson Evaluation') AS title,
            COALESCE(le.teacher_uid, '') AS "recordCode",
            le.lesson_date::text AS date,
            le.status
          FROM lesson_evaluations le
          WHERE le.school_id = $1
            AND le.status != 'void'
        ) linked
        ORDER BY linked.date DESC NULLS LAST, linked.id DESC
        LIMIT 24
      `,
      [row.schoolId ?? -1, id],
    ),
    queryPostgres(
      `
        SELECT
          COUNT(*)::int AS assessed,
          ROUND(AVG(COALESCE(story_reading_score, 0))::numeric, 1) AS "storyReadingAvg",
          ROUND(AVG(COALESCE(reading_comprehension_score, 0))::numeric, 1) AS "comprehensionAvg",
          ROUND(
            (
              COUNT(*) FILTER (
                WHERE lower(COALESCE(expected_vs_actual_status, '')) IN ('at_expected', 'above_expected')
              )::numeric / NULLIF(COUNT(*)::numeric, 0)
            ) * 100,
            1
          ) AS "onBenchmarkPct"
        FROM assessment_records
        WHERE school_id = $1
      `,
      [row.schoolId ?? -1],
    ),
  ]);
  const visit = (visitResult.rows[0] ?? {}) as Record<string, unknown>;
  const relatedCounts = relatedCountsResult.rows[0] as Record<string, unknown> | undefined;
  const progress = schoolProgressResult.rows[0] as Record<string, unknown> | undefined;
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
      { label: "New Assessment", href: `/portal/assessments?new=1&schoolId=${row.schoolId}` },
      { label: "New Evaluation", href: `/portal/schools/${row.schoolId}/teachers` },
      { label: "Visit Workspace", href: "/portal/visits/manage", tone: "ghost" as const },
      { label: "School Account", href: `/portal/schools/${row.schoolId}`, tone: "ghost" as const },
    ],
    notice: "Visit profiles combine implementation checks, coaching notes, demo follow-through, and leadership meeting evidence from PostgreSQL.",
    quickLinks: [
      { label: "Participants", count: whole(participantCount.rows[0]?.total), href: "#participants", icon: "PT" },
      { label: "Teacher Evaluations", count: whole(evaluationCount.rows[0]?.total), href: `/portal/schools/${row.schoolId}/teachers`, icon: "TE" },
      { label: "Files", count: whole(filesCount.rows[0]?.total), href: `/portal/reports?module=visit&search=${encodeURIComponent(text(row.recordCode))}`, icon: "FL" },
      { label: "Trainings", count: whole(relatedCounts?.trainings), href: `/portal/trainings?school=${encodeURIComponent(text(row.schoolName))}`, icon: "TR" },
      { label: "Assessments", count: whole(relatedCounts?.assessments), href: `/portal/assessments?school=${encodeURIComponent(text(row.schoolName))}`, icon: "AS" },
      { label: "1001 Story", count: whole(relatedCounts?.storyProjects), href: `/portal/story?school=${encodeURIComponent(text(row.schoolName))}`, icon: "ST" },
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
        id: "participants",
        label: "Participants",
        emptyLabel: "No contacts were marked on this visit.",
        columns: [
          { key: "name", label: "Participant Name" },
          { key: "role", label: "Role" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "attended", label: "Attended" },
          { key: "createdAt", label: "Linked At" },
        ],
        rows: participantRows.rows.map((item) => ({
          id: Number(item.id),
          cells: {
            name: buildCell(text(item.fullName), item.contactId ? `/portal/contacts/${item.contactId}` : null),
            role: buildCell(item.role),
            phone: buildCell(item.phone),
            email: buildCell(item.email),
            attended: buildCell(formatBool(item.attended)),
            createdAt: buildCell(formatDateTime(item.createdAt)),
          },
        })),
      },
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
      {
        id: "linked-activity",
        label: "Linked Activity Chain",
        emptyLabel: "No linked trainings, assessments, story activity, or teacher evaluations were found for this school.",
        items: relatedActivityRows.rows.map((item) =>
          activity(
            `${item.module}-${item.id}`,
            text(item.title),
            text(item.recordCode),
            text(item.module === "teacherEvaluation" ? "Teacher evaluation" : item.module),
            formatDate(item.date),
            item.module === "training"
              ? `/portal/trainings/${item.id}`
              : item.module === "assessment"
                ? `/portal/assessments/${item.id}`
                : item.module === "story"
                  ? `/portal/story/${item.id}`
                  : `/portal/schools/${row.schoolId}/teachers/${encodeURIComponent(text(item.recordCode, ""))}/improvement`,
            text(item.status),
          ),
        ),
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
      {
        title: "School Progress Snapshot",
        items: [
          { label: "Learners Assessed", value: formatNumber(progress?.assessed) },
          { label: "Story Reading Avg", value: text(progress?.storyReadingAvg, "Data not available") },
          { label: "Comprehension Avg", value: text(progress?.comprehensionAvg, "Data not available") },
          {
            label: "At / Above Benchmark",
            value:
              progress?.onBenchmarkPct === null || progress?.onBenchmarkPct === undefined
                ? "Data not available"
                : `${progress.onBenchmarkPct}%`,
          },
          { label: "Date of Visit", value: formatDate(row.date) },
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

export async function getEvaluationCrmProfile(id: number): Promise<PortalCrmProfileViewModel | null> {
  const result = await queryPostgres<{
    id: number;
    school_id: number;
    schoolName: string;
    schoolCode: string;
    district: string;
    teacher_uid: string;
    teacherName: string;
    teacherRole: string;
    grade: string;
    stream: string;
    class_size: number;
    lesson_date: string;
    lesson_focus_json: string;
    observerName: string;
    overall_score: number;
    overall_level: string;
    domain_scores_json: string;
    strengths_text: string;
    priority_gap_text: string;
    next_coaching_action: string;
    teacher_commitment: string;
    catchup_estimate_count: number;
    catchup_estimate_percent: number;
    next_visit_date: string;
    status: string;
    created_at: string;
  }>(
    `
      SELECT
        le.id,
        le.school_id,
        sd.name AS "schoolName",
        sd.school_code AS "schoolCode",
        sd.district,
        le.teacher_uid,
        tr.full_name AS "teacherName",
        tr.role_title AS "teacherRole",
        le.grade,
        le.stream,
        le.class_size,
        le.lesson_date::text AS "lesson_date",
        le.lesson_focus_json,
        pu.full_name AS "observerName",
        le.overall_score,
        le.overall_level,
        le.domain_scores_json,
        le.strengths_text,
        le.priority_gap_text,
        le.next_coaching_action,
        le.teacher_commitment,
        le.catchup_estimate_count,
        le.catchup_estimate_percent,
        le.next_visit_date::text AS "next_visit_date",
        le.status,
        le.created_at::text AS "created_at"
      FROM lesson_evaluations le
      JOIN schools_directory sd ON sd.id = le.school_id
      JOIN teacher_roster tr ON tr.teacher_uid = le.teacher_uid
      JOIN portal_users pu ON pu.id = le.observer_id
      WHERE le.id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const items = await queryPostgres<{
    domain_key: string;
    item_key: string;
    score: number;
    note: string;
  }>(
    `
      SELECT domain_key, item_key, score, note
      FROM lesson_evaluation_items
      WHERE evaluation_id = $1
      ORDER BY item_key
    `,
    [id],
  );

  const domainScores = safeJson(row.domain_scores_json);
  const lessonFocus = listFromValue(row.lesson_focus_json);

  return {
    badge: "Lesson Evaluation",
    title: `Lesson: ${row.teacherName}`,
    subtitle: `${row.grade} ${row.stream || ""} • ${formatDate(row.lesson_date)}`,
    heroFields: [
      { label: "Overall Level", value: text(row.overall_level) },
      { label: "Overall Score", value: `${whole(row.overall_score * 100)}%` },
      { label: "School", value: text(row.schoolName), href: `/portal/schools/${row.school_id}` },
      { label: "Observer", value: text(row.observerName) },
    ],
    primaryActions: [
      { label: "Print Evaluation", href: `/portal/reports/evaluation/${id}?print=1`, tone: "ghost" },
    ],
    notice: row.status === "void" ? "This evaluation has been voided and is excluded from impact metrics." : null,
    quickLinks: [
      { label: "Teacher Profile", count: 1, href: `/portal/schools/${row.school_id}/teachers/${row.teacher_uid}`, icon: "TR" },
      { label: "School Account", count: 1, href: `/portal/schools/${row.school_id}`, icon: "SC" },
      { label: "Assessments", count: 0, href: `/portal/assessments?teacherUid=${row.teacher_uid}`, icon: "AS" },
    ],
    detailsLeft: [
      { label: "Teacher", value: text(row.teacherName), href: `/portal/schools/${row.school_id}/teachers/${row.teacher_uid}` },
      { label: "Grade & Stream", value: `${row.grade} ${row.stream || ""}` },
      { label: "Class Size", value: String(row.class_size || 0) },
      { label: "Lesson Date", value: formatDate(row.lesson_date) },
      { label: "Lesson Focus", value: lessonFocus.join(", ") || "-" },
    ],
    detailsRight: [
      { label: "Status", value: text(row.status) },
      { label: "Teacher Commitment", value: text(row.teacher_commitment) },
      { label: "Catch-up Estimate", value: `${row.catchup_estimate_count || 0} (${row.catchup_estimate_percent || 0}%)` },
      { label: "Next Visit Date", value: formatDate(row.next_visit_date) },
      { label: "Created At", value: formatDateTime(row.created_at) },
    ],
    tabs: [
      {
        id: "scores",
        label: "Item Scores",
        emptyLabel: "No item-level scores recorded.",
        columns: [
          { key: "item", label: "Item" },
          { key: "domain", label: "Domain" },
          { key: "score", label: "Score" },
          { key: "note", label: "Note" },
        ],
        rows: items.rows.map((item) => ({
          id: item.item_key,
          cells: {
            item: { value: item.item_key },
            domain: { value: text(item.domain_key) },
            score: { value: String(item.score) },
            note: { value: text(item.note) },
          },
        })),
      },
      {
        id: "narrative",
        label: "Coaching Narrative",
        emptyLabel: "No narrative data.",
        items: [
          { id: "strengths", title: "Strengths", subtitle: text(row.strengths_text) },
          { id: "gaps", title: "Priority Gaps", subtitle: text(row.priority_gap_text) },
          { id: "action", title: "Next Coaching Action", subtitle: text(row.next_coaching_action) },
        ],
      },
    ],
    sidebarCards: [
      {
        title: "Domain Performance",
        items: Object.entries(domainScores).map(([domain, score]) => ({
          label: domain,
          value: `${Math.round(Number(score) * 100)}%`,
        })),
      },
    ],
  };
}

export async function listPublishedPortalTestimonialsPostgres(limit = 180): Promise<Record<string, unknown>[]> {
  const result = await queryPostgres(
    `
      SELECT
        pt.id,
        pt.storyteller_name AS "storytellerName",
        pt.storyteller_role AS "storytellerRole",
        pt.school_id AS "schoolId",
        pt.school_name AS "schoolName",
        pt.district,
        pt.story_text AS "storyText",
        pt.video_source_type AS "videoSourceType",
        pt.video_file_name AS "videoFileName",
        pt.video_stored_path AS "videoStoredPath",
        pt.video_mime_type AS "videoMimeType",
        pt.video_size_bytes AS "videoSizeBytes",
        pt.youtube_video_id AS "youtubeVideoId",
        pt.youtube_video_title AS "youtubeVideoTitle",
        pt.youtube_channel_title AS "youtubeChannelTitle",
        pt.youtube_thumbnail_url AS "youtubeThumbnailUrl",
        pt.youtube_embed_url AS "youtubeEmbedUrl",
        pt.youtube_watch_url AS "youtubeWatchUrl",
        pt.photo_file_name AS "photoFileName",
        pt.photo_stored_path AS "photoStoredPath",
        pt.photo_mime_type AS "photoMimeType",
        pt.photo_size_bytes AS "photoSizeBytes",
        pt.is_published AS "isPublished",
        pt.moderation_status AS "moderationStatus",
        pt.source_type AS "sourceType",
        pt.source_training_feedback_id AS "sourceTrainingFeedbackId",
        pt.source_training_record_id AS "sourceTrainingRecordId",
        pt.quote_field AS "quoteField",
        pt.created_by_user_id AS "createdByUserId",
        pu.full_name AS "createdByName",
        pt.created_at::text AS "createdAt"
      FROM portal_testimonials pt
      JOIN portal_users pu ON pu.id = pt.created_by_user_id
      WHERE pt.is_published IS TRUE
        AND COALESCE(pt.moderation_status, 'approved') = 'approved'
      ORDER BY pt.created_at DESC
      LIMIT $1
    `,
    [limit],
  );

  return result.rows.map((row) => ({
    ...row,
    id: Number(row.id),
  }));
}

export async function getPublishedPortalTestimonialByIdPostgres(id: number): Promise<Record<string, unknown> | null> {
  const result = await queryPostgres(
    `
      SELECT
        pt.id,
        pt.storyteller_name AS "storytellerName",
        pt.storyteller_role AS "storytellerRole",
        pt.school_id AS "schoolId",
        pt.school_name AS "schoolName",
        pt.district,
        pt.story_text AS "storyText",
        pt.video_source_type AS "videoSourceType",
        pt.video_file_name AS "videoFileName",
        pt.video_stored_path AS "videoStoredPath",
        pt.video_mime_type AS "videoMimeType",
        pt.video_size_bytes AS "videoSizeBytes",
        pt.youtube_video_id AS "youtubeVideoId",
        pt.youtube_video_title AS "youtubeVideoTitle",
        pt.youtube_channel_title AS "youtubeChannelTitle",
        pt.youtube_thumbnail_url AS "youtubeThumbnailUrl",
        pt.youtube_embed_url AS "youtubeEmbedUrl",
        pt.youtube_watch_url AS "youtubeWatchUrl",
        pt.photo_file_name AS "photoFileName",
        pt.photo_stored_path AS "photoStoredPath",
        pt.photo_mime_type AS "photoMimeType",
        pt.photo_size_bytes AS "photoSizeBytes",
        pt.is_published AS "isPublished",
        pt.moderation_status AS "moderationStatus",
        pt.source_type AS "sourceType",
        pt.source_training_feedback_id AS "sourceTrainingFeedbackId",
        pt.source_training_record_id AS "sourceTrainingRecordId",
        pt.quote_field AS "quoteField",
        pt.created_by_user_id AS "createdByUserId",
        pu.full_name AS "createdByName",
        pt.created_at::text AS "createdAt"
      FROM portal_testimonials pt
      JOIN portal_users pu ON pu.id = pt.created_by_user_id
      WHERE pt.id = $1
        AND pt.is_published IS TRUE
        AND COALESCE(pt.moderation_status, 'approved') = 'approved'
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    ...row,
    id: Number(row.id),
  };
}
