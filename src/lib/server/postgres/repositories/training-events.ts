import { queryPostgres } from "@/lib/server/postgres/client";

export type TrainingEventRow = {
  id: number;
  eventCode: string | null;
  deliveryType: 'online' | 'in_person';
  title: string;
  slug: string;
  description: string | null;
  trainingType: string | null;
  level: string | null;
  targetAudience: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
  venueName: string | null;
  venueAddress: string | null;
  district: string | null;
  subCounty: string | null;
  parish: string | null;
  village: string | null;
  village: string | null;
  maxSchools: number | null;
  maxParticipants: number | null;
  fundingType: 'Sponsored Training' | 'Paid Training' | 'Free Ozeki Event' | null;
  trainingFeeAmount: number | null;
  currency: string | null;
  sponsoringPartnerName: string | null;
  sponsoringPartnerType: string | null;
  googleMeetLink: string | null;
  googleCalendarEventId: string | null;
  registrationDeadline: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  status: string;
  certificateEligible: boolean;
  feedbackRequired: boolean;
  assessmentRequired: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EventRegistrationRow = {
  id: number;
  trainingEventId: number;
  schoolId: number;
  registeredByName: string | null;
  registeredByPhone: string | null;
  registeredByEmail: string | null;
  status: string;
  numberOfTeachers: number | null;
  registrationSource: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function createTrainingEventPostgres(input: Partial<TrainingEventRow>): Promise<number> {
  const result = await queryPostgres(
    `INSERT INTO training_events (
      event_code, delivery_type, title, slug, description, training_type, level, target_audience,
      start_datetime, end_datetime, venue_name, venue_address, district, sub_county, parish, village,
      max_schools, max_participants, funding_type, training_fee_amount, currency, sponsoring_partner_name, sponsoring_partner_type,
      google_meet_link, google_calendar_event_id,
      registration_deadline, contact_name, contact_phone, contact_email,
      status, certificate_eligible, feedback_required, assessment_required
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9::timestamptz, $10::timestamptz, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, $22, $23,
      $24, $25,
      $26::timestamptz, $27, $28, $29,
      $30, $31, $32, $33
    ) RETURNING id`,
    [
      input.eventCode || null, input.deliveryType || 'in_person', input.title, input.slug, input.description || null, input.trainingType || null, 
      input.level || null, input.targetAudience || null, 
      input.startDatetime || null, input.endDatetime || null, input.venueName || null, input.venueAddress || null, 
      input.district || null, input.subCounty || null, input.parish || null, input.village || null,
      input.maxSchools || null, input.maxParticipants || null, 
      input.fundingType || null, input.trainingFeeAmount || null, input.currency || null, input.sponsoringPartnerName || null, input.sponsoringPartnerType || null,
      input.googleMeetLink || null, input.googleCalendarEventId || null,
      input.registrationDeadline || null, input.contactName || null, input.contactPhone || null, input.contactEmail || null,
      input.status || 'Draft', input.certificateEligible ?? false, input.feedbackRequired ?? false, input.assessmentRequired ?? false
    ]
  );
  return result.rows[0].id;
}

export async function listTrainingEventsPostgres(status?: string): Promise<TrainingEventRow[]> {
  let query = `SELECT * FROM training_events WHERE 1=1`;
  const params: any[] = [];
  
  if (status) {
    params.push(status);
    query += ` AND status = $1`;
  }
  
  query += ` ORDER BY start_datetime ASC`;
  
  const result = await queryPostgres(query, params);
  return result.rows.map(mapTrainingEventRow);
}

export async function getTrainingEventBySlugPostgres(slug: string): Promise<TrainingEventRow | null> {
  const result = await queryPostgres(`SELECT * FROM training_events WHERE slug = $1 LIMIT 1`, [slug]);
  return result.rows[0] ? mapTrainingEventRow(result.rows[0]) : null;
}

export async function createEventRegistrationPostgres(input: Partial<EventRegistrationRow>): Promise<number> {
  const result = await queryPostgres(
    `INSERT INTO event_registrations (
      training_event_id, school_id, registered_by_name, registered_by_phone, registered_by_email,
      status, number_of_teachers, registration_source
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      input.trainingEventId, input.schoolId, input.registeredByName || null, input.registeredByPhone || null, input.registeredByEmail || null,
      input.status || 'Confirmed', input.numberOfTeachers || null, input.registrationSource || null
    ]
  );
  return result.rows[0].id;
}

export async function addTeacherToEventRegistrationPostgres(registrationId: number, eventId: number, teacherId: number) {
  const result = await queryPostgres(
    `INSERT INTO event_registration_teachers (
      event_registration_id, training_event_id, teacher_id, attendance_status, certificate_eligible
    ) VALUES ($1, $2, $3, 'Pending', false) RETURNING id`,
    [registrationId, eventId, teacherId]
  );
  return result.rows[0].id;
}

function mapTrainingEventRow(row: any): TrainingEventRow {
  return {
    id: row.id,
    eventCode: row.event_code,
    deliveryType: row.delivery_type || 'in_person',
    title: row.title,
    slug: row.slug,
    description: row.description,
    trainingType: row.training_type,
    level: row.level,
    targetAudience: row.target_audience,
    startDatetime: row.start_datetime ? String(row.start_datetime) : null,
    endDatetime: row.end_datetime ? String(row.end_datetime) : null,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    district: row.district,
    subCounty: row.sub_county,
    parish: row.parish,
    village: row.village,
    maxSchools: row.max_schools,
    maxParticipants: row.max_participants,
    fundingType: row.funding_type,
    trainingFeeAmount: row.training_fee_amount ? Number(row.training_fee_amount) : null,
    currency: row.currency,
    sponsoringPartnerName: row.sponsoring_partner_name,
    sponsoringPartnerType: row.sponsoring_partner_type,
    googleMeetLink: row.google_meet_link,
    googleCalendarEventId: row.google_calendar_event_id,
    registrationDeadline: row.registration_deadline ? String(row.registration_deadline) : null,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    status: row.status,
    certificateEligible: row.certificate_eligible,
    feedbackRequired: row.feedback_required,
    assessmentRequired: row.assessment_required,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export type EventAttendeeRow = {
  registrationTeacherId: number;
  teacherId: number;
  teacherUid: string;
  fullName: string;
  phone: string | null;
  roleTitle: string | null;
  attendanceStatus: string;
  schoolId: number;
  schoolName: string;
  registrationStatus: string;
  registeredByName: string | null;
};

export async function listRegistrationsForEventPostgres(eventId: number): Promise<EventAttendeeRow[]> {
  const result = await queryPostgres(
    \`SELECT 
      ert.id AS registration_teacher_id,
      t.id AS teacher_id,
      t.teacher_uid,
      t.full_name,
      t.phone,
      t.role_title,
      ert.attendance_status,
      s.id AS school_id,
      s.name AS school_name,
      er.status AS registration_status,
      er.registered_by_name
    FROM event_registration_teachers ert
    JOIN teacher_roster t ON t.id = ert.teacher_id
    JOIN event_registrations er ON er.id = ert.event_registration_id
    JOIN schools_directory s ON s.id = er.school_id
    WHERE ert.training_event_id = $1
    ORDER BY s.name ASC, t.full_name ASC\`,
    [eventId]
  );
  
  return result.rows.map((r: any) => ({
    registrationTeacherId: Number(r.registration_teacher_id),
    teacherId: Number(r.teacher_id),
    teacherUid: String(r.teacher_uid),
    fullName: String(r.full_name),
    phone: r.phone ? String(r.phone) : null,
    roleTitle: r.role_title ? String(r.role_title) : null,
    attendanceStatus: String(r.attendance_status),
    schoolId: Number(r.school_id),
    schoolName: String(r.school_name),
    registrationStatus: String(r.registration_status),
    registeredByName: r.registered_by_name ? String(r.registered_by_name) : null
  }));
}

export async function updateTeacherAttendanceStatusPostgres(registrationTeacherId: number, status: string) {
  await queryPostgres(
    \`UPDATE event_registration_teachers 
     SET attendance_status = $1, updated_at = NOW() 
     WHERE id = $2\`,
    [status, registrationTeacherId]
  );
}

export type TeacherLearningJourneyRow = {
  id: number;
  teacherId: number;
  trainingEventId: number;
  recommendedLessonId: number;
  journeyStage: string;
};

export type EventCertificateRow = {
  id: number;
  teacherId: number;
  trainingEventId: number;
  certificateHash: string;
  issuedAt: string;
};

export async function finalizeEventAndGeneratePathsPostgres(
  eventId: number, 
  recommendedLessonIds: number[]
) {
  // 1. Fetch all PRESENT teachers for this event
  const presentTeachers = await listRegistrationsForEventPostgres(eventId);
  const eligible = presentTeachers.filter(t => t.attendanceStatus === 'Present');
  
  if (eligible.length === 0) return { success: false, message: "No teachers marked present." };

  for (const teacher of eligible) {
    // Generate a unique, unguessable cert hash
    const certHash = \`cert_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}_\${teacher.teacherId}\`;
    
    // A. Issue Certificate
    await queryPostgres(
      \`INSERT INTO event_certificates (teacher_id, training_event_id, certificate_hash, issued_at)
       VALUES ($1, $2, $3, NOW())\`,
      [teacher.teacherId, eventId, certHash]
    );

    // B. Build the Recommended Learning Journey Loop
    for (const lessonId of recommendedLessonIds) {
      await queryPostgres(
        \`INSERT INTO teacher_learning_journey (teacher_id, training_event_id, recommended_lesson_id, journey_stage)
         VALUES ($1, $2, $3, 'Recommended')\`,
        [teacher.teacherId, eventId, lessonId]
      );
    }
  }

  // Set the overall Event status to Completed
  await queryPostgres(
    \`UPDATE training_events SET status = 'Completed', updated_at = NOW() WHERE id = $1\`,
    [eventId]
  );

  return { success: true, issuedCount: eligible.length };
}

export async function getTeacherImpactProfilePostgres(teacherUid: string) {
  // Get teacher core
  const teacherQuery = await queryPostgres(
    \`SELECT id, full_name, phone, role_title, school_id FROM teacher_roster WHERE teacher_uid = $1 LIMIT 1\`,
    [teacherUid]
  );
  if (teacherQuery.rows.length === 0) return null;
  const teacher = teacherQuery.rows[0];

  // Get physical attendance history
  const historyQuery = await queryPostgres(
    \`SELECT te.title, te.start_datetime, ert.attendance_status 
     FROM event_registration_teachers ert
     JOIN training_events te ON te.id = ert.training_event_id
     WHERE ert.teacher_id = $1 AND ert.attendance_status = 'Present'
     ORDER BY te.start_datetime DESC\`,
    [teacher.id]
  );

  // Get current journey recommendations (Now mapping internally within the unified training_events ecosystem)
  const recommendationsQuery = await queryPostgres(
    \`SELECT rl.id, rl.title, rl.slug, rl.vimeo_embed_url AS thumbnail_url, tlj.journey_stage
     FROM teacher_learning_journey tlj
     JOIN training_events rl ON rl.id = tlj.recommended_lesson_id
     WHERE tlj.teacher_id = $1 AND tlj.journey_stage != 'Completed' AND rl.delivery_type = 'online'
     ORDER BY tlj.id DESC\`,
    [teacher.id]
  );

  // Get certificates
  const certsQuery = await queryPostgres(
    \`SELECT ec.certificate_hash, ec.issued_at, te.title AS event_title
     FROM event_certificates ec
     JOIN training_events te ON te.id = ec.training_event_id
     WHERE ec.teacher_id = $1
     ORDER BY ec.issued_at DESC\`,
    [teacher.id]
  );

  return {
    teacherId: teacher.id,
    fullName: String(teacher.full_name),
    role: teacher.role_title ? String(teacher.role_title) : "Teacher",
    workshopHistory: historyQuery.rows.map(r => ({ title: String(r.title), date: String(r.start_datetime) })),
    recommendations: recommendationsQuery.rows.map((r: any) => ({
      id: Number(r.id),
      title: String(r.title),
      slug: String(r.slug),
      thumbnailUrl: r.thumbnail_url ? String(r.thumbnail_url) : null,
      status: String(r.journey_stage)
    })),
    certificates: certsQuery.rows.map(r => ({
      hash: String(r.certificate_hash),
      issuedAt: String(r.issued_at),
      eventTitle: String(r.event_title)
    }))
  };
}
