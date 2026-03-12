import { getDb } from "@/lib/db";
import { isPostgresConfigured, queryPostgres } from "@/lib/server/postgres/client";
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

function parseOnlineTrainingEventRow(row: Record<string, unknown>): OnlineTrainingEventRecord {
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : null,
    audience: String(row.audience ?? ""),
    startDateTime: String(row.startDateTime ?? ""),
    endDateTime: String(row.endDateTime ?? ""),
    durationMinutes: Number(row.durationMinutes ?? 0),
    attendeeCount: Number(row.attendeeCount ?? 0),
    onlineTeachersTrained: Number(row.onlineTeachersTrained ?? 0),
    onlineSchoolLeadersTrained: Number(row.onlineSchoolLeadersTrained ?? 0),
    calendarEventId: row.calendarEventId ? String(row.calendarEventId) : null,
    calendarLink: row.calendarLink ? String(row.calendarLink) : null,
    meetLink: row.meetLink ? String(row.meetLink) : null,
    recordingUrl: row.recordingUrl ? String(row.recordingUrl) : null,
    chatSummary: row.chatSummary ? String(row.chatSummary) : null,
    attendanceCapturedAt: row.attendanceCapturedAt ? String(row.attendanceCapturedAt) : null,
    createdAt: String(row.createdAt ?? ""),
  };
}

