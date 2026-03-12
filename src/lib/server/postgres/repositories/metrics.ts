import { queryPostgres } from "@/lib/server/postgres/client";

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export async function getImpactSummaryPostgres() {
  const [
    teachersTrainedResult,
    trainingSessionsResult,
    onlineTrainingResult,
    legacyLearnersAssessedResult,
    newLearnersAssessedResult,
    storiesPublishedResult,
    enrolledLearnersResult,
    trainingSchoolRowsResult,
    portalRowsResult,
    bookingCountResult,
    contactCountResult,
    downloadCountResult,
    newsletterCountResult,
  ] = await Promise.all([
    queryPostgres(`SELECT COUNT(*)::int AS total FROM training_participants WHERE participant_role = 'Classroom teacher'`),
    queryPostgres(`SELECT COUNT(*)::int AS total FROM training_sessions`),
    queryPostgres(`SELECT COUNT(*)::int AS total, COALESCE(SUM(online_teachers_trained), 0)::int AS teachers FROM online_training_events`),
    queryPostgres(`SELECT COALESCE(SUM(learners_assessed), 0)::int AS total FROM legacy_assessment_records`),
    queryPostgres(`SELECT COUNT(*)::int AS total FROM assessment_records`),
    queryPostgres(`SELECT COALESCE(SUM(stories_published), 0)::int AS total FROM legacy_assessment_records`),
    queryPostgres(`
      SELECT COALESCE(
        SUM(
          CASE
            WHEN COALESCE(enrolled_boys, 0) + COALESCE(enrolled_girls, 0) > 0
              THEN COALESCE(enrolled_boys, 0) + COALESCE(enrolled_girls, 0)
            ELSE COALESCE(enrolled_learners, 0)
          END
        ),
        0
      )::int AS total
      FROM schools_directory
    `),
    queryPostgres(`
      SELECT
        id,
        lower(trim(name)) AS school_key,
        lower(trim(district)) AS district_key
      FROM schools_directory
      WHERE trim(COALESCE(name, '')) != ''
    `),
    queryPostgres(`
      SELECT
        module,
        school_id AS "schoolId",
        school_name AS "schoolName",
        district,
        payload_json AS "payloadJson"
      FROM portal_records
    `),
    queryPostgres(`SELECT COUNT(*)::int AS total FROM bookings`),
    queryPostgres(`SELECT COUNT(*)::int AS total FROM contacts`),
    queryPostgres(`SELECT COUNT(*)::int AS total FROM download_leads`),
    queryPostgres(`SELECT COUNT(*)::int AS total FROM newsletter_subscribers`),
  ]);

  const teachersTrained = toNumber(teachersTrainedResult.rows[0]?.total);
  const trainingSessionsCompleted = toNumber(trainingSessionsResult.rows[0]?.total);
  const onlineTrainingSessionsCompleted = toNumber(onlineTrainingResult.rows[0]?.total);
  const onlineTeachersTrained = toNumber(onlineTrainingResult.rows[0]?.teachers);
  const totalLearnersAssessed =
    toNumber(legacyLearnersAssessedResult.rows[0]?.total) + toNumber(newLearnersAssessedResult.rows[0]?.total);
  const storiesPublished = toNumber(storiesPublishedResult.rows[0]?.total);
  const enrolledLearners = toNumber(enrolledLearnersResult.rows[0]?.total);

  const schoolLookupByComposite = new Map<string, number>();
  const schoolLookupByName = new Map<string, number>();
  for (const row of trainingSchoolRowsResult.rows) {
    const schoolKey = String(row.school_key ?? "").trim();
    if (!schoolKey) {
      continue;
    }
    const districtKey = String(row.district_key ?? "").trim();
    schoolLookupByName.set(schoolKey, Number(row.id));
    schoolLookupByComposite.set(`${schoolKey}|${districtKey}`, Number(row.id));
  }

  let portalTeachersTrained = 0;
  let portalLearnersAssessed = 0;
  let portalStoriesPublished = 0;
  let portalTrainingSessions = 0;
  const uniqueTrainingSchools = new Set<string>();

  for (const row of portalRowsResult.rows) {
    const recordModule = String(row.module ?? "");
    const payload = (() => {
      try {
        return JSON.parse(String(row.payloadJson ?? "{}")) as Record<string, unknown>;
      } catch {
        return {} as Record<string, unknown>;
      }
    })();

    if (recordModule === "training") {
      portalTrainingSessions += 1;
      const schoolId = row.schoolId === null || row.schoolId === undefined ? null : Number(row.schoolId);
      if (schoolId && schoolId > 0) {
        uniqueTrainingSchools.add(`id:${schoolId}`);
      } else {
        const schoolKey = String(row.schoolName ?? "").trim().toLowerCase();
        const districtKey = String(row.district ?? "").trim().toLowerCase();
        if (schoolKey) {
          const resolvedId = schoolLookupByComposite.get(`${schoolKey}|${districtKey}`) ?? schoolLookupByName.get(schoolKey);
          uniqueTrainingSchools.add(resolvedId ? `id:${resolvedId}` : `name:${schoolKey}`);
        }
      }
      portalTeachersTrained += toNumber(payload.attendedTotal ?? payload.participantsTotal ?? payload.numberAttended ?? 0);
    }

    if (recordModule === "assessment") {
      portalLearnersAssessed += toNumber(payload.learnersAssessed ?? 0);
      portalStoriesPublished += toNumber(payload.storiesPublished ?? 0);
    }

    if (recordModule === "story") {
      portalStoriesPublished += toNumber(payload.storiesApproved ?? 0);
    }
  }

  return {
    metrics: [
      { label: "Teachers trained", value: teachersTrained + portalTeachersTrained + onlineTeachersTrained },
      { label: "Schools trained", value: uniqueTrainingSchools.size },
      { label: "Learners assessed", value: totalLearnersAssessed + portalLearnersAssessed },
      { label: "Stories published", value: storiesPublished + portalStoriesPublished },
      {
        label: "Training sessions completed",
        value: trainingSessionsCompleted + onlineTrainingSessionsCompleted + portalTrainingSessions,
      },
      { label: "Learners enrolled", value: enrolledLearners },
    ],
    engagement: {
      bookingRequests: toNumber(bookingCountResult.rows[0]?.total),
      partnerInquiries: toNumber(contactCountResult.rows[0]?.total),
      toolkitLeads: toNumber(downloadCountResult.rows[0]?.total),
      newsletterSubscribers: toNumber(newsletterCountResult.rows[0]?.total),
    },
    generatedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
}
