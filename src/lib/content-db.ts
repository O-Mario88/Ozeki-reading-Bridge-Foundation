import {
  queryPostgres,
  requirePostgresConfigured,
} from "@/lib/server/postgres/client";
import {
  getOnlineTrainingEventViewById,
  listOnlineTrainingEventViews,
  scheduleOnlineTrainingSessionFromEvent,
  updateTrainingSessionAttendance,
} from "@/lib/training-db";
import {
  portalResourceSections,
} from "@/lib/types";
import type {
  OnlineTrainingEventRecord,
  PortalResourceRecord,
  PortalResourceSection,
  PortalUser,
} from "@/lib/types";

export type NewsletterIssueStatus = "draft" | "published";
export type NewsletterDispatchStatus = "sent" | "failed" | "skipped";

export type NewsletterIssueRecord = {
  id: number;
  slug: string;
  title: string;
  preheader: string;
  htmlContent: string;
  plainText: string;
  status: NewsletterIssueStatus;
  autoSendEnabled: boolean;
  publishedAt: string | null;
  autoSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsletterSubscriberRecord = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

export type NewsletterDispatchLogRecord = {
  id: number;
  issueId: number;
  recipientEmail: string;
  status: NewsletterDispatchStatus;
  providerMessage: string | null;
  sentAt: string;
  createdAt: string;
};

export type NewsletterDispatchWriteInput = {
  recipientEmail: string;
  status: NewsletterDispatchStatus;
  providerMessage?: string | null;
  sentAt?: string;
};

function canViewAllRecords(user: PortalUser) {
  return user.isSupervisor || user.isME || user.isAdmin || user.isSuperAdmin;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function stripHtmlToText(html: string) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNewsletterIssueStatus(
  status: NewsletterIssueStatus | string | null | undefined,
): NewsletterIssueStatus {
  return status === "published" ? "published" : "draft";
}

function slugifyNewsletterSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function parsePortalResourceRow(row: Record<string, unknown>): PortalResourceRecord {
  const sections = portalResourceSections as readonly string[];
  const sectionRaw = String(row.section ?? "Resources Library");
  return {
    id: Number(row.id),
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    grade: String(row.grade ?? "All Primary") as PortalResourceRecord["grade"],
    skill: String(row.skill ?? "Phonics") as PortalResourceRecord["skill"],
    type: String(row.type ?? "Guide") as PortalResourceRecord["type"],
    section: (sections.includes(sectionRaw) ? sectionRaw : "Resources Library") as PortalResourceSection,
    fileName: row.fileName ? String(row.fileName) : null,
    storedPath: row.storedPath ? String(row.storedPath) : null,
    mimeType: row.mimeType ? String(row.mimeType) : null,
    sizeBytes: row.sizeBytes === null || row.sizeBytes === undefined ? null : Number(row.sizeBytes),
    externalUrl: row.externalUrl ? String(row.externalUrl) : null,
    downloadLabel: row.downloadLabel ? String(row.downloadLabel) : null,
    isPublished: Boolean(row.isPublished),
    createdByUserId: Number(row.createdByUserId ?? 0),
    createdByName: String(row.createdByName ?? ""),
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
  };
}

function parseNewsletterIssueRow(row: Record<string, unknown>): NewsletterIssueRecord {
  return {
    id: Number(row.id),
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    preheader: String(row.preheader ?? ""),
    htmlContent: String(row.htmlContent ?? ""),
    plainText: String(row.plainText ?? ""),
    status: normalizeNewsletterIssueStatus(String(row.status ?? "draft")),
    autoSendEnabled: Boolean(row.autoSendEnabled),
    publishedAt: row.publishedAt ? String(row.publishedAt) : null,
    autoSentAt: row.autoSentAt ? String(row.autoSentAt) : null,
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
  };
}

function parseNewsletterDispatchLogRow(row: Record<string, unknown>): NewsletterDispatchLogRecord {
  return {
    id: Number(row.id),
    issueId: Number(row.issueId ?? 0),
    recipientEmail: String(row.recipientEmail ?? ""),
    status:
      row.status === "sent" || row.status === "failed" || row.status === "skipped"
        ? row.status
        : "failed",
    providerMessage: row.providerMessage ? String(row.providerMessage) : null,
    sentAt: String(row.sentAt ?? ""),
    createdAt: String(row.createdAt ?? ""),
  };
}

async function resolveUniqueResourceSlug(baseTitle: string) {
  requirePostgresConfigured();
  const baseSlug = slugify(baseTitle) || `resource-${Date.now()}`;
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const result = await queryPostgres(
      `SELECT 1 FROM portal_resources WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    if (result.rows.length === 0) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function resolveUniqueNewsletterSlug(rawSlug: string) {
  requirePostgresConfigured();
  const base = slugifyNewsletterSegment(rawSlug) || `newsletter-${new Date().toISOString().slice(0, 10)}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const result = await queryPostgres(
      `SELECT id FROM newsletter_issues WHERE slug = $1 LIMIT 1`,
      [candidate],
    );
    if (result.rows.length === 0) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function saveBooking(payload: {
  service: string;
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
  teachers: number;
  grades: string;
  challenges: string;
  location: string;
  preferredDate: string;
  preferredTime: string;
}) {
  requirePostgresConfigured();
  await queryPostgres(
    `
    INSERT INTO bookings (
      service, school_name, contact_name, email, phone, teachers, grades, challenges, location, preferred_date, preferred_time
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `,
    [
      payload.service,
      payload.schoolName,
      payload.contactName,
      payload.email,
      payload.phone,
      payload.teachers,
      payload.grades,
      payload.challenges,
      payload.location,
      payload.preferredDate,
      payload.preferredTime,
    ],
  );
}

export async function saveContact(payload: {
  type: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  message: string;
}) {
  requirePostgresConfigured();
  await queryPostgres(
    `
    INSERT INTO contacts (type, name, email, phone, organization, message)
    VALUES ($1,$2,$3,$4,$5,$6)
    `,
    [
      payload.type,
      payload.name,
      payload.email,
      payload.phone ?? null,
      payload.organization ?? null,
      payload.message,
    ],
  );
}

export async function saveDownloadLead(payload: {
  resourceSlug: string;
  name: string;
  email: string;
  organization?: string;
}) {
  requirePostgresConfigured();
  await queryPostgres(
    `
    INSERT INTO download_leads (resource_slug, name, email, organization)
    VALUES ($1,$2,$3,$4)
    `,
    [payload.resourceSlug, payload.name, payload.email, payload.organization ?? null],
  );
}

export async function savePortalResource(input: {
  title: string;
  description: string;
  grade: PortalResourceRecord["grade"];
  skill: PortalResourceRecord["skill"];
  type: PortalResourceRecord["type"];
  section: PortalResourceSection;
  fileName?: string | null;
  storedPath?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  externalUrl?: string | null;
  downloadLabel?: string | null;
  isPublished?: boolean;
  createdByUserId: number;
}): Promise<PortalResourceRecord> {
  requirePostgresConfigured();
  const slug = await resolveUniqueResourceSlug(input.title);
  const now = new Date().toISOString();

  const result = await queryPostgres(
    `
    INSERT INTO portal_resources (
      slug, title, description, grade, skill, type, section, file_name, stored_path, mime_type,
      size_bytes, external_url, download_label, is_published, created_by_user_id, created_at, updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::timestamptz,$17::timestamptz)
    RETURNING id
    `,
    [
      slug,
      input.title.trim(),
      input.description.trim(),
      input.grade,
      input.skill,
      input.type,
      input.section,
      input.fileName ?? null,
      input.storedPath ?? null,
      input.mimeType ?? null,
      input.sizeBytes ?? null,
      input.externalUrl ?? null,
      input.downloadLabel?.trim() || null,
      input.isPublished === false ? false : true,
      input.createdByUserId,
      now,
      now,
    ],
  );
  const id = Number(result.rows[0]?.id ?? 0);
  const row = await queryPostgres(
    `
    SELECT
      pr.id, pr.slug, pr.title, pr.description, pr.grade, pr.skill, pr.type, pr.section,
      pr.file_name AS "fileName", pr.stored_path AS "storedPath", pr.mime_type AS "mimeType",
      pr.size_bytes AS "sizeBytes", pr.external_url AS "externalUrl", pr.download_label AS "downloadLabel",
      pr.is_published AS "isPublished", pr.created_by_user_id AS "createdByUserId",
      pu.full_name AS "createdByName", pr.created_at::text AS "createdAt", pr.updated_at::text AS "updatedAt"
    FROM portal_resources pr
    JOIN portal_users pu ON pu.id = pr.created_by_user_id
    WHERE pr.id = $1
    LIMIT 1
    `,
    [id],
  );
  return parsePortalResourceRow(row.rows[0]);
}

export async function listPortalResources(user: PortalUser, limit = 180): Promise<PortalResourceRecord[]> {
  requirePostgresConfigured();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (!canViewAllRecords(user)) {
    params.push(user.id);
    clauses.push(`pr.created_by_user_id = $${params.length}`);
  }
  params.push(safeLimit);
  const result = await queryPostgres(
    `
    SELECT
      pr.id, pr.slug, pr.title, pr.description, pr.grade, pr.skill, pr.type, pr.section,
      pr.file_name AS "fileName", pr.stored_path AS "storedPath", pr.mime_type AS "mimeType",
      pr.size_bytes AS "sizeBytes", pr.external_url AS "externalUrl", pr.download_label AS "downloadLabel",
      pr.is_published AS "isPublished", pr.created_by_user_id AS "createdByUserId",
      pu.full_name AS "createdByName", pr.created_at::text AS "createdAt", pr.updated_at::text AS "updatedAt"
    FROM portal_resources pr
    JOIN portal_users pu ON pu.id = pr.created_by_user_id
    ${clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY pr.created_at DESC, pr.id DESC
    LIMIT $${params.length}
    `,
    params,
  );
  return result.rows.map((row) => parsePortalResourceRow(row));
}

export async function listPublishedPortalResources(
  limit = 250,
  options?: { sections?: PortalResourceSection[] },
): Promise<PortalResourceRecord[]> {
  requirePostgresConfigured();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
  const sections = options?.sections?.length ? options.sections : null;

  const params: unknown[] = [];
  const clauses = [`pr.is_published = TRUE`];
  if (sections) {
    params.push(sections);
    clauses.push(`pr.section = ANY($${params.length}::text[])`);
  }
  params.push(safeLimit);
  const result = await queryPostgres(
    `
    SELECT
      pr.id, pr.slug, pr.title, pr.description, pr.grade, pr.skill, pr.type, pr.section,
      pr.file_name AS "fileName", pr.stored_path AS "storedPath", pr.mime_type AS "mimeType",
      pr.size_bytes AS "sizeBytes", pr.external_url AS "externalUrl", pr.download_label AS "downloadLabel",
      pr.is_published AS "isPublished", pr.created_by_user_id AS "createdByUserId",
      pu.full_name AS "createdByName", pr.created_at::text AS "createdAt", pr.updated_at::text AS "updatedAt"
    FROM portal_resources pr
    JOIN portal_users pu ON pu.id = pr.created_by_user_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY pr.created_at DESC, pr.id DESC
    LIMIT $${params.length}
    `,
    params,
  );
  return result.rows.map((row) => parsePortalResourceRow(row));
}

export async function getPublishedPortalResourceById(id: number): Promise<PortalResourceRecord | null> {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
    SELECT
      pr.id, pr.slug, pr.title, pr.description, pr.grade, pr.skill, pr.type, pr.section,
      pr.file_name AS "fileName", pr.stored_path AS "storedPath", pr.mime_type AS "mimeType",
      pr.size_bytes AS "sizeBytes", pr.external_url AS "externalUrl", pr.download_label AS "downloadLabel",
      pr.is_published AS "isPublished", pr.created_by_user_id AS "createdByUserId",
      pu.full_name AS "createdByName", pr.created_at::text AS "createdAt", pr.updated_at::text AS "updatedAt"
    FROM portal_resources pr
    JOIN portal_users pu ON pu.id = pr.created_by_user_id
    WHERE pr.id = $1 AND pr.is_published = TRUE
    LIMIT 1
    `,
    [id],
  );
  return result.rows[0] ? parsePortalResourceRow(result.rows[0]) : null;
}

export async function saveNewsletterSubscriber(payload: { name: string; email: string }) {
  requirePostgresConfigured();
  await queryPostgres(
    `
    INSERT INTO newsletter_subscribers (name, email)
    VALUES ($1, $2)
    ON CONFLICT (email) DO NOTHING
    `,
    [payload.name, payload.email],
  );
}

export async function listNewsletterSubscribers(limit = 5000): Promise<NewsletterSubscriberRecord[]> {
  requirePostgresConfigured();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50000);
  const result = await queryPostgres(
    `
    SELECT id, name, email, created_at::text AS "createdAt"
    FROM newsletter_subscribers
    ORDER BY created_at DESC, id DESC
    LIMIT $1
    `,
    [safeLimit],
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    createdAt: String(row.createdAt ?? ""),
  }));
}

export async function listNewsletterSubscriberEmails() {
  return (await listNewsletterSubscribers(50000))
    .map((row) => row.email.trim().toLowerCase())
    .filter((email, index, list) => email.length > 3 && list.indexOf(email) === index);
}

export async function createNewsletterIssue(input: {
  title: string;
  preheader?: string;
  htmlContent: string;
  plainText?: string;
  status?: NewsletterIssueStatus;
  autoSendEnabled?: boolean;
  publishedAt?: string | null;
  slug?: string;
}): Promise<NewsletterIssueRecord> {
  requirePostgresConfigured();
  const title = input.title.trim();
  const htmlContent = input.htmlContent.trim();
  if (title.length < 3) {
    throw new Error("Newsletter title must be at least 3 characters.");
  }
  if (!htmlContent) {
    throw new Error("Newsletter HTML content is required.");
  }
  const status = normalizeNewsletterIssueStatus(input.status);
  const now = new Date().toISOString();
  const slug = await resolveUniqueNewsletterSlug(input.slug || title);
  const publishedAt = status === "published" ? input.publishedAt?.trim() || now : null;
  const plainText = input.plainText?.trim() || stripHtmlToText(htmlContent);

  const result = await queryPostgres(
    `
    INSERT INTO newsletter_issues (
      slug, title, preheader, html_content, plain_text, status, auto_send_enabled, published_at, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9::timestamptz,$10::timestamptz)
    RETURNING id
    `,
    [
      slug,
      title,
      input.preheader?.trim() || "",
      htmlContent,
      plainText,
      status,
      input.autoSendEnabled === false ? false : true,
      publishedAt,
      now,
      now,
    ],
  );
  return (await getNewsletterIssueById(Number(result.rows[0]?.id ?? 0))) as NewsletterIssueRecord;
}

export async function getNewsletterIssueById(id: number): Promise<NewsletterIssueRecord | null> {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
    SELECT
      id, slug, title, preheader,
      html_content AS "htmlContent",
      plain_text AS "plainText",
      status,
      auto_send_enabled AS "autoSendEnabled",
      published_at::text AS "publishedAt",
      auto_sent_at::text AS "autoSentAt",
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    FROM newsletter_issues
    WHERE id = $1
    LIMIT 1
    `,
    [id],
  );
  return result.rows[0] ? parseNewsletterIssueRow(result.rows[0]) : null;
}

export async function getNewsletterIssueBySlug(slug: string): Promise<NewsletterIssueRecord | null> {
  requirePostgresConfigured();
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const result = await queryPostgres(
    `
    SELECT
      id, slug, title, preheader,
      html_content AS "htmlContent",
      plain_text AS "plainText",
      status,
      auto_send_enabled AS "autoSendEnabled",
      published_at::text AS "publishedAt",
      auto_sent_at::text AS "autoSentAt",
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    FROM newsletter_issues
    WHERE lower(slug) = $1
    LIMIT 1
    `,
    [normalized],
  );
  return result.rows[0] ? parseNewsletterIssueRow(result.rows[0]) : null;
}

export async function getLatestPublishedNewsletterIssue(): Promise<NewsletterIssueRecord | null> {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
    SELECT
      id, slug, title, preheader,
      html_content AS "htmlContent",
      plain_text AS "plainText",
      status,
      auto_send_enabled AS "autoSendEnabled",
      published_at::text AS "publishedAt",
      auto_sent_at::text AS "autoSentAt",
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    FROM newsletter_issues
    WHERE status = 'published'
    ORDER BY COALESCE(published_at, created_at) DESC, id DESC
    LIMIT 1
    `,
  );
  return result.rows[0] ? parseNewsletterIssueRow(result.rows[0]) : null;
}

export async function listNewsletterIssues(input?: {
  status?: NewsletterIssueStatus;
  limit?: number;
}): Promise<NewsletterIssueRecord[]> {
  requirePostgresConfigured();
  const safeLimit = Math.min(Math.max(Math.trunc(input?.limit ?? 120), 1), 1000);
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (input?.status) {
    params.push(input.status);
    clauses.push(`status = $${params.length}`);
  }
  params.push(safeLimit);
  const result = await queryPostgres(
    `
    SELECT
      id, slug, title, preheader,
      html_content AS "htmlContent",
      plain_text AS "plainText",
      status,
      auto_send_enabled AS "autoSendEnabled",
      published_at::text AS "publishedAt",
      auto_sent_at::text AS "autoSentAt",
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    FROM newsletter_issues
    ${clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY COALESCE(published_at, created_at) DESC, id DESC
    LIMIT $${params.length}
    `,
    params,
  );
  return result.rows.map((row) => parseNewsletterIssueRow(row));
}

export async function listPendingNewsletterAutoSendIssues(limit = 20): Promise<NewsletterIssueRecord[]> {
  requirePostgresConfigured();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const result = await queryPostgres(
    `
    SELECT
      id, slug, title, preheader,
      html_content AS "htmlContent",
      plain_text AS "plainText",
      status,
      auto_send_enabled AS "autoSendEnabled",
      published_at::text AS "publishedAt",
      auto_sent_at::text AS "autoSentAt",
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    FROM newsletter_issues
    WHERE status = 'published'
      AND auto_send_enabled = TRUE
      AND auto_sent_at IS NULL
    ORDER BY COALESCE(published_at, created_at) ASC, id ASC
    LIMIT $1
    `,
    [safeLimit],
  );
  return result.rows.map((row) => parseNewsletterIssueRow(row));
}

export async function markNewsletterIssuePublished(issueId: number, publishedAt?: string) {
  requirePostgresConfigured();
  const now = new Date().toISOString();
  await queryPostgres(
    `
    UPDATE newsletter_issues
    SET status = 'published',
        published_at = $2::timestamptz,
        updated_at = $2::timestamptz
    WHERE id = $1
    `,
    [issueId, publishedAt?.trim() || now],
  );
  return getNewsletterIssueById(issueId);
}

export async function markNewsletterIssueAutoSent(issueId: number, sentAt?: string) {
  requirePostgresConfigured();
  const now = sentAt?.trim() || new Date().toISOString();
  await queryPostgres(
    `
    UPDATE newsletter_issues
    SET auto_sent_at = $2::timestamptz,
        updated_at = $2::timestamptz
    WHERE id = $1
    `,
    [issueId, now],
  );
}

export async function saveNewsletterDispatchLogs(issueId: number, rows: NewsletterDispatchWriteInput[]) {
  requirePostgresConfigured();
  if (rows.length === 0) {
    return { inserted: 0 };
  }
  const now = new Date().toISOString();

  for (const row of rows) {
    await queryPostgres(
      `
      INSERT INTO newsletter_dispatch_logs (
        issue_id, recipient_email, status, provider_message, sent_at, created_at
      ) VALUES ($1,$2,$3,$4,$5::timestamptz,$6::timestamptz)
      `,
      [
        issueId,
        row.recipientEmail.trim().toLowerCase(),
        row.status,
        row.providerMessage ?? null,
        row.sentAt?.trim() || now,
        now,
      ],
    );
  }
  return { inserted: rows.length };
}

export async function listNewsletterDispatchLogs(issueId: number, limit = 2000): Promise<NewsletterDispatchLogRecord[]> {
  requirePostgresConfigured();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50000);
  const result = await queryPostgres(
    `
    SELECT
      id,
      issue_id AS "issueId",
      recipient_email AS "recipientEmail",
      status,
      provider_message AS "providerMessage",
      sent_at::text AS "sentAt",
      created_at::text AS "createdAt"
    FROM newsletter_dispatch_logs
    WHERE issue_id = $1
    ORDER BY sent_at DESC, id DESC
    LIMIT $2
    `,
    [issueId, safeLimit],
  );
  return result.rows.map((row) => parseNewsletterDispatchLogRow(row));
}

export async function getNewsletterDispatchSummary(issueId: number) {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
    SELECT
      COUNT(*)::int AS total,
      COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0)::int AS "sentCount",
      COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0)::int AS "failedCount",
      COALESCE(SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END), 0)::int AS "skippedCount",
      MAX(sent_at)::text AS "lastSentAt"
    FROM newsletter_dispatch_logs
    WHERE issue_id = $1
    `,
    [issueId],
  );
  const row = result.rows[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    sent: Number(row.sentCount ?? 0),
    failed: Number(row.failedCount ?? 0),
    skipped: Number(row.skippedCount ?? 0),
    lastSentAt: row.lastSentAt ? String(row.lastSentAt) : null,
  };
}

export async function saveOnlineTrainingEvent(
  payload: {
    title: string;
    description?: string;
    audience: string;
    startDateTime: string;
    endDateTime: string;
    durationMinutes: number;
    attendeeEmails: string[];
    calendarEventId?: string | null;
    calendarLink?: string | null;
    meetLink?: string | null;
  },
  createdByUserId: number,
): Promise<OnlineTrainingEventRecord> {
  return scheduleOnlineTrainingSessionFromEvent(payload, createdByUserId);
}

export async function listOnlineTrainingEvents(limit = 20): Promise<OnlineTrainingEventRecord[]> {
  return listOnlineTrainingEventViews(limit);
}

export async function getOnlineTrainingEventById(eventId: number): Promise<OnlineTrainingEventRecord | null> {
  return getOnlineTrainingEventViewById(eventId);
}

export async function saveOnlineTrainingAttendance(
  eventId: number,
  input: {
    onlineTeachersTrained: number;
    onlineSchoolLeadersTrained: number;
    attendeeCount?: number;
    recordingUrl?: string | null;
    chatSummary?: string | null;
  },
) {
  return updateTrainingSessionAttendance(eventId, input);
}