async function resolveUniqueResourceSlug(baseTitle: string) {
  const baseSlug = slugify(baseTitle) || `resource-${Date.now()}`;
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    if (isPostgresConfigured()) {
      const result = await queryPostgres(
        `SELECT 1 FROM portal_resources WHERE slug = $1 LIMIT 1`,
        [slug],
      );
      if (result.rows.length === 0) {
        return slug;
      }
    } else {
      const existing = getDb()
        .prepare(`SELECT 1 FROM portal_resources WHERE slug = @slug LIMIT 1`)
        .get({ slug });
      if (!existing) {
        return slug;
      }
    }
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function resolveUniqueNewsletterSlug(rawSlug: string) {
  const base = slugifyNewsletterSegment(rawSlug) || `newsletter-${new Date().toISOString().slice(0, 10)}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    if (isPostgresConfigured()) {
      const result = await queryPostgres(
        `SELECT id FROM newsletter_issues WHERE slug = $1 LIMIT 1`,
        [candidate],
      );
      if (result.rows.length === 0) {
        return candidate;
      }
    } else {
      const existing = getDb()
        .prepare(`SELECT id FROM newsletter_issues WHERE slug = @slug LIMIT 1`)
        .get({ slug: candidate });
      if (!existing) {
        return candidate;
      }
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
  if (isPostgresConfigured()) {
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
    return;
  }

  getDb()
    .prepare(
      `
      INSERT INTO bookings (
        service, school_name, contact_name, email, phone, teachers, grades, challenges, location, preferred_date, preferred_time
      ) VALUES (
        @service, @schoolName, @contactName, @email, @phone, @teachers, @grades, @challenges, @location, @preferredDate, @preferredTime
      )
    `,
    )
    .run(payload);
}

export async function saveContact(payload: {
  type: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  message: string;
}) {
  if (isPostgresConfigured()) {
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
    return;
  }

  getDb()
    .prepare(
      `
      INSERT INTO contacts (type, name, email, phone, organization, message)
      VALUES (@type, @name, @email, @phone, @organization, @message)
    `,
    )
    .run(payload);
}

export async function saveDownloadLead(payload: {
  resourceSlug: string;
  name: string;
  email: string;
  organization?: string;
}) {
  if (isPostgresConfigured()) {
    await queryPostgres(
      `
      INSERT INTO download_leads (resource_slug, name, email, organization)
      VALUES ($1,$2,$3,$4)
      `,
      [payload.resourceSlug, payload.name, payload.email, payload.organization ?? null],
    );
    return;
  }

  getDb()
    .prepare(
      `
      INSERT INTO download_leads (resource_slug, name, email, organization)
      VALUES (@resourceSlug, @name, @email, @organization)
    `,
    )
    .run(payload);
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
  const slug = await resolveUniqueResourceSlug(input.title);
  const now = new Date().toISOString();

  if (isPostgresConfigured()) {
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

  const db = getDb();
  const insertResult = db
    .prepare(
      `
      INSERT INTO portal_resources (
        slug, title, description, grade, skill, type, section, file_name, stored_path, mime_type,
        size_bytes, external_url, download_label, is_published, created_by_user_id, created_at, updated_at
      ) VALUES (
        @slug, @title, @description, @grade, @skill, @type, @section, @fileName, @storedPath, @mimeType,
        @sizeBytes, @externalUrl, @downloadLabel, @isPublished, @createdByUserId, @createdAt, @updatedAt
      )
    `,
    )
    .run({
      slug,
      title: input.title.trim(),
      description: input.description.trim(),
      grade: input.grade,
      skill: input.skill,
      type: input.type,
      section: input.section,
      fileName: input.fileName ?? null,
      storedPath: input.storedPath ?? null,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
      externalUrl: input.externalUrl ?? null,
      downloadLabel: input.downloadLabel?.trim() || null,
      isPublished: input.isPublished === false ? 0 : 1,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    });

  const row = db
    .prepare(
      `
      SELECT
        pr.id, pr.slug, pr.title, pr.description, pr.grade, pr.skill, pr.type, pr.section,
        pr.file_name AS fileName, pr.stored_path AS storedPath, pr.mime_type AS mimeType,
        pr.size_bytes AS sizeBytes, pr.external_url AS externalUrl, pr.download_label AS downloadLabel,
        pr.is_published AS isPublished, pr.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName, pr.created_at AS createdAt, pr.updated_at AS updatedAt
      FROM portal_resources pr
      JOIN portal_users pu ON pu.id = pr.created_by_user_id
      WHERE pr.id = @id
      LIMIT 1
      `,
    )
    .get({ id: Number(insertResult.lastInsertRowid) }) as Record<string, unknown>;

  return parsePortalResourceRow(row);
}

export async function listPortalResources(user: PortalUser, limit = 180): Promise<PortalResourceRecord[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
  if (isPostgresConfigured()) {
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

  const rows = getDb()
    .prepare(
      `
      SELECT
        pr.id, pr.slug, pr.title, pr.description, pr.grade, pr.skill, pr.type, pr.section,
        pr.file_name AS fileName, pr.stored_path AS storedPath, pr.mime_type AS mimeType,
        pr.size_bytes AS sizeBytes, pr.external_url AS externalUrl, pr.download_label AS downloadLabel,
        pr.is_published AS isPublished, pr.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName, pr.created_at AS createdAt, pr.updated_at AS updatedAt
      FROM portal_resources pr
      JOIN portal_users pu ON pu.id = pr.created_by_user_id
      ${canViewAllRecords(user) ? "" : "WHERE pr.created_by_user_id = @createdByUserId"}
      ORDER BY pr.created_at DESC, pr.id DESC
      LIMIT @limit
      `,
    )
    .all(canViewAllRecords(user) ? { limit: safeLimit } : { createdByUserId: user.id, limit: safeLimit }) as Array<Record<string, unknown>>;
  return rows.map((row) => parsePortalResourceRow(row));
}

export async function listPublishedPortalResources(
  limit = 250,
  options?: { sections?: PortalResourceSection[] },
): Promise<PortalResourceRecord[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
  const sections = options?.sections?.length ? options.sections : null;

  if (isPostgresConfigured()) {
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

  const whereClauses = ["pr.is_published = 1"];
  const params: Record<string, string | number> = { limit: safeLimit };
  if (sections) {
    const placeholders = sections.map((_, index) => `@section${index}`);
    whereClauses.push(`pr.section IN (${placeholders.join(", ")})`);
    sections.forEach((section, index) => {
      params[`section${index}`] = section;
    });
  }
  const rows = getDb()
    .prepare(
      `
      SELECT
        pr.id, pr.slug, pr.title, pr.description, pr.grade, pr.skill, pr.type, pr.section,
        pr.file_name AS fileName, pr.stored_path AS storedPath, pr.mime_type AS mimeType,
        pr.size_bytes AS sizeBytes, pr.external_url AS externalUrl, pr.download_label AS downloadLabel,
        pr.is_published AS isPublished, pr.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName, pr.created_at AS createdAt, pr.updated_at AS updatedAt
      FROM portal_resources pr
      JOIN portal_users pu ON pu.id = pr.created_by_user_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY pr.created_at DESC, pr.id DESC
      LIMIT @limit
      `,
    )
    .all(params) as Array<Record<string, unknown>>;
  return rows.map((row) => parsePortalResourceRow(row));
}

export async function getPublishedPortalResourceById(id: number): Promise<PortalResourceRecord | null> {
  if (isPostgresConfigured()) {
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

  const row = getDb()
    .prepare(
      `
      SELECT
        pr.id, pr.slug, pr.title, pr.description, pr.grade, pr.skill, pr.type, pr.section,
        pr.file_name AS fileName, pr.stored_path AS storedPath, pr.mime_type AS mimeType,
        pr.size_bytes AS sizeBytes, pr.external_url AS externalUrl, pr.download_label AS downloadLabel,
        pr.is_published AS isPublished, pr.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName, pr.created_at AS createdAt, pr.updated_at AS updatedAt
      FROM portal_resources pr
      JOIN portal_users pu ON pu.id = pr.created_by_user_id
      WHERE pr.id = @id AND pr.is_published = 1
      LIMIT 1
      `,
    )
    .get({ id }) as Record<string, unknown> | undefined;
  return row ? parsePortalResourceRow(row) : null;
}

export async function saveNewsletterSubscriber(payload: { name: string; email: string }) {
  if (isPostgresConfigured()) {
    await queryPostgres(
      `
      INSERT INTO newsletter_subscribers (name, email)
      VALUES ($1, $2)
      ON CONFLICT (email) DO NOTHING
      `,
      [payload.name, payload.email],
    );
    return;
  }

  getDb()
    .prepare(
      `
      INSERT INTO newsletter_subscribers (name, email)
      VALUES (@name, @email)
      ON CONFLICT(email) DO NOTHING
      `,
    )
    .run(payload);
}

export async function listNewsletterSubscribers(limit = 5000): Promise<NewsletterSubscriberRecord[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50000);
  if (isPostgresConfigured()) {
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
  const rows = getDb()
    .prepare(
      `
      SELECT id, name, email, created_at AS createdAt
      FROM newsletter_subscribers
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT @limit
      `,
    )
    .all({ limit: safeLimit }) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
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

  if (isPostgresConfigured()) {
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

  const result = getDb()
    .prepare(
      `
      INSERT INTO newsletter_issues (
        slug, title, preheader, html_content, plain_text, status, auto_send_enabled, published_at, created_at, updated_at
      ) VALUES (
        @slug, @title, @preheader, @htmlContent, @plainText, @status, @autoSendEnabled, @publishedAt, @createdAt, @updatedAt
      )
      `,
    )
    .run({
      slug,
      title,
      preheader: input.preheader?.trim() || "",
      htmlContent,
      plainText,
      status,
      autoSendEnabled: input.autoSendEnabled === false ? 0 : 1,
      publishedAt,
      createdAt: now,
      updatedAt: now,
    });
  return (await getNewsletterIssueById(Number(result.lastInsertRowid))) as NewsletterIssueRecord;
}

export async function getNewsletterIssueById(id: number): Promise<NewsletterIssueRecord | null> {
  if (isPostgresConfigured()) {
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
  const row = getDb()
    .prepare(
      `
      SELECT
        id, slug, title, preheader,
        html_content AS htmlContent,
        plain_text AS plainText,
        status,
        auto_send_enabled AS autoSendEnabled,
        published_at AS publishedAt,
        auto_sent_at AS autoSentAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM newsletter_issues
      WHERE id = @id
      LIMIT 1
      `,
    )
    .get({ id }) as Record<string, unknown> | undefined;
  return row ? parseNewsletterIssueRow(row) : null;
}

export async function getNewsletterIssueBySlug(slug: string): Promise<NewsletterIssueRecord | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (isPostgresConfigured()) {
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
  const row = getDb()
    .prepare(
      `
      SELECT
        id, slug, title, preheader,
        html_content AS htmlContent,
        plain_text AS plainText,
        status,
        auto_send_enabled AS autoSendEnabled,
        published_at AS publishedAt,
        auto_sent_at AS autoSentAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM newsletter_issues
      WHERE lower(slug) = @slug
      LIMIT 1
      `,
    )
    .get({ slug: normalized }) as Record<string, unknown> | undefined;
  return row ? parseNewsletterIssueRow(row) : null;
}

export async function getLatestPublishedNewsletterIssue(): Promise<NewsletterIssueRecord | null> {
  if (isPostgresConfigured()) {
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
  const row = getDb()
    .prepare(
      `
      SELECT
        id, slug, title, preheader,
        html_content AS htmlContent,
        plain_text AS plainText,
        status,
        auto_send_enabled AS autoSendEnabled,
        published_at AS publishedAt,
        auto_sent_at AS autoSentAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM newsletter_issues
      WHERE status = 'published'
      ORDER BY datetime(COALESCE(published_at, created_at)) DESC, id DESC
      LIMIT 1
      `,
    )
    .get() as Record<string, unknown> | undefined;
  return row ? parseNewsletterIssueRow(row) : null;
}

export async function listNewsletterIssues(input?: {
  status?: NewsletterIssueStatus;
  limit?: number;
}): Promise<NewsletterIssueRecord[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(input?.limit ?? 120), 1), 1000);
  if (isPostgresConfigured()) {
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
  const rows = getDb()
    .prepare(
      `
      SELECT
        id, slug, title, preheader,
        html_content AS htmlContent,
        plain_text AS plainText,
        status,
        auto_send_enabled AS autoSendEnabled,
        published_at AS publishedAt,
        auto_sent_at AS autoSentAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM newsletter_issues
      ${input?.status ? "WHERE status = @status" : ""}
      ORDER BY datetime(COALESCE(published_at, created_at)) DESC, id DESC
      LIMIT @limit
      `,
    )
    .all(input?.status ? { status: input.status, limit: safeLimit } : { limit: safeLimit }) as Array<Record<string, unknown>>;
  return rows.map((row) => parseNewsletterIssueRow(row));
}

export async function listPendingNewsletterAutoSendIssues(limit = 20): Promise<NewsletterIssueRecord[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  if (isPostgresConfigured()) {
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
  const rows = getDb()
    .prepare(
      `
      SELECT
        id, slug, title, preheader,
        html_content AS htmlContent,
        plain_text AS plainText,
        status,
        auto_send_enabled AS autoSendEnabled,
        published_at AS publishedAt,
        auto_sent_at AS autoSentAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM newsletter_issues
      WHERE status = 'published'
        AND auto_send_enabled = 1
        AND auto_sent_at IS NULL
      ORDER BY datetime(COALESCE(published_at, created_at)) ASC, id ASC
      LIMIT @limit
      `,
    )
    .all({ limit: safeLimit }) as Array<Record<string, unknown>>;
  return rows.map((row) => parseNewsletterIssueRow(row));
}

export async function markNewsletterIssuePublished(issueId: number, publishedAt?: string) {
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
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
  getDb()
    .prepare(
      `
      UPDATE newsletter_issues
      SET status = 'published',
          published_at = @publishedAt,
          updated_at = @updatedAt
      WHERE id = @id
      `,
    )
    .run({
      id: issueId,
      publishedAt: publishedAt?.trim() || now,
      updatedAt: now,
    });
  return getNewsletterIssueById(issueId);
}

export async function markNewsletterIssueAutoSent(issueId: number, sentAt?: string) {
  const now = sentAt?.trim() || new Date().toISOString();
  if (isPostgresConfigured()) {
    await queryPostgres(
      `
      UPDATE newsletter_issues
      SET auto_sent_at = $2::timestamptz,
          updated_at = $2::timestamptz
      WHERE id = $1
      `,
      [issueId, now],
    );
    return;
  }
  getDb()
    .prepare(
      `
      UPDATE newsletter_issues
      SET auto_sent_at = @sentAt,
          updated_at = @updatedAt
      WHERE id = @id
      `,
    )
    .run({ id: issueId, sentAt: now, updatedAt: now });
}

export async function saveNewsletterDispatchLogs(issueId: number, rows: NewsletterDispatchWriteInput[]) {
  if (rows.length === 0) {
    return { inserted: 0 };
  }
  const now = new Date().toISOString();

  if (isPostgresConfigured()) {
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

  const db = getDb();
  const insert = db.prepare(
    `
    INSERT INTO newsletter_dispatch_logs (
      issue_id, recipient_email, status, provider_message, sent_at, created_at
    ) VALUES (
      @issueId, @recipientEmail, @status, @providerMessage, @sentAt, @createdAt
    )
    `,
  );
  const transaction = db.transaction((inputs: NewsletterDispatchWriteInput[]) => {
    inputs.forEach((row) => {
      insert.run({
        issueId,
        recipientEmail: row.recipientEmail.trim().toLowerCase(),
        status: row.status,
        providerMessage: row.providerMessage ?? null,
        sentAt: row.sentAt?.trim() || now,
        createdAt: now,
      });
    });
  });
  transaction(rows);
  return { inserted: rows.length };
}

export async function listNewsletterDispatchLogs(issueId: number, limit = 2000): Promise<NewsletterDispatchLogRecord[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50000);
  if (isPostgresConfigured()) {
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
  const rows = getDb()
    .prepare(
      `
      SELECT
        id,
        issue_id AS issueId,
        recipient_email AS recipientEmail,
        status,
        provider_message AS providerMessage,
        sent_at AS sentAt,
        created_at AS createdAt
      FROM newsletter_dispatch_logs
      WHERE issue_id = @issueId
      ORDER BY datetime(sent_at) DESC, id DESC
      LIMIT @limit
      `,
    )
    .all({ issueId, limit: safeLimit }) as Array<Record<string, unknown>>;
  return rows.map((row) => parseNewsletterDispatchLogRow(row));
}

export async function getNewsletterDispatchSummary(issueId: number) {
  if (isPostgresConfigured()) {
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

  const row = getDb()
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sentCount,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedCount,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) AS skippedCount,
        MAX(sent_at) AS lastSentAt
      FROM newsletter_dispatch_logs
      WHERE issue_id = @issueId
      `,
    )
    .get({ issueId }) as Record<string, unknown>;

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
  if (isPostgresConfigured()) {
    const result = await queryPostgres(
      `
      INSERT INTO online_training_events (
        title, description, audience, start_datetime, end_datetime, duration_minutes, attendee_emails,
        attendee_count, online_teachers_trained, online_school_leaders_trained, calendar_event_id,
        calendar_link, meet_link, created_by_user_id
      ) VALUES (
        $1,$2,$3,$4::timestamptz,$5::timestamptz,$6,$7,$8,0,0,$9,$10,$11,$12
      )
      RETURNING id
      `,
      [
        payload.title,
        payload.description?.trim() ? payload.description : null,
        payload.audience,
        payload.startDateTime,
        payload.endDateTime,
        payload.durationMinutes,
        payload.attendeeEmails.join(","),
        payload.attendeeEmails.length,
        payload.calendarEventId ?? null,
        payload.calendarLink ?? null,
        payload.meetLink ?? null,
        createdByUserId,
      ],
    );
    return (await getOnlineTrainingEventById(Number(result.rows[0]?.id ?? 0))) as OnlineTrainingEventRecord;
  }

  const db = getDb();
  const insertResult = db
    .prepare(
      `
      INSERT INTO online_training_events (
        title, description, audience, start_datetime, end_datetime, duration_minutes, attendee_emails,
        attendee_count, online_teachers_trained, online_school_leaders_trained, calendar_event_id,
        calendar_link, meet_link, created_by_user_id
      ) VALUES (
        @title, @description, @audience, @startDateTime, @endDateTime, @durationMinutes, @attendeeEmails,
        @attendeeCount, @onlineTeachersTrained, @onlineSchoolLeadersTrained, @calendarEventId,
        @calendarLink, @meetLink, @createdByUserId
      )
      `,
    )
    .run({
      title: payload.title,
      description: payload.description?.trim() ? payload.description : null,
      audience: payload.audience,
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      durationMinutes: payload.durationMinutes,
      attendeeEmails: payload.attendeeEmails.join(","),
      attendeeCount: payload.attendeeEmails.length,
      onlineTeachersTrained: 0,
      onlineSchoolLeadersTrained: 0,
      calendarEventId: payload.calendarEventId ?? null,
      calendarLink: payload.calendarLink ?? null,
      meetLink: payload.meetLink ?? null,
      createdByUserId,
    });
  return (await getOnlineTrainingEventById(Number(insertResult.lastInsertRowid))) as OnlineTrainingEventRecord;
}

