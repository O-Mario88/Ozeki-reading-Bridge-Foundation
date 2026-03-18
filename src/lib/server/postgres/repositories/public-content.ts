import { queryPostgres } from "@/lib/server/postgres/client";
import type {
  AnthologyRecord,
  PortalCoreValueRecord,
  PortalLeadershipTeamMemberRecord,
  PortalTestimonialRecord,
  PortalUser,
  PublishedStory,
  StoryComment,
  StoryContentBlock,
  StoryLibraryFilters,
} from "@/lib/types";

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function toNullableText(value: unknown) {
  const normalized = toText(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  const normalized = toText(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function parseJsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  const text = toText(value).trim();
  if (!text) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function canViewAllRecords(user: PortalUser) {
  return Boolean(user.isSupervisor || user.isME || user.isAdmin || user.isSuperAdmin);
}

function canReviewRecords(user: PortalUser) {
  return canViewAllRecords(user);
}

function mapPortalTestimonial(row: Record<string, unknown>): PortalTestimonialRecord {
  return {
    id: toNumber(row.id),
    storytellerName: toText(row.storytellerName),
    storytellerRole: toText(row.storytellerRole),
    schoolId: toNullableNumber(row.schoolId),
    schoolName: toText(row.schoolName),
    district: toText(row.district),
    storyText: toText(row.storyText),
    videoSourceType: toText(row.videoSourceType) === "youtube" ? "youtube" : "upload",
    videoFileName: toText(row.videoFileName),
    videoStoredPath: toText(row.videoStoredPath),
    videoMimeType: toText(row.videoMimeType),
    videoSizeBytes: toNumber(row.videoSizeBytes),
    youtubeVideoId: toNullableText(row.youtubeVideoId),
    youtubeVideoTitle: toNullableText(row.youtubeVideoTitle),
    youtubeChannelTitle: toNullableText(row.youtubeChannelTitle),
    youtubeThumbnailUrl: toNullableText(row.youtubeThumbnailUrl),
    youtubeEmbedUrl: toNullableText(row.youtubeEmbedUrl),
    youtubeWatchUrl: toNullableText(row.youtubeWatchUrl),
    photoFileName: toNullableText(row.photoFileName),
    photoStoredPath: toNullableText(row.photoStoredPath),
    photoMimeType: toNullableText(row.photoMimeType),
    photoSizeBytes: toNullableNumber(row.photoSizeBytes),
    isPublished: toBoolean(row.isPublished),
    moderationStatus:
      toText(row.moderationStatus) === "hidden"
        ? "hidden"
        : toText(row.moderationStatus) === "pending"
          ? "pending"
          : "approved",
    sourceType: toText(row.sourceType) === "training_feedback" ? "training_feedback" : "manual",
    sourceTrainingFeedbackId: toNullableNumber(row.sourceTrainingFeedbackId),
    sourceTrainingRecordId: toNullableNumber(row.sourceTrainingRecordId),
    quoteField: toNullableText(row.quoteField),
    createdByUserId: toNumber(row.createdByUserId),
    createdByName: toText(row.createdByName, "Portal Staff"),
    createdAt: toText(row.createdAt),
  };
}

function mapPortalLeadershipMember(row: Record<string, unknown>): PortalLeadershipTeamMemberRecord {
  const sectionRaw = toText(row.section);
  const section =
    sectionRaw === "board" || sectionRaw === "staff" || sectionRaw === "volunteer"
      ? sectionRaw
      : "staff";
  return {
    id: toNumber(row.id),
    section,
    name: toText(row.name),
    role: toText(row.role),
    biography: toText(row.biography),
    background: toText(row.background),
    career: toText(row.career),
    photoFileName: toNullableText(row.photoFileName),
    photoStoredPath: toNullableText(row.photoStoredPath),
    photoMimeType: toNullableText(row.photoMimeType),
    photoSizeBytes: toNullableNumber(row.photoSizeBytes),
    photoAlt: toNullableText(row.photoAlt),
    sortOrder: toNumber(row.sortOrder),
    isPublished: toBoolean(row.isPublished),
    createdByUserId: toNumber(row.createdByUserId),
    createdByName: toText(row.createdByName, "Portal Staff"),
    updatedByUserId: toNumber(row.updatedByUserId),
    updatedByName: toText(row.updatedByName, "Portal Staff"),
    createdAt: toText(row.createdAt),
    updatedAt: toText(row.updatedAt),
  };
}

function mapPortalCoreValue(row: Record<string, unknown>): PortalCoreValueRecord {
  return {
    id: toNumber(row.id),
    title: toText(row.title),
    description: toText(row.description),
    sortOrder: toNumber(row.sortOrder),
    isPublished: toBoolean(row.isPublished),
    createdByUserId: toNumber(row.createdByUserId),
    createdByName: toText(row.createdByName, "Portal Staff"),
    updatedByUserId: toNumber(row.updatedByUserId),
    updatedByName: toText(row.updatedByName, "Portal Staff"),
    createdAt: toText(row.createdAt),
    updatedAt: toText(row.updatedAt),
  };
}

function mapPublishedStory(row: Record<string, unknown>): PublishedStory {
  return {
    id: toNumber(row.id),
    slug: toText(row.slug),
    anthologyId: toNullableNumber(row.anthologyId),
    anthologySlug: toNullableText(row.anthologySlug),
    authorProfileId: toNullableNumber(row.authorProfileId),
    title: toText(row.title),
    authorAbout: toText(row.authorAbout),
    excerpt: toText(row.excerpt),
    contentText: toNullableText(row.contentText),
    storyContentBlocks: parseJsonArray<StoryContentBlock>(row.storyContentBlocks, []),
    hasIllustrations: toBoolean(row.hasIllustrations),
    pdfStoredPath: toNullableText(row.pdfStoredPath),
    coverImagePath: toNullableText(row.coverImagePath),
    grade: toText(row.grade),
    language: toText(row.language, "English"),
    tags: parseJsonArray<string>(row.tags, []),
    pageStart: toNumber(row.pageStart, 1),
    pageEnd: toNumber(row.pageEnd, 1),
    publicAuthorDisplay: toText(row.publicAuthorDisplay),
    viewCount: toNumber(row.viewCount),
    averageStars:
      row.averageStars === null || row.averageStars === undefined
        ? undefined
        : Number(Number(row.averageStars).toFixed(1)),
    ratingCount:
      row.ratingCount === null || row.ratingCount === undefined ? undefined : toNumber(row.ratingCount),
    commentCount:
      row.commentCount === null || row.commentCount === undefined ? undefined : toNumber(row.commentCount),
    latestCommentSnippet: toNullableText(row.latestCommentSnippet) ?? undefined,
    publishedAt: toNullableText(row.publishedAt),
    schoolName: toText(row.schoolName),
    district: toText(row.district),
    subRegion: toText(row.subRegion),
    schoolId: toNumber(row.schoolId),
  };
}

function mapAnthology(row: Record<string, unknown>): AnthologyRecord {
  const rawScopeType = toText(row.scopeType, "school");
  const scopeType: AnthologyRecord["scopeType"] =
    rawScopeType === "district" || rawScopeType === "subregion" || rawScopeType === "region"
      ? rawScopeType
      : "school";
  return {
    id: toNumber(row.id),
    slug: toText(row.slug),
    title: toText(row.title),
    scopeType,
    scopeId: toNullableNumber(row.scopeId),
    schoolId: toNullableNumber(row.schoolId),
    districtScope: toNullableText(row.districtScope),
    edition: toText(row.edition),
    pdfStoredPath: toNullableText(row.pdfStoredPath),
    pdfPageCount: toNumber(row.pdfPageCount),
    coverImagePath: toNullableText(row.coverImagePath),
    publishStatus: toText(row.publishStatus, "draft") as AnthologyRecord["publishStatus"],
    consentStatus: toText(row.consentStatus, "pending") as AnthologyRecord["consentStatus"],
    featured: toBoolean(row.featured),
    featuredRank: toNullableNumber(row.featuredRank),
    downloadCount: toNumber(row.downloadCount),
    createdByUserId: toNumber(row.createdByUserId),
    createdAt: toText(row.createdAt),
    publishedAt: toNullableText(row.publishedAt),
    schoolName: toNullableText(row.schoolName) ?? undefined,
  };
}

function mapStoryComment(row: Record<string, unknown>): StoryComment {
  return {
    id: toNumber(row.id),
    storyId: toNumber(row.storyId),
    userId: toNullableNumber(row.userId) ?? undefined,
    anonymousId: toNullableText(row.anonymousId) ?? undefined,
    displayName: toNullableText(row.displayName) ?? undefined,
    commentText: toText(row.commentText),
    createdAt: toText(row.createdAt),
    status: (toText(row.status, "visible") as StoryComment["status"]),
    flaggedReason: toNullableText(row.flaggedReason) ?? undefined,
  };
}

export async function listPublishedPortalTestimonialsPostgres(
  limit = 180,
): Promise<PortalTestimonialRecord[]> {
  const result = await queryPostgres<Record<string, unknown>>(
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
  return result.rows.map(mapPortalTestimonial);
}

export async function getPublishedPortalTestimonialByIdPostgres(
  id: number,
): Promise<PortalTestimonialRecord | null> {
  const result = await queryPostgres<Record<string, unknown>>(
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
  return row ? mapPortalTestimonial(row) : null;
}

export async function listPortalTestimonialsPostgres(
  user: PortalUser,
  limit = 120,
  filters?: { schoolId?: number },
): Promise<PortalTestimonialRecord[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (!canViewAllRecords(user)) {
    params.push(user.id);
    clauses.push(`pt.created_by_user_id = $${params.length}`);
  }
  if (Number.isInteger(filters?.schoolId) && Number(filters?.schoolId) > 0) {
    params.push(Number(filters?.schoolId));
    clauses.push(`pt.school_id = $${params.length}`);
  }
  params.push(Math.min(Math.max(limit, 1), 500));
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  const result = await queryPostgres<Record<string, unknown>>(
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
      ${whereClause}
      ORDER BY pt.created_at DESC
      LIMIT $${params.length}
    `,
    params,
  );
  return result.rows.map(mapPortalTestimonial);
}

export async function savePortalTestimonialPostgres(input: {
  storytellerName: string;
  storytellerRole: string;
  schoolId: number;
  schoolName: string;
  district: string;
  storyText: string;
  videoSourceType?: "upload" | "youtube";
  videoFileName: string;
  videoStoredPath: string;
  videoMimeType: string;
  videoSizeBytes: number;
  youtubeVideoId?: string | null;
  youtubeVideoTitle?: string | null;
  youtubeChannelTitle?: string | null;
  youtubeThumbnailUrl?: string | null;
  youtubeEmbedUrl?: string | null;
  youtubeWatchUrl?: string | null;
  photoFileName?: string | null;
  photoStoredPath?: string | null;
  photoMimeType?: string | null;
  photoSizeBytes?: number | null;
  moderationStatus?: "pending" | "approved" | "hidden";
  sourceType?: "manual" | "training_feedback";
  sourceTrainingFeedbackId?: number | null;
  sourceTrainingRecordId?: number | null;
  quoteField?: string | null;
  createdByUserId: number;
}): Promise<PortalTestimonialRecord> {
  const moderationStatus = input.moderationStatus ?? "approved";
  const isPublished = moderationStatus === "approved";
  const insertResult = await queryPostgres<{ id: number }>(
    `
      INSERT INTO portal_testimonials (
        storyteller_name,
        storyteller_role,
        school_id,
        school_name,
        district,
        story_text,
        video_source_type,
        video_file_name,
        video_stored_path,
        video_mime_type,
        video_size_bytes,
        youtube_video_id,
        youtube_video_title,
        youtube_channel_title,
        youtube_thumbnail_url,
        youtube_embed_url,
        youtube_watch_url,
        photo_file_name,
        photo_stored_path,
        photo_mime_type,
        photo_size_bytes,
        is_published,
        moderation_status,
        source_type,
        source_training_feedback_id,
        source_training_record_id,
        quote_field,
        created_by_user_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
      )
      RETURNING id
    `,
    [
      input.storytellerName.trim(),
      input.storytellerRole.trim(),
      input.schoolId,
      input.schoolName.trim(),
      input.district.trim(),
      input.storyText.trim(),
      input.videoSourceType ?? "upload",
      input.videoFileName,
      input.videoStoredPath,
      input.videoMimeType,
      input.videoSizeBytes,
      input.youtubeVideoId ?? null,
      input.youtubeVideoTitle ?? null,
      input.youtubeChannelTitle ?? null,
      input.youtubeThumbnailUrl ?? null,
      input.youtubeEmbedUrl ?? null,
      input.youtubeWatchUrl ?? null,
      input.photoFileName ?? null,
      input.photoStoredPath ?? null,
      input.photoMimeType ?? null,
      input.photoSizeBytes ?? null,
      isPublished,
      moderationStatus,
      input.sourceType ?? "manual",
      input.sourceTrainingFeedbackId ?? null,
      input.sourceTrainingRecordId ?? null,
      input.quoteField ?? null,
      input.createdByUserId,
    ],
  );

  const insertedId = toNumber(insertResult.rows[0]?.id);
  const directResult = await queryPostgres<Record<string, unknown>>(
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
      LIMIT 1
    `,
    [insertedId],
  );
  const row = directResult.rows[0];
  if (!row) {
    throw new Error("Could not load saved testimonial.");
  }
  return mapPortalTestimonial(row);
}

export async function setPortalTestimonialModerationStatusPostgres(input: {
  testimonialId: number;
  moderationStatus: "pending" | "approved" | "hidden";
  user: PortalUser;
}) {
  if (!canReviewRecords(input.user)) {
    throw new Error("Only supervisors or admins can moderate testimonials.");
  }
  const isPublished = input.moderationStatus === "approved";
  await queryPostgres(
    `
      UPDATE portal_testimonials
      SET moderation_status = $1, is_published = $2
      WHERE id = $3
    `,
    [input.moderationStatus, isPublished, input.testimonialId],
  );
}

export async function listPortalLeadershipTeamMembersPostgres(options?: {
  includeUnpublished?: boolean;
}): Promise<PortalLeadershipTeamMemberRecord[]> {
  const whereClause = options?.includeUnpublished ? "" : "WHERE tm.is_published IS TRUE";
  const result = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        tm.id,
        tm.section,
        tm.name,
        tm.role,
        tm.biography,
        tm.background,
        tm.career,
        tm.photo_file_name AS "photoFileName",
        tm.photo_stored_path AS "photoStoredPath",
        tm.photo_mime_type AS "photoMimeType",
        tm.photo_size_bytes AS "photoSizeBytes",
        tm.photo_alt AS "photoAlt",
        tm.sort_order AS "sortOrder",
        tm.is_published AS "isPublished",
        tm.created_by_user_id AS "createdByUserId",
        COALESCE(creator.full_name, 'Portal Staff') AS "createdByName",
        tm.updated_by_user_id AS "updatedByUserId",
        COALESCE(updater.full_name, 'Portal Staff') AS "updatedByName",
        tm.created_at::text AS "createdAt",
        tm.updated_at::text AS "updatedAt"
      FROM portal_leadership_team_members tm
      LEFT JOIN portal_users creator ON creator.id = tm.created_by_user_id
      LEFT JOIN portal_users updater ON updater.id = tm.updated_by_user_id
      ${whereClause}
      ORDER BY
        CASE tm.section
          WHEN 'board' THEN 1
          WHEN 'staff' THEN 2
          WHEN 'volunteer' THEN 3
          ELSE 4
        END,
        tm.sort_order ASC,
        tm.updated_at DESC
    `,
  );
  return result.rows.map(mapPortalLeadershipMember);
}

export async function getPortalLeadershipTeamMemberByIdPostgres(
  id: number,
): Promise<PortalLeadershipTeamMemberRecord | null> {
  const result = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        tm.id,
        tm.section,
        tm.name,
        tm.role,
        tm.biography,
        tm.background,
        tm.career,
        tm.photo_file_name AS "photoFileName",
        tm.photo_stored_path AS "photoStoredPath",
        tm.photo_mime_type AS "photoMimeType",
        tm.photo_size_bytes AS "photoSizeBytes",
        tm.photo_alt AS "photoAlt",
        tm.sort_order AS "sortOrder",
        tm.is_published AS "isPublished",
        tm.created_by_user_id AS "createdByUserId",
        COALESCE(creator.full_name, 'Portal Staff') AS "createdByName",
        tm.updated_by_user_id AS "updatedByUserId",
        COALESCE(updater.full_name, 'Portal Staff') AS "updatedByName",
        tm.created_at::text AS "createdAt",
        tm.updated_at::text AS "updatedAt"
      FROM portal_leadership_team_members tm
      LEFT JOIN portal_users creator ON creator.id = tm.created_by_user_id
      LEFT JOIN portal_users updater ON updater.id = tm.updated_by_user_id
      WHERE tm.id = $1
      LIMIT 1
    `,
    [id],
  );
  const row = result.rows[0];
  return row ? mapPortalLeadershipMember(row) : null;
}

export async function getPublishedPortalLeadershipTeamMemberByIdPostgres(
  id: number,
): Promise<PortalLeadershipTeamMemberRecord | null> {
  const result = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        tm.id,
        tm.section,
        tm.name,
        tm.role,
        tm.biography,
        tm.background,
        tm.career,
        tm.photo_file_name AS "photoFileName",
        tm.photo_stored_path AS "photoStoredPath",
        tm.photo_mime_type AS "photoMimeType",
        tm.photo_size_bytes AS "photoSizeBytes",
        tm.photo_alt AS "photoAlt",
        tm.sort_order AS "sortOrder",
        tm.is_published AS "isPublished",
        tm.created_by_user_id AS "createdByUserId",
        COALESCE(creator.full_name, 'Portal Staff') AS "createdByName",
        tm.updated_by_user_id AS "updatedByUserId",
        COALESCE(updater.full_name, 'Portal Staff') AS "updatedByName",
        tm.created_at::text AS "createdAt",
        tm.updated_at::text AS "updatedAt"
      FROM portal_leadership_team_members tm
      LEFT JOIN portal_users creator ON creator.id = tm.created_by_user_id
      LEFT JOIN portal_users updater ON updater.id = tm.updated_by_user_id
      WHERE tm.id = $1 AND tm.is_published IS TRUE
      LIMIT 1
    `,
    [id],
  );
  const row = result.rows[0];
  return row ? mapPortalLeadershipMember(row) : null;
}

export async function savePortalLeadershipTeamMemberPostgres(input: {
  section: PortalLeadershipTeamMemberRecord["section"];
  name: string;
  role: string;
  biography: string;
  background: string;
  career: string;
  photoFileName?: string | null;
  photoStoredPath?: string | null;
  photoMimeType?: string | null;
  photoSizeBytes?: number | null;
  photoAlt?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  userId: number;
}): Promise<PortalLeadershipTeamMemberRecord> {
  const result = await queryPostgres<{ id: number }>(
    `
      INSERT INTO portal_leadership_team_members (
        section,
        name,
        role,
        biography,
        background,
        career,
        photo_file_name,
        photo_stored_path,
        photo_mime_type,
        photo_size_bytes,
        photo_alt,
        sort_order,
        is_published,
        created_by_user_id,
        updated_by_user_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
      RETURNING id
    `,
    [
      input.section,
      input.name.trim(),
      input.role.trim(),
      input.biography.trim(),
      input.background.trim(),
      input.career.trim(),
      input.photoFileName ?? null,
      input.photoStoredPath ?? null,
      input.photoMimeType ?? null,
      input.photoSizeBytes ?? null,
      input.photoAlt?.trim() || null,
      Math.max(0, Math.trunc(input.sortOrder ?? 0)),
      input.isPublished === false ? false : true,
      input.userId,
    ],
  );
  const record = await getPortalLeadershipTeamMemberByIdPostgres(toNumber(result.rows[0]?.id));
  if (!record) {
    throw new Error("Could not load saved leadership team member.");
  }
  return record;
}

export async function updatePortalLeadershipTeamMemberPostgres(input: {
  id: number;
  section: PortalLeadershipTeamMemberRecord["section"];
  name: string;
  role: string;
  biography: string;
  background: string;
  career: string;
  photoFileName?: string | null;
  photoStoredPath?: string | null;
  photoMimeType?: string | null;
  photoSizeBytes?: number | null;
  photoAlt?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  userId: number;
}): Promise<PortalLeadershipTeamMemberRecord> {
  await queryPostgres(
    `
      UPDATE portal_leadership_team_members
      SET
        section = $1,
        name = $2,
        role = $3,
        biography = $4,
        background = $5,
        career = $6,
        photo_file_name = $7,
        photo_stored_path = $8,
        photo_mime_type = $9,
        photo_size_bytes = $10,
        photo_alt = $11,
        sort_order = $12,
        is_published = $13,
        updated_by_user_id = $14,
        updated_at = NOW()
      WHERE id = $15
    `,
    [
      input.section,
      input.name.trim(),
      input.role.trim(),
      input.biography.trim(),
      input.background.trim(),
      input.career.trim(),
      input.photoFileName ?? null,
      input.photoStoredPath ?? null,
      input.photoMimeType ?? null,
      input.photoSizeBytes ?? null,
      input.photoAlt?.trim() || null,
      Math.max(0, Math.trunc(input.sortOrder ?? 0)),
      input.isPublished === false ? false : true,
      input.userId,
      input.id,
    ],
  );
  const record = await getPortalLeadershipTeamMemberByIdPostgres(input.id);
  if (!record) {
    throw new Error("Could not load updated leadership team member.");
  }
  return record;
}

export async function deletePortalLeadershipTeamMemberPostgres(id: number) {
  await queryPostgres(`DELETE FROM portal_leadership_team_members WHERE id = $1`, [id]);
}

export async function listPortalCoreValuesPostgres(options?: {
  includeUnpublished?: boolean;
}): Promise<PortalCoreValueRecord[]> {
  const whereClause = options?.includeUnpublished ? "" : "WHERE cv.is_published IS TRUE";
  const result = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        cv.id,
        cv.title,
        cv.description,
        cv.sort_order AS "sortOrder",
        cv.is_published AS "isPublished",
        cv.created_by_user_id AS "createdByUserId",
        COALESCE(creator.full_name, 'Portal Staff') AS "createdByName",
        cv.updated_by_user_id AS "updatedByUserId",
        COALESCE(updater.full_name, 'Portal Staff') AS "updatedByName",
        cv.created_at::text AS "createdAt",
        cv.updated_at::text AS "updatedAt"
      FROM portal_core_values cv
      LEFT JOIN portal_users creator ON creator.id = cv.created_by_user_id
      LEFT JOIN portal_users updater ON updater.id = cv.updated_by_user_id
      ${whereClause}
      ORDER BY cv.sort_order ASC, cv.updated_at DESC
    `,
  );
  return result.rows.map(mapPortalCoreValue);
}

export async function getPortalCoreValueByIdPostgres(id: number): Promise<PortalCoreValueRecord | null> {
  const result = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        cv.id,
        cv.title,
        cv.description,
        cv.sort_order AS "sortOrder",
        cv.is_published AS "isPublished",
        cv.created_by_user_id AS "createdByUserId",
        COALESCE(creator.full_name, 'Portal Staff') AS "createdByName",
        cv.updated_by_user_id AS "updatedByUserId",
        COALESCE(updater.full_name, 'Portal Staff') AS "updatedByName",
        cv.created_at::text AS "createdAt",
        cv.updated_at::text AS "updatedAt"
      FROM portal_core_values cv
      LEFT JOIN portal_users creator ON creator.id = cv.created_by_user_id
      LEFT JOIN portal_users updater ON updater.id = cv.updated_by_user_id
      WHERE cv.id = $1
      LIMIT 1
    `,
    [id],
  );
  const row = result.rows[0];
  return row ? mapPortalCoreValue(row) : null;
}

export async function savePortalCoreValuePostgres(input: {
  title: string;
  description: string;
  sortOrder?: number;
  isPublished?: boolean;
  userId: number;
}): Promise<PortalCoreValueRecord> {
  const result = await queryPostgres<{ id: number }>(
    `
      INSERT INTO portal_core_values (
        title,
        description,
        sort_order,
        is_published,
        created_by_user_id,
        updated_by_user_id
      ) VALUES ($1,$2,$3,$4,$5,$5)
      RETURNING id
    `,
    [
      input.title.trim(),
      input.description.trim(),
      Math.max(0, Math.trunc(input.sortOrder ?? 0)),
      input.isPublished === false ? false : true,
      input.userId,
    ],
  );
  const value = await getPortalCoreValueByIdPostgres(toNumber(result.rows[0]?.id));
  if (!value) {
    throw new Error("Could not load saved core value.");
  }
  return value;
}

export async function updatePortalCoreValuePostgres(input: {
  id: number;
  title: string;
  description: string;
  sortOrder?: number;
  isPublished?: boolean;
  userId: number;
}): Promise<PortalCoreValueRecord> {
  await queryPostgres(
    `
      UPDATE portal_core_values
      SET
        title = $1,
        description = $2,
        sort_order = $3,
        is_published = $4,
        updated_by_user_id = $5,
        updated_at = NOW()
      WHERE id = $6
    `,
    [
      input.title.trim(),
      input.description.trim(),
      Math.max(0, Math.trunc(input.sortOrder ?? 0)),
      input.isPublished === false ? false : true,
      input.userId,
      input.id,
    ],
  );
  const value = await getPortalCoreValueByIdPostgres(input.id);
  if (!value) {
    throw new Error("Could not load updated core value.");
  }
  return value;
}

export async function deletePortalCoreValuePostgres(id: number) {
  await queryPostgres(`DELETE FROM portal_core_values WHERE id = $1`, [id]);
}

export async function getStoryBySlugPostgres(slug: string): Promise<PublishedStory | null> {
  const result = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        sl.id,
        sl.slug,
        sl.anthology_id AS "anthologyId",
        sa.slug AS "anthologySlug",
        sl.author_profile_id AS "authorProfileId",
        sl.title,
        sl.author_about AS "authorAbout",
        sl.excerpt,
        sl.content_text AS "contentText",
        sl.story_content_blocks AS "storyContentBlocks",
        sl.has_illustrations AS "hasIllustrations",
        sl.pdf_stored_path AS "pdfStoredPath",
        sl.cover_image_path AS "coverImagePath",
        sl.grade,
        sl.language,
        sl.tags,
        sl.page_start AS "pageStart",
        sl.page_end AS "pageEnd",
        sl.public_author_display AS "publicAuthorDisplay",
        sl.view_count AS "viewCount",
        ROUND(AVG(sr.stars)::numeric, 1) AS "averageStars",
        COUNT(sr.id)::int AS "ratingCount",
        (
          SELECT COUNT(*)
          FROM story_comments sc
          WHERE sc.story_id = sl.id AND sc.status = 'visible'
        )::int AS "commentCount",
        (
          SELECT sc.comment_text
          FROM story_comments sc
          WHERE sc.story_id = sl.id AND sc.status = 'visible'
          ORDER BY sc.created_at DESC
          LIMIT 1
        ) AS "latestCommentSnippet",
        sl.published_at::text AS "publishedAt",
        sl.school_id AS "schoolId",
        sd.name AS "schoolName",
        sd.district,
        COALESCE(sd.sub_region, '') AS "subRegion"
      FROM story_library sl
      JOIN schools_directory sd ON sd.id = sl.school_id
      LEFT JOIN story_anthologies sa ON sa.id = sl.anthology_id
      LEFT JOIN story_ratings sr ON sr.story_id = sl.id AND sr.status = 'visible'
      WHERE sl.slug = $1
        AND sl.publish_status = 'published'
        AND sl.consent_status = 'approved'
      GROUP BY sl.id, sa.slug, sd.name, sd.district, sd.sub_region
      LIMIT 1
    `,
    [slug],
  );
  const row = result.rows[0];
  return row ? mapPublishedStory(row) : null;
}

export async function listPublishedStoriesPostgres(
  filters: StoryLibraryFilters = {},
): Promise<{ stories: PublishedStory[]; total: number }> {
  const clauses = [
    "sl.publish_status = 'published'",
    "sl.consent_status = 'approved'",
  ];
  const params: unknown[] = [];

  if (filters.q) {
    params.push(`%${filters.q}%`);
    clauses.push(`(sl.title ILIKE $${params.length} OR sl.excerpt ILIKE $${params.length})`);
  }
  if (filters.region) {
    params.push(filters.region);
    clauses.push(`sd.region = $${params.length}`);
  }
  if (filters.district) {
    params.push(filters.district);
    clauses.push(`sd.district = $${params.length}`);
  }
  if (filters.schoolId) {
    params.push(filters.schoolId);
    clauses.push(`sl.school_id = $${params.length}`);
  }
  if (filters.grade) {
    params.push(filters.grade);
    clauses.push(`sl.grade = $${params.length}`);
  }
  if (filters.tag) {
    params.push(`%${filters.tag}%`);
    clauses.push(`sl.tags ILIKE $${params.length}`);
  }
  if (filters.language) {
    params.push(filters.language);
    clauses.push(`sl.language = $${params.length}`);
  }

  const whereClause = clauses.join(" AND ");
  const orderBy =
    filters.sort === "views"
      ? "sl.view_count DESC"
      : filters.sort === "school"
        ? "sd.name ASC, sl.published_at DESC"
        : "sl.published_at DESC";

  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const offset = (page - 1) * limit;

  const countResult = await queryPostgres<{ c: number }>(
    `
      SELECT COUNT(*)::int AS c
      FROM story_library sl
      JOIN schools_directory sd ON sd.id = sl.school_id
      WHERE ${whereClause}
    `,
    params,
  );
  const rowsResult = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        sl.id,
        sl.slug,
        sl.anthology_id AS "anthologyId",
        sa.slug AS "anthologySlug",
        sl.author_profile_id AS "authorProfileId",
        sl.title,
        sl.author_about AS "authorAbout",
        sl.excerpt,
        sl.content_text AS "contentText",
        sl.story_content_blocks AS "storyContentBlocks",
        sl.has_illustrations AS "hasIllustrations",
        sl.pdf_stored_path AS "pdfStoredPath",
        sl.cover_image_path AS "coverImagePath",
        sl.grade,
        sl.language,
        sl.tags,
        sl.page_start AS "pageStart",
        sl.page_end AS "pageEnd",
        sl.public_author_display AS "publicAuthorDisplay",
        sl.view_count AS "viewCount",
        (
          SELECT ROUND(AVG(sr.stars)::numeric, 1)
          FROM story_ratings sr
          WHERE sr.story_id = sl.id AND sr.status = 'visible'
        ) AS "averageStars",
        (
          SELECT COUNT(*)
          FROM story_ratings sr
          WHERE sr.story_id = sl.id AND sr.status = 'visible'
        )::int AS "ratingCount",
        (
          SELECT COUNT(*)
          FROM story_comments sc
          WHERE sc.story_id = sl.id AND sc.status = 'visible'
        )::int AS "commentCount",
        (
          SELECT sc.comment_text
          FROM story_comments sc
          WHERE sc.story_id = sl.id AND sc.status = 'visible'
          ORDER BY sc.created_at DESC
          LIMIT 1
        ) AS "latestCommentSnippet",
        sl.published_at::text AS "publishedAt",
        sl.school_id AS "schoolId",
        sd.name AS "schoolName",
        sd.district,
        COALESCE(sd.sub_region, '') AS "subRegion"
      FROM story_library sl
      JOIN schools_directory sd ON sd.id = sl.school_id
      LEFT JOIN story_anthologies sa ON sa.id = sl.anthology_id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, limit, offset],
  );

  return {
    stories: rowsResult.rows.map(mapPublishedStory),
    total: toNumber(countResult.rows[0]?.c),
  };
}

export async function listPublishedStoriesBySchoolPostgres(
  schoolId: number,
  limit = 6,
): Promise<PublishedStory[]> {
  const result = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        sl.id,
        sl.slug,
        sl.anthology_id AS "anthologyId",
        sa.slug AS "anthologySlug",
        sl.author_profile_id AS "authorProfileId",
        sl.title,
        sl.author_about AS "authorAbout",
        sl.excerpt,
        sl.content_text AS "contentText",
        sl.story_content_blocks AS "storyContentBlocks",
        sl.has_illustrations AS "hasIllustrations",
        sl.pdf_stored_path AS "pdfStoredPath",
        sl.cover_image_path AS "coverImagePath",
        sl.grade,
        sl.language,
        sl.tags,
        sl.page_start AS "pageStart",
        sl.page_end AS "pageEnd",
        sl.public_author_display AS "publicAuthorDisplay",
        sl.view_count AS "viewCount",
        (
          SELECT ROUND(AVG(sr.stars)::numeric, 1)
          FROM story_ratings sr
          WHERE sr.story_id = sl.id AND sr.status = 'visible'
        ) AS "averageStars",
        (
          SELECT COUNT(*)
          FROM story_ratings sr
          WHERE sr.story_id = sl.id AND sr.status = 'visible'
        )::int AS "ratingCount",
        (
          SELECT COUNT(*)
          FROM story_comments sc
          WHERE sc.story_id = sl.id AND sc.status = 'visible'
        )::int AS "commentCount",
        (
          SELECT sc.comment_text
          FROM story_comments sc
          WHERE sc.story_id = sl.id AND sc.status = 'visible'
          ORDER BY sc.created_at DESC
          LIMIT 1
        ) AS "latestCommentSnippet",
        sl.published_at::text AS "publishedAt",
        sl.school_id AS "schoolId",
        sd.name AS "schoolName",
        sd.district,
        COALESCE(sd.sub_region, '') AS "subRegion"
      FROM story_library sl
      JOIN schools_directory sd ON sd.id = sl.school_id
      LEFT JOIN story_anthologies sa ON sa.id = sl.anthology_id
      WHERE sl.school_id = $1
        AND sl.publish_status = 'published'
        AND sl.consent_status = 'approved'
      ORDER BY sl.published_at DESC
      LIMIT $2
    `,
    [schoolId, Math.min(Math.max(limit, 1), 24)],
  );
  return result.rows.map(mapPublishedStory);
}

export async function listPublishedStoriesByAnthologyPostgres(
  anthologyId: number,
): Promise<PublishedStory[]> {
  const result = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        sl.id,
        sl.slug,
        sl.anthology_id AS "anthologyId",
        sa.slug AS "anthologySlug",
        sl.author_profile_id AS "authorProfileId",
        sl.title,
        sl.author_about AS "authorAbout",
        sl.excerpt,
        sl.content_text AS "contentText",
        sl.story_content_blocks AS "storyContentBlocks",
        sl.has_illustrations AS "hasIllustrations",
        sl.pdf_stored_path AS "pdfStoredPath",
        sl.cover_image_path AS "coverImagePath",
        sl.grade,
        sl.language,
        sl.tags,
        sl.page_start AS "pageStart",
        sl.page_end AS "pageEnd",
        sl.public_author_display AS "publicAuthorDisplay",
        sl.view_count AS "viewCount",
        (
          SELECT ROUND(AVG(sr.stars)::numeric, 1)
          FROM story_ratings sr
          WHERE sr.story_id = sl.id AND sr.status = 'visible'
        ) AS "averageStars",
        (
          SELECT COUNT(*)
          FROM story_ratings sr
          WHERE sr.story_id = sl.id AND sr.status = 'visible'
        )::int AS "ratingCount",
        (
          SELECT COUNT(*)
          FROM story_comments sc
          WHERE sc.story_id = sl.id AND sc.status = 'visible'
        )::int AS "commentCount",
        (
          SELECT sc.comment_text
          FROM story_comments sc
          WHERE sc.story_id = sl.id AND sc.status = 'visible'
          ORDER BY sc.created_at DESC
          LIMIT 1
        ) AS "latestCommentSnippet",
        sl.published_at::text AS "publishedAt",
        sl.school_id AS "schoolId",
        sd.name AS "schoolName",
        sd.district,
        COALESCE(sd.sub_region, '') AS "subRegion"
      FROM story_library sl
      JOIN schools_directory sd ON sd.id = sl.school_id
      LEFT JOIN story_anthologies sa ON sa.id = sl.anthology_id
      WHERE sl.anthology_id = $1
        AND sl.publish_status = 'published'
        AND sl.consent_status = 'approved'
      ORDER BY sl.sort_order ASC, sl.page_start ASC, sl.title ASC
    `,
    [anthologyId],
  );
  return result.rows.map(mapPublishedStory);
}

