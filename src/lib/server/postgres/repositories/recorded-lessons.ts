import { queryPostgres } from "@/lib/server/postgres/client";

export type RecordedLessonRow = {
  id: number;
  lessonCode: string | null;
  title: string;
  slug: string;
  description: string | null;
  teacherName: string | null;
  classLevel: string | null;
  phonicsLevel: string | null;
  category: string | null;
  subCategory: string | null;
  tagsJson: string | null;
  googleCalendarEventId: string | null;
  googleMeetLink: string | null;
  googleMeetConferenceId: string | null;
  googleDriveFileId: string | null;
  googleDriveFileName: string | null;
  googleDriveFolderId: string | null;
  vimeoVideoId: string | null;
  vimeoUrl: string | null;
  vimeoEmbedUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  lessonDate: string | null;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  status: string;
  accessLevel: string;
  autoImportFromDrive: boolean;
  autoUploadToVimeo: boolean;
  autoPublish: boolean;
  requiresReview: boolean;
  certificateEligible: boolean;
  quizRequired: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  createdBy: number | null;
  reviewedBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export async function createRecordedLessonPostgres(input: Partial<RecordedLessonRow>): Promise<number> {
  const result = await queryPostgres(
    `INSERT INTO recorded_lessons (
      lesson_code, title, slug, description, teacher_name, class_level, phonics_level, category, sub_category, tags_json,
      google_calendar_event_id, google_meet_link, google_meet_conference_id, google_drive_file_id, google_drive_file_name, google_drive_folder_id,
      vimeo_video_id, vimeo_url, vimeo_embed_url, thumbnail_url, duration,
      lesson_date, scheduled_start_time, scheduled_end_time, actual_start_time, actual_end_time, 
      status, access_level, auto_import_from_drive, auto_upload_to_vimeo, auto_publish, 
      requires_review, certificate_eligible, quiz_required,
      is_published, published_at, created_by, reviewed_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21,
      $22::timestamptz, $23::timestamptz, $24::timestamptz, $25::timestamptz, $26::timestamptz, 
      $27, $28, $29, $30, $31, $32, $33, $34, $35, $36::timestamptz, $37, $38
    ) RETURNING id`,
    [
      input.lessonCode || null, input.title, input.slug, input.description || null, input.teacherName || null, 
      input.classLevel || null, input.phonicsLevel || null, input.category || null, input.subCategory || null, input.tagsJson || '[]',
      input.googleCalendarEventId || null, input.googleMeetLink || null, input.googleMeetConferenceId || null, 
      input.googleDriveFileId || null, input.googleDriveFileName || null, input.googleDriveFolderId || null,
      input.vimeoVideoId || null, input.vimeoUrl || null, input.vimeoEmbedUrl || null, input.thumbnailUrl || null, input.duration || null,
      input.lessonDate || null, input.scheduledStartTime || null, input.scheduledEndTime || null, input.actualStartTime || null, input.actualEndTime || null,
      input.status || 'Scheduled', input.accessLevel || 'Registered Users Only',
      input.autoImportFromDrive ?? true, input.autoUploadToVimeo ?? true, input.autoPublish ?? false,
      input.requiresReview ?? true, input.certificateEligible ?? false, input.quizRequired ?? false,
      input.isPublished || false, input.publishedAt || null, input.createdBy || null, input.reviewedBy || null
    ]
  );
  return result.rows[0].id;
}

export async function listRecordedLessonsPostgres(options?: { isPublished?: boolean, classLevel?: string, phonicsLevel?: string }): Promise<RecordedLessonRow[]> {
  let query = `SELECT * FROM recorded_lessons WHERE 1=1`;
  const params: unknown[] = [];
  
  if (options?.isPublished !== undefined) {
    params.push(options.isPublished);
    query += ` AND is_published = $${params.length}`;
  }
  
  if (options?.classLevel) {
    params.push(options.classLevel);
    query += ` AND class_level = $${params.length}`;
  }
  
  if (options?.phonicsLevel) {
    params.push(options.phonicsLevel);
    query += ` AND phonics_level = $${params.length}`;
  }
  
  query += ` ORDER BY created_at DESC`;
  
  const result = await queryPostgres(query, params);
  
  return result.rows.map(mapRecordedLessonRow);
}

export async function getRecordedLessonBySlugPostgres(slug: string): Promise<RecordedLessonRow | null> {
  const result = await queryPostgres(
    `SELECT * FROM recorded_lessons WHERE slug = $1 LIMIT 1`,
    [slug]
  );
  return result.rows[0] ? mapRecordedLessonRow(result.rows[0]) : null;
}

export async function updateRecordedLessonVimeoDetailsPostgres(
  id: number, 
  vimeoObj: { vimeoVideoId: string; vimeoUrl: string; vimeoEmbedUrl: string; status: string }
) {
  await queryPostgres(
    `UPDATE recorded_lessons 
     SET vimeo_video_id = $2, vimeo_url = $3, vimeo_embed_url = $4, status = $5, updated_at = NOW() 
     WHERE id = $1`,
    [id, vimeoObj.vimeoVideoId, vimeoObj.vimeoUrl, vimeoObj.vimeoEmbedUrl, vimeoObj.status]
  );
}

function mapRecordedLessonRow(row: Record<string, unknown>): RecordedLessonRow {
  return {
    id: row.id,
    lessonCode: row.lesson_code,
    title: row.title,
    slug: row.slug,
    description: row.description,
    teacherName: row.teacher_name,
    classLevel: row.class_level,
    phonicsLevel: row.phonics_level,
    category: row.category,
    subCategory: row.sub_category,
    tagsJson: row.tags_json,
    googleCalendarEventId: row.google_calendar_event_id,
    googleMeetLink: row.google_meet_link,
    googleMeetConferenceId: row.google_meet_conference_id,
    googleDriveFileId: row.google_drive_file_id,
    googleDriveFileName: row.google_drive_file_name,
    googleDriveFolderId: row.google_drive_folder_id,
    vimeoVideoId: row.vimeo_video_id,
    vimeoUrl: row.vimeo_url,
    vimeoEmbedUrl: row.vimeo_embed_url,
    thumbnailUrl: row.thumbnail_url,
    duration: row.duration,
    lessonDate: row.lesson_date ? String(row.lesson_date) : null,
    scheduledStartTime: row.scheduled_start_time ? String(row.scheduled_start_time) : null,
    scheduledEndTime: row.scheduled_end_time ? String(row.scheduled_end_time) : null,
    actualStartTime: row.actual_start_time ? String(row.actual_start_time) : null,
    actualEndTime: row.actual_end_time ? String(row.actual_end_time) : null,
    status: row.status,
    accessLevel: row.access_level,
    autoImportFromDrive: row.auto_import_from_drive,
    autoUploadToVimeo: row.auto_upload_to_vimeo,
    autoPublish: row.auto_publish,
    requiresReview: row.requires_review,
    certificateEligible: row.certificate_eligible,
    quizRequired: row.quiz_required,
    isPublished: row.is_published,
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}