export async function listOnlineTrainingEvents(limit = 20): Promise<OnlineTrainingEventRecord[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  if (isPostgresConfigured()) {
    const result = await queryPostgres(
      `
      SELECT
        id, title, description, audience,
        start_datetime::text AS "startDateTime",
        end_datetime::text AS "endDateTime",
        duration_minutes AS "durationMinutes",
        attendee_count AS "attendeeCount",
        online_teachers_trained AS "onlineTeachersTrained",
        online_school_leaders_trained AS "onlineSchoolLeadersTrained",
        calendar_event_id AS "calendarEventId",
        calendar_link AS "calendarLink",
        meet_link AS "meetLink",
        recording_url AS "recordingUrl",
        chat_summary AS "chatSummary",
        attendance_captured_at::text AS "attendanceCapturedAt",
        created_at::text AS "createdAt"
      FROM online_training_events
      ORDER BY start_datetime DESC, id DESC
      LIMIT $1
      `,
      [safeLimit],
    );
    return result.rows.map((row) => parseOnlineTrainingEventRow(row));
  }
  const rows = getDb()
    .prepare(
      `
      SELECT
        id, title, description, audience,
        start_datetime AS startDateTime,
        end_datetime AS endDateTime,
        duration_minutes AS durationMinutes,
        attendee_count AS attendeeCount,
        online_teachers_trained AS onlineTeachersTrained,
        online_school_leaders_trained AS onlineSchoolLeadersTrained,
        calendar_event_id AS calendarEventId,
        calendar_link AS calendarLink,
        meet_link AS meetLink,
        recording_url AS recordingUrl,
        chat_summary AS chatSummary,
        attendance_captured_at AS attendanceCapturedAt,
        created_at AS createdAt
      FROM online_training_events
      ORDER BY start_datetime DESC, id DESC
      LIMIT @limit
      `,
    )
    .all({ limit: safeLimit }) as Array<Record<string, unknown>>;
  return rows.map((row) => parseOnlineTrainingEventRow(row));
}