export async function incrementStoryViewCountPostgres(storyId: number) {
  await queryPostgres(`UPDATE story_library SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`, [storyId]);
}

export async function listPublishedAnthologiesPostgres(options?: {
  limit?: number;
}): Promise<AnthologyRecord[]> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const result = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        sa.id,
        sa.slug,
        sa.title,
        sa.scope_type AS "scopeType",
        sa.scope_id AS "scopeId",
        sa.school_id AS "schoolId",
        sa.district_scope AS "districtScope",
        sa.edition,
        sa.pdf_stored_path AS "pdfStoredPath",
        sa.pdf_page_count AS "pdfPageCount",
        sa.cover_image_path AS "coverImagePath",
        sa.publish_status AS "publishStatus",
        sa.consent_status AS "consentStatus",
        sa.featured,
        sa.featured_rank AS "featuredRank",
        sa.download_count AS "downloadCount",
        sa.created_by_user_id AS "createdByUserId",
        sa.created_at::text AS "createdAt",
        sa.published_at::text AS "publishedAt",
        sd.name AS "schoolName"
      FROM story_anthologies sa
      LEFT JOIN schools_directory sd ON sd.id = sa.school_id
      WHERE sa.publish_status = 'published' AND sa.consent_status = 'approved'
      ORDER BY sa.featured DESC, sa.featured_rank ASC NULLS LAST, sa.published_at DESC, sa.created_at DESC
      LIMIT $1
    `,
    [limit],
  );
  return result.rows.map(mapAnthology);
}

export async function listPublishedAnthologiesBySchoolPostgres(
  schoolId: number,
  limit = 4,
): Promise<AnthologyRecord[]> {
  const result = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        sa.id,
        sa.slug,
        sa.title,
        sa.scope_type AS "scopeType",
        sa.scope_id AS "scopeId",
        sa.school_id AS "schoolId",
        sa.district_scope AS "districtScope",
        sa.edition,
        sa.pdf_stored_path AS "pdfStoredPath",
        sa.pdf_page_count AS "pdfPageCount",
        sa.cover_image_path AS "coverImagePath",
        sa.publish_status AS "publishStatus",
        sa.consent_status AS "consentStatus",
        sa.featured,
        sa.featured_rank AS "featuredRank",
        sa.download_count AS "downloadCount",
        sa.created_by_user_id AS "createdByUserId",
        sa.created_at::text AS "createdAt",
        sa.published_at::text AS "publishedAt",
        sd.name AS "schoolName"
      FROM story_anthologies sa
      LEFT JOIN schools_directory sd ON sd.id = sa.school_id
      WHERE sa.publish_status = 'published'
        AND sa.consent_status = 'approved'
        AND sa.school_id = $1
      ORDER BY sa.published_at DESC, sa.created_at DESC
      LIMIT $2
    `,
    [schoolId, Math.min(Math.max(limit, 1), 24)],
  );
  return result.rows.map(mapAnthology);
}

export async function getAnthologyBySlugPostgres(slug: string): Promise<AnthologyRecord | null> {
  const result = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        sa.id,
        sa.slug,
        sa.title,
        sa.scope_type AS "scopeType",
        sa.scope_id AS "scopeId",
        sa.school_id AS "schoolId",
        sa.district_scope AS "districtScope",
        sa.edition,
        sa.pdf_stored_path AS "pdfStoredPath",
        sa.pdf_page_count AS "pdfPageCount",
        sa.cover_image_path AS "coverImagePath",
        sa.publish_status AS "publishStatus",
        sa.consent_status AS "consentStatus",
        sa.featured,
        sa.featured_rank AS "featuredRank",
        sa.download_count AS "downloadCount",
        sa.created_by_user_id AS "createdByUserId",
        sa.created_at::text AS "createdAt",
        sa.published_at::text AS "publishedAt",
        sd.name AS "schoolName"
      FROM story_anthologies sa
      LEFT JOIN schools_directory sd ON sd.id = sa.school_id
      WHERE sa.slug = $1
        AND sa.publish_status = 'published'
        AND sa.consent_status = 'approved'
      LIMIT 1
    `,
    [slug],
  );
  const row = result.rows[0];
  return row ? mapAnthology(row) : null;
}

export async function listStoryLanguagesPostgres(): Promise<string[]> {
  const result = await queryPostgres<{ language: string }>(
    `
      SELECT DISTINCT language
      FROM story_library
      WHERE publish_status = 'published' AND consent_status = 'approved'
      ORDER BY language
    `,
  );
  return result.rows
    .map((row) => toText(row.language).trim())
    .filter(Boolean);
}

export async function listStoryTagsPostgres(): Promise<string[]> {
  const result = await queryPostgres<{ tags: string }>(
    `
      SELECT tags
      FROM story_library
      WHERE publish_status = 'published'
        AND consent_status = 'approved'
        AND COALESCE(tags, '') NOT IN ('', '[]')
    `,
  );
  const tags = new Set<string>();
  for (const row of result.rows) {
    parseJsonArray<string>(row.tags, []).forEach((tag) => {
      const normalized = toText(tag).trim();
      if (normalized) {
        tags.add(normalized);
      }
    });
  }
  return [...tags].sort((left, right) => left.localeCompare(right));
}

export async function addStoryRatingPostgres(
  storyId: number,
  stars: number,
  userId?: number,
  anonymousId?: string,
) {
  await queryPostgres(
    `
      INSERT INTO story_ratings (
        story_id,
        user_id,
        anonymous_id,
        stars,
        status
      ) VALUES ($1,$2,$3,$4,'visible')
    `,
    [storyId, userId ?? null, anonymousId ?? null, Math.max(1, Math.min(5, Math.trunc(stars)))],
  );
}

export async function getStoryRatingStatsPostgres(
  storyId: number,
): Promise<{ averageStars: number; ratingCount: number }> {
  const result = await queryPostgres<{ averageStars: number | null; ratingCount: number }>(
    `
      SELECT
        AVG(stars) AS "averageStars",
        COUNT(*)::int AS "ratingCount"
      FROM story_ratings
      WHERE story_id = $1
        AND status = 'visible'
    `,
    [storyId],
  );
  const row = result.rows[0];
  return {
    averageStars: row?.averageStars ? Number(Number(row.averageStars).toFixed(1)) : 0,
    ratingCount: toNumber(row?.ratingCount),
  };
}

export async function addStoryCommentPostgres(
  storyId: number,
  commentText: string,
  displayName?: string,
  userId?: number,
  anonymousId?: string,
): Promise<StoryComment> {
  const result = await queryPostgres<Record<string, unknown>>(
    `
      INSERT INTO story_comments (
        story_id,
        user_id,
        anonymous_id,
        display_name,
        comment_text,
        status
      ) VALUES ($1,$2,$3,$4,$5,'visible')
      RETURNING
        id,
        story_id AS "storyId",
        user_id AS "userId",
        anonymous_id AS "anonymousId",
        display_name AS "displayName",
        comment_text AS "commentText",
        created_at::text AS "createdAt",
        status,
        flagged_reason AS "flaggedReason"
    `,
    [storyId, userId ?? null, anonymousId ?? null, displayName ?? null, commentText.trim()],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to save comment.");
  }
  return mapStoryComment(row);
}

export async function listStoryCommentsPostgres(
  storyId: number,
  limit = 50,
): Promise<StoryComment[]> {
  const result = await queryPostgres<Record<string, unknown>>(
    `
      SELECT
        id,
        story_id AS "storyId",
        user_id AS "userId",
        anonymous_id AS "anonymousId",
        display_name AS "displayName",
        comment_text AS "commentText",
        created_at::text AS "createdAt",
        status,
        flagged_reason AS "flaggedReason"
      FROM story_comments
      WHERE story_id = $1
        AND status = 'visible'
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [storyId, Math.min(Math.max(limit, 1), 200)],
  );
  return result.rows.map(mapStoryComment);
}