export async function getOnlineTrainingEventById(eventId: number): Promise<OnlineTrainingEventRecord | null> {
  if (isPostgresConfigured()) {
    const result = await queryPostgres(
      `
      SELECT
        id, title, description, audience,
        start_datetime::text AS "startDateTime",
        end_datetime::text AS "endDateTime",
        duration_minutes AS "durationMinutes",
        attendee_count AS "attendeeCount",
        online_teachers_trained AS "onlineTeachersTrained",
        online_school_leaders_trained AS "onlineSchoolLeadersTrained",
        calendar_event_id AS "calendarEventId",
        calendar_link AS "calendarLink",
        meet_link AS "meetLink",
        recording_url AS "recordingUrl",
        chat_summary AS "chatSummary",
        attendance_captured_at::text AS "attendanceCapturedAt",
        created_at::text AS "createdAt"
      FROM online_training_events
      WHERE id = $1
      LIMIT 1
      `,
      [eventId],
    );
    return result.rows[0] ? parseOnlineTrainingEventRow(result.rows[0]) : null;
  }
  const row = getDb()
    .prepare(
      `
      SELECT
        id, title, description, audience,
        start_datetime AS startDateTime,
        end_datetime AS endDateTime,
        duration_minutes AS durationMinutes,
        attendee_count AS attendeeCount,
        online_teachers_trained AS onlineTeachersTrained,
        online_school_leaders_trained AS onlineSchoolLeadersTrained,
        calendar_event_id AS calendarEventId,
        calendar_link AS calendarLink,
        meet_link AS meetLink,
        recording_url AS recordingUrl,
        chat_summary AS chatSummary,
        attendance_captured_at AS attendanceCapturedAt,
        created_at AS createdAt
      FROM online_training_events
      WHERE id = @eventId
      LIMIT 1
      `,
    )
    .get({ eventId }) as Record<string, unknown> | undefined;
  return row ? parseOnlineTrainingEventRow(row) : null;
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
  const attendeeCount =
    input.attendeeCount !== undefined
      ? Math.max(0, Math.floor(input.attendeeCount))
      : Math.max(
          0,
          Math.floor(input.onlineTeachersTrained) + Math.floor(input.onlineSchoolLeadersTrained),
        );
  const capturedAt = new Date().toISOString();

  if (isPostgresConfigured()) {
    await queryPostgres(
      `
      UPDATE online_training_events
      SET
        online_teachers_trained = $2,
        online_school_leaders_trained = $3,
        attendee_count = $4,
        recording_url = $5,
        chat_summary = $6,
        attendance_captured_at = $7::timestamptz
      WHERE id = $1
      `,
      [
        eventId,
        Math.max(0, Math.floor(input.onlineTeachersTrained)),
        Math.max(0, Math.floor(input.onlineSchoolLeadersTrained)),
        attendeeCount,
        input.recordingUrl?.trim() ? input.recordingUrl.trim() : null,
        input.chatSummary?.trim() ? input.chatSummary.trim() : null,
        capturedAt,
      ],
    );
    return getOnlineTrainingEventById(eventId);
  }

  getDb()
    .prepare(
      `
      UPDATE online_training_events
      SET
        online_teachers_trained = @onlineTeachersTrained,
        online_school_leaders_trained = @onlineSchoolLeadersTrained,
        attendee_count = @attendeeCount,
        recording_url = @recordingUrl,
        chat_summary = @chatSummary,
        attendance_captured_at = @attendanceCapturedAt
      WHERE id = @eventId
      `,
    )
    .run({
      eventId,
      onlineTeachersTrained: Math.max(0, Math.floor(input.onlineTeachersTrained)),
      onlineSchoolLeadersTrained: Math.max(0, Math.floor(input.onlineSchoolLeadersTrained)),
      attendeeCount,
      recordingUrl: input.recordingUrl?.trim() ? input.recordingUrl.trim() : null,
      chatSummary: input.chatSummary?.trim() ? input.chatSummary.trim() : null,
      attendanceCapturedAt: capturedAt,
    });
  return getOnlineTrainingEventById(eventId);
}