// Story Management Functions
export async function getStoryByIdPostgres(id: number): Promise<any> {
    const result = await queryPostgres(`SELECT * FROM stories WHERE id = $1`, [id]);
    return result.rows[0];
}

export async function listStoryEntriesPostgres(filters: any = {}): Promise<any[]> {
    let query = `SELECT * FROM stories WHERE 1=1`;
    const params: any[] = [];
    if (filters.schoolId) {
        params.push(filters.schoolId);
        query += ` AND school_id = $${params.length}`;
    }
    query += ` ORDER BY created_at DESC`;
    const result = await queryPostgres(query, params);
    return result.rows;
}

export async function saveStoryEntryPostgres(input: any, userId: number): Promise<any> {
    const result = await queryPostgres(
        `INSERT INTO stories (title, content, author_name, school_id, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at AS "createdAt"`,
        [input.title, input.content, input.authorName, input.schoolId, userId]
    );
    return { id: result.rows[0].id, ...input, createdAt: result.rows[0].createdAt };
}

export async function deleteStoryEntryPostgres(id: number): Promise<void> {
    await queryPostgres(`DELETE FROM stories WHERE id = $1`, [id]);
}

export async function publishStoryEntryPostgres(id: number): Promise<void> {
    await queryPostgres(`UPDATE stories SET is_published = TRUE, published_at = NOW() WHERE id = $1`, [id]);
}

export async function unpublishStoryEntryPostgres(id: number): Promise<void> {
    await queryPostgres(`UPDATE stories SET is_published = FALSE WHERE id = $1`, [id]);
}

export async function listStoryAnthologiesPostgres(): Promise<any[]> {
    const result = await queryPostgres(`SELECT * FROM anthologies ORDER BY created_at DESC`);
    return result.rows;
}

export async function saveStoryAnthologyPostgres(input: any): Promise<any> {
    const result = await queryPostgres(
        `INSERT INTO anthologies (title, slug, scope_type, school_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [input.title, input.slug, input.scopeType, input.schoolId]
    );
    return { id: result.rows[0].id, ...input };
}
