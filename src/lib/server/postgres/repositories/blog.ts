import { queryPostgres, withPostgresClient, requirePostgresConfigured } from "@/lib/server/postgres/client";
import { blogPosts as staticBlogPosts } from "@/lib/content";
import { sanitizeInlineRichText, stripHtmlTags } from "@/lib/rich-text";
import type {
  BlogArticleType,
  BlogBodyBlock,
  BlogBodyBlockType,
  BlogComment,
  BlogEngagement,
  BlogPost,
  BlogPostSection,
  PortalBlogPostRecord,
  PortalBlogPublishStatus,
  PortalUser,
} from "@/lib/types";

const STATIC_BLOG_SLUGS = new Set(staticBlogPosts.map((post) => post.slug));
const FALLBACK_READ_TIME = "5 min read";

const SELECT_PORTAL_BLOG_COLUMNS_POSTGRES = `
  id,
  slug,
  title,
  subtitle,
  excerpt,
  category,
  author_name AS "authorName",
  author_role AS "authorRole",
  published_at::text AS "publishedAt",
  read_time AS "readTime",
  read_time_minutes AS "readTimeMinutes",
  tags_json AS "tagsJson",
  sections_json AS "sectionsJson",
  body_blocks_json AS "bodyBlocksJson",
  media_image_url AS "mediaImageUrl",
  media_video_url AS "mediaVideoUrl",
  article_type AS "articleType",
  featured_image_url AS "featuredImageUrl",
  featured_image_alt AS "featuredImageAlt",
  featured_image_caption AS "featuredImageCaption",
  featured_image_credit AS "featuredImageCredit",
  primary_category AS "primaryCategory",
  secondary_categories_json AS "secondaryCategoriesJson",
  author_bio AS "authorBio",
  seo_title AS "seoTitle",
  meta_description AS "metaDescription",
  social_image_url AS "socialImageUrl",
  canonical_url AS "canonicalUrl",
  publish_status AS "publishStatus",
  created_by_user_id AS "createdByUserId",
  created_by_user_name AS "createdByUserName",
  created_at::text AS "createdAt",
  updated_at::text AS "updatedAt"
`;

// --- Helpers ---

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function parseStringArrayJson(value: string | null | undefined) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeSections(value: unknown): BlogPostSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as Record<string, any>;
      const heading = (typeof obj.heading === "string" ? obj.heading : "").trim().slice(0, 140);
      const paragraphs = Array.isArray(obj.paragraphs)
        ? obj.paragraphs
            .filter((p: any): p is string => typeof p === "string")
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => p.slice(0, 50000))
        : [];
      if (paragraphs.length === 0) return null;
      return { heading: heading || `Section ${index + 1}`, paragraphs };
    })
    .filter((section): section is BlogPostSection => section !== null);
}

function normalizeBodyBlocks(value: unknown): BlogBodyBlock[] {
  if (!Array.isArray(value)) return [];
  const validTypes = new Set<BlogBodyBlockType>([
    "paragraph", "heading2", "heading3", "bullet_list", "numbered_list",
    "quote", "image", "callout", "stat", "divider", "cta_inline",
  ]);
  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as Record<string, any>;
      const type = typeof obj.type === "string" && validTypes.has(obj.type as BlogBodyBlockType)
        ? (obj.type as BlogBodyBlockType) : null;
      if (!type) return null;
      const items = Array.isArray(obj.items)
        ? obj.items
            .filter((p: any): p is string => typeof p === "string")
            .map((p) => sanitizeInlineRichText(p.trim()))
            .filter(Boolean)
            .slice(0, 30)
        : null;
      return {
        id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `block-${index + 1}`,
        type,
        text: typeof obj.text === "string" ? sanitizeInlineRichText(obj.text.trim()) : null,
        heading: typeof obj.heading === "string" ? sanitizeInlineRichText(obj.heading.trim()) : null,
        items,
        quoteAttribution: typeof obj.quoteAttribution === "string" ? sanitizeInlineRichText(obj.quoteAttribution.trim()) : null,
        imageUrl: typeof obj.imageUrl === "string" ? obj.imageUrl.trim() : null,
        imageAlt: typeof obj.imageAlt === "string" ? stripHtmlTags(obj.imageAlt) : null,
        imageCaption: typeof obj.imageCaption === "string" ? stripHtmlTags(obj.imageCaption) : null,
        imageCredit: typeof obj.imageCredit === "string" ? stripHtmlTags(obj.imageCredit) : null,
        imageWidthStyle: ["full", "contained", "small"].includes(obj.imageWidthStyle) ? obj.imageWidthStyle : null,
        calloutTitle: typeof obj.calloutTitle === "string" ? sanitizeInlineRichText(obj.calloutTitle.trim()) : null,
        calloutTone: ["neutral", "info", "success", "warning", "critical"].includes(obj.calloutTone) ? obj.calloutTone : null,
        statLabel: typeof obj.statLabel === "string" ? sanitizeInlineRichText(obj.statLabel.trim()) : null,
        statValue: typeof obj.statValue === "string" ? sanitizeInlineRichText(obj.statValue.trim()) : null,
        ctaLabel: typeof obj.ctaLabel === "string" ? sanitizeInlineRichText(obj.ctaLabel.trim()) : null,
        ctaUrl: typeof obj.ctaUrl === "string" ? obj.ctaUrl.trim() : null,
        tocLabel: typeof obj.tocLabel === "string" ? stripHtmlTags(obj.tocLabel) : null,
        hideFromToc: obj.hideFromToc === true,
      } as BlogBodyBlock;
    })
    .filter((block): block is BlogBodyBlock => block !== null);
}



function inferReadTimeFromBodyBlocks(bodyBlocks: BlogBodyBlock[]) {
  const text = bodyBlocks.flatMap(b => [b.heading, b.text, ...(b.items || []), b.calloutTitle, b.statLabel, b.statValue, b.ctaLabel].filter(Boolean).map(t => stripHtmlTags(t!))).join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words <= 0) return { readTimeMinutes: 5, readTime: FALLBACK_READ_TIME };
  const minutes = Math.max(1, Math.round(words / 220));
  return { readTimeMinutes: minutes, readTime: `${minutes} min read` };
}

function mapPortalBlogPostRow(row: any): PortalBlogPostRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    category: row.category,
    author: row.authorName,
    role: row.authorRole,
    publishedAt: row.publishedAt,
    readTime: row.readTime,
    readTimeMinutes: row.readTimeMinutes,
    tags: parseStringArrayJson(row.tagsJson),
    sections: normalizeSections(JSON.parse(row.sectionsJson || "[]")),
    bodyBlocks: normalizeBodyBlocks(JSON.parse(row.bodyBlocksJson || "[]")),
    mediaImageUrl: row.mediaImageUrl,
    mediaVideoUrl: row.mediaVideoUrl,
    articleType: row.articleType,
    featuredImageUrl: row.featuredImageUrl,
    featuredImageAlt: row.featuredImageAlt,
    featuredImageCaption: row.featuredImageCaption,
    featuredImageCredit: row.featuredImageCredit,
    primaryCategory: row.primaryCategory,
    secondaryCategories: parseStringArrayJson(row.secondaryCategoriesJson),
    authorBio: row.authorBio,
    seoTitle: row.seoTitle,
    metaDescription: row.metaDescription,
    socialImageUrl: row.socialImageUrl,
    canonicalUrl: row.canonicalUrl,
    publishStatus: row.publishStatus,
    createdByUserId: row.createdByUserId,
    createdByUserName: row.createdByUserName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPublishedBlogPost(record: PortalBlogPostRecord): BlogPost {
  return {
    slug: record.slug,
    title: record.title,
    subtitle: record.subtitle ?? undefined,
    excerpt: record.excerpt,
    category: record.category,
    author: record.author,
    role: record.role,
    publishedAt: record.publishedAt,
    readTime: record.readTime,
    tags: record.tags,
    sections: record.sections,
    bodyBlocks: record.bodyBlocks,
    mediaImageUrl: record.mediaImageUrl,
    mediaVideoUrl: record.mediaVideoUrl,
    articleType: record.articleType,
    featuredImageUrl: record.featuredImageUrl,
    featuredImageAlt: record.featuredImageAlt,
    featuredImageCaption: record.featuredImageCaption,
    featuredImageCredit: record.featuredImageCredit,
    primaryCategory: record.primaryCategory,
    secondaryCategories: record.secondaryCategories,
    authorBio: record.authorBio,
    seoTitle: record.seoTitle,
    metaDescription: record.metaDescription,
    socialImageUrl: record.socialImageUrl,
    canonicalUrl: record.canonicalUrl,
    source: "portal",
    views: 0,
  };
}

// --- Helper: Slug Resolution ---

async function resolveUniqueSlugAsyncPostgres(rawSlug: string | undefined, title: string, excludeId?: number) {
  requirePostgresConfigured();
  const candidate = slugifySegment(rawSlug?.trim() || title);
  if (!candidate) {
    throw new Error("A valid slug could not be generated from the title.");
  }

  let slug = candidate;
  let suffix = 2;
  while (true) {
    if (STATIC_BLOG_SLUGS.has(slug)) {
      slug = `${candidate}-${suffix++}`;
      continue;
    }

    const result = await queryPostgres<{ id: number }>(
      `SELECT id FROM portal_blog_posts WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    const existingId = result.rows[0]?.id ? Number(result.rows[0].id) : null;
    if (!existingId || (excludeId && existingId === excludeId)) {
      return slug;
    }
    slug = `${candidate}-${suffix++}`;
  }
}

// --- Postgres Repository Methods ---

export async function getBlogPostBySlugPostgres(slug: string): Promise<BlogPost | null> {
  requirePostgresConfigured();
  const result = await queryPostgres<any>(
    `SELECT ${SELECT_PORTAL_BLOG_COLUMNS_POSTGRES} FROM portal_blog_posts WHERE slug = $1 AND publish_status = 'published' LIMIT 1`,
    [slug]
  );
  if (!result.rows[0]) return null;
  return toPublishedBlogPost(mapPortalBlogPostRow(result.rows[0]));
}

export async function listPortalBlogPostsAsyncPostgres(includeDrafts = true): Promise<PortalBlogPostRecord[]> {
  requirePostgresConfigured();
  try {
    const result = await queryPostgres<any>(
      `SELECT ${SELECT_PORTAL_BLOG_COLUMNS_POSTGRES} FROM portal_blog_posts ${includeDrafts ? "" : "WHERE publish_status = 'published'"} ORDER BY published_at DESC, id DESC`
    );
    return result.rows.map(mapPortalBlogPostRow);
  } catch (error) {
    console.error("[BlogRepository] Failed to list blog posts (schema might be missing):", error);
    return [];
  }
}

export async function getPublishedPortalBlogPostBySlugAsyncPostgres(slug: string): Promise<BlogPost | null> {
  return getBlogPostBySlugPostgres(slug);
}

export async function listPublishedPortalBlogPostsAsyncPostgres(): Promise<BlogPost[]> {
  const posts = await listPortalBlogPostsAsyncPostgres(false);
  return posts.map(toPublishedBlogPost);
}

export async function recordBlogPostViewAsyncPostgres(postSlug: string, sessionId: string) {
  requirePostgresConfigured();
  await queryPostgres(
    `INSERT INTO blog_post_views (post_slug, session_id) VALUES ($1, $2) ON CONFLICT (post_slug, session_id) DO NOTHING`,
    [postSlug, sessionId]
  );
  const result = await queryPostgres<{ count: string }>(`SELECT COUNT(*)::text AS count FROM blog_post_views WHERE post_slug = $1`, [postSlug]);
  return { postSlug, viewCount: Number(result.rows[0]?.count ?? 0) };
}

export async function toggleBlogPostLikeAsyncPostgres(postSlug: string, sessionId: string) {
  requirePostgresConfigured();
  let likedByViewer = false;
  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      const existing = await client.query<{ id: number }>(`SELECT id FROM blog_post_likes WHERE post_slug = $1 AND session_id = $2 LIMIT 1`, [postSlug, sessionId]);
      if (existing.rows[0]?.id) {
        await client.query(`DELETE FROM blog_post_likes WHERE id = $1`, [existing.rows[0].id]);
      } else {
        await client.query(`INSERT INTO blog_post_likes (post_slug, session_id) VALUES ($1, $2)`, [postSlug, sessionId]);
        likedByViewer = true;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
  const result = await queryPostgres<{ count: string }>(`SELECT COUNT(*)::text AS count FROM blog_post_likes WHERE post_slug = $1`, [postSlug]);
  return { postSlug, likedByViewer, likeCount: Number(result.rows[0]?.count ?? 0) };
}

export async function addBlogPostCommentAsyncPostgres(input: { postSlug: string; commentText: string; displayName?: string | null; sessionId?: string | null }) {
  requirePostgresConfigured();
  const result = await queryPostgres<any>(
    `INSERT INTO blog_post_comments (post_slug, session_id, display_name, comment_text) VALUES ($1, $2, $3, $4) RETURNING id, post_slug, display_name, comment_text, created_at::text AS created_at`,
    [input.postSlug, input.sessionId, input.displayName || "Anonymous", input.commentText]
  );
  const row = result.rows[0];
  return {
    id: Number(row.id),
    postSlug: row.post_slug,
    displayName: row.display_name,
    commentText: row.comment_text,
    createdAt: row.created_at
  } as BlogComment;
}

export async function listBlogPostCommentsAsyncPostgres(postSlug: string, limit = 50): Promise<BlogComment[]> {
  requirePostgresConfigured();
  const result = await queryPostgres<any>(
    `SELECT id, post_slug, display_name, comment_text, created_at::text AS created_at FROM blog_post_comments WHERE post_slug = $1 AND status = 'visible' ORDER BY created_at DESC, id DESC LIMIT $2`,
    [postSlug, limit]
  );
  return result.rows.map((row: any) => ({
    id: Number(row.id),
    postSlug: row.post_slug,
    displayName: row.display_name,
    commentText: row.comment_text,
    createdAt: row.created_at
  }));
}

export async function getBlogPostEngagementAsyncPostgres(postSlug: string, sessionId?: string | null): Promise<BlogEngagement> {
  const [viewRes, likeRes, commentRes, likedRes, comments] = await Promise.all([
    queryPostgres<{ count: string }>(`SELECT COUNT(*)::text AS count FROM blog_post_views WHERE post_slug = $1`, [postSlug]),
    queryPostgres<{ count: string }>(`SELECT COUNT(*)::text AS count FROM blog_post_likes WHERE post_slug = $1`, [postSlug]),
    queryPostgres<{ count: string }>(`SELECT COUNT(*)::text AS count FROM blog_post_comments WHERE post_slug = $1 AND status = 'visible'`, [postSlug]),
    sessionId ? queryPostgres<{ liked: boolean }>(`SELECT TRUE AS liked FROM blog_post_likes WHERE post_slug = $1 AND session_id = $2 LIMIT 1`, [postSlug, sessionId]) : Promise.resolve({ rows: [] } as any),
    listBlogPostCommentsAsyncPostgres(postSlug, 120),
  ]);
  return {
    postSlug,
    viewCount: Number(viewRes.rows[0]?.count ?? 0),
    likeCount: Number(likeRes.rows[0]?.count ?? 0),
    commentCount: Number(commentRes.rows[0]?.count ?? 0),
    likedByViewer: Boolean(likedRes.rows[0]?.liked),
    comments,
  };
}

export async function savePortalBlogPostAsyncPostgres(input: any, user: PortalUser): Promise<PortalBlogPostRecord> {
  requirePostgresConfigured();
  const now = new Date().toISOString();
  const publishStatus = input.publishStatus === "published" ? "published" : "draft";

  const bodyBlocks = normalizeBodyBlocks(input.bodyBlocks || []);
  const sections = normalizeSections(input.sections || []);
  const readInfo = inferReadTimeFromBodyBlocks(bodyBlocks);

  let existing: PortalBlogPostRecord | null = null;
  if (input.id) {
    const result = await queryPostgres<any>(`SELECT ${SELECT_PORTAL_BLOG_COLUMNS_POSTGRES} FROM portal_blog_posts WHERE id = $1`, [input.id]);
    existing = result.rows[0] ? mapPortalBlogPostRow(result.rows[0]) : null;
    if (!existing) throw new Error("Blog post not found.");
    const canEdit = user.isSuperAdmin || user.isAdmin || existing.createdByUserId === user.id;
    if (!canEdit) throw new Error("You do not have permission to edit this blog post.");
  }

  const slug = await resolveUniqueSlugAsyncPostgres(input.slug, input.title, existing?.id);
  const title = input.title.trim().slice(0, 220);
  const publishedAt = input.publishedAt || (publishStatus === "published" ? now : existing?.publishedAt || now);

  const values = {
    title,
    subtitle: (input.subtitle || "").trim().slice(0, 280) || null,
    excerpt: (input.excerpt || "").trim().slice(0, 1500),
    category: (input.category || "").trim().slice(0, 80),
    authorName: (input.author || "").trim().slice(0, 120),
    authorRole: (input.role || "").trim().slice(0, 120),
    readTime: input.readTime || readInfo.readTime,
    readTimeMinutes: input.readTimeMinutes || readInfo.readTimeMinutes,
    tagsJson: JSON.stringify(input.tags || []),
    sectionsJson: JSON.stringify(sections),
    bodyBlocksJson: JSON.stringify(bodyBlocks),
    mediaImageUrl: (input.mediaImageUrl || "").trim() || null,
    mediaVideoUrl: (input.mediaVideoUrl || "").trim() || null,
    articleType: input.articleType || "Blog Post",
    featuredImageUrl: (input.featuredImageUrl || "").trim() || null,
    featuredImageAlt: (input.featuredImageAlt || "").trim() || null,
    featuredImageCaption: (input.featuredImageCaption || "").trim() || null,
    featuredImageCredit: (input.featuredImageCredit || "").trim() || null,
    primaryCategory: (input.primaryCategory || "").trim() || (input.category || "").trim(),
    secondaryCategoriesJson: JSON.stringify(input.secondaryCategories || []),
    authorBio: (input.authorBio || "").trim() || null,
    seoTitle: (input.seoTitle || "").trim() || null,
    metaDescription: (input.metaDescription || "").trim() || null,
    socialImageUrl: (input.socialImageUrl || "").trim() || null,
    canonicalUrl: (input.canonicalUrl || "").trim() || null,
    publishStatus,
  };

  const dbResult = await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      let finalId: number;
      if (existing) {
        await client.query(
          `UPDATE portal_blog_posts SET
            slug=$2, title=$3, subtitle=$4, excerpt=$5, category=$6, author_name=$7, author_role=$8,
            published_at=$9::timestamptz, read_time=$10, read_time_minutes=$11, tags_json=$12,
            sections_json=$13, body_blocks_json=$14, media_image_url=$15, media_video_url=$16,
            article_type=$17, featured_image_url=$18, featured_image_alt=$19,
            featured_image_caption=$20, featured_image_credit=$21,
            primary_category=$22, secondary_categories_json=$23,
            author_bio=$24, seo_title=$25, meta_description=$26, social_image_url=$27,
            canonical_url=$28, publish_status=$29,
            updated_at=$30::timestamptz
          WHERE id=$1`,
          [
            existing.id, slug, values.title, values.subtitle, values.excerpt, values.category,
            values.authorName, values.authorRole, publishedAt, values.readTime, values.readTimeMinutes,
            values.tagsJson, values.sectionsJson, values.bodyBlocksJson, values.mediaImageUrl,
            values.mediaVideoUrl, values.articleType, values.featuredImageUrl,
            values.featuredImageAlt, values.featuredImageCaption, values.featuredImageCredit,
            values.primaryCategory, values.secondaryCategoriesJson,
            values.authorBio, values.seoTitle, values.metaDescription,
            values.socialImageUrl, values.canonicalUrl,
            values.publishStatus, now
          ]
        );
        finalId = existing.id;
        await client.query(
          `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, payload_before, payload_after, detail)
           VALUES ($1, $2, 'update', 'portal_blog_posts', $3, $4, $5, $6)`,
          [user.id, user.fullName, String(finalId), JSON.stringify(existing), JSON.stringify({ slug, title }), `Updated blog post ${slug}`]
        );
      } else {
        const insertRes = await client.query<{ id: number }>(
          `INSERT INTO portal_blog_posts (
            slug, title, subtitle, excerpt, category, author_name, author_role, published_at,
            read_time, read_time_minutes, tags_json, sections_json, body_blocks_json,
            media_image_url, media_video_url, article_type,
            featured_image_url, featured_image_alt, featured_image_caption, featured_image_credit,
            primary_category, secondary_categories_json, author_bio,
            seo_title, meta_description, social_image_url, canonical_url,
            publish_status, created_by_user_id, created_by_user_name, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31::timestamptz,$32::timestamptz
          ) RETURNING id`,
          [
            slug, values.title, values.subtitle, values.excerpt, values.category,
            values.authorName, values.authorRole, publishedAt, values.readTime, values.readTimeMinutes,
            values.tagsJson, values.sectionsJson, values.bodyBlocksJson, values.mediaImageUrl,
            values.mediaVideoUrl, values.articleType, values.featuredImageUrl,
            values.featuredImageAlt, values.featuredImageCaption, values.featuredImageCredit,
            values.primaryCategory, values.secondaryCategoriesJson,
            values.authorBio, values.seoTitle, values.metaDescription,
            values.socialImageUrl, values.canonicalUrl,
            values.publishStatus, user.id, user.fullName, now, now
          ]
        );
        finalId = Number(insertRes.rows[0].id);
        await client.query(
          `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, payload_after, detail)
           VALUES ($1, $2, 'create', 'portal_blog_posts', $3, $4, $5)`,
          [user.id, user.fullName, String(finalId), JSON.stringify({ slug, title }), `Created blog post ${slug}`]
        );
      }
      await client.query("COMMIT");
      const finalRes = await client.query<any>(`SELECT ${SELECT_PORTAL_BLOG_COLUMNS_POSTGRES} FROM portal_blog_posts WHERE id = $1`, [finalId]);
      return mapPortalBlogPostRow(finalRes.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });

  return dbResult;
}

export async function setPortalBlogPublishStatusAsyncPostgres(
  postId: number,
  publishStatus: PortalBlogPublishStatus,
  user: PortalUser,
) {
  requirePostgresConfigured();
  const postResult = await queryPostgres<any>(`SELECT ${SELECT_PORTAL_BLOG_COLUMNS_POSTGRES} FROM portal_blog_posts WHERE id = $1`, [postId]);
  const post = postResult.rows[0] ? mapPortalBlogPostRow(postResult.rows[0]) : null;
  if (!post) throw new Error("Blog post not found.");

  const canUpdate = user.isSuperAdmin || user.isAdmin || post.createdByUserId === user.id;
  if (!canUpdate) throw new Error("You do not have permission to change this blog post status.");

  const now = new Date().toISOString();
  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(
        `UPDATE portal_blog_posts SET publish_status = $2, published_at = CASE WHEN $2 = 'published' THEN $3::timestamptz ELSE published_at END, updated_at = $3::timestamptz WHERE id = $1`,
        [postId, publishStatus, now]
      );
      await client.query(
        `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, payload_before, payload_after, detail)
         VALUES ($1, $2, 'update', 'portal_blog_posts', $3, $4, $5, $6)`,
        [user.id, user.fullName, String(postId), JSON.stringify({ publishStatus: post.publishStatus }), JSON.stringify({ publishStatus }), `${publishStatus === 'published' ? 'Published' : 'Unpublished'} blog post ${post.slug}`]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });

  const finalRes = await queryPostgres<any>(`SELECT ${SELECT_PORTAL_BLOG_COLUMNS_POSTGRES} FROM portal_blog_posts WHERE id = $1`, [postId]);
  return mapPortalBlogPostRow(finalRes.rows[0]);
}

export async function deletePortalBlogPostAsyncPostgres(postId: number, user: PortalUser) {
  requirePostgresConfigured();
  const postResult = await queryPostgres<any>(`SELECT ${SELECT_PORTAL_BLOG_COLUMNS_POSTGRES} FROM portal_blog_posts WHERE id = $1`, [postId]);
  const post = postResult.rows[0] ? mapPortalBlogPostRow(postResult.rows[0]) : null;
  if (!post) throw new Error("Blog post not found.");

  const canDelete = user.isSuperAdmin || user.isAdmin || post.createdByUserId === user.id;
  if (!canDelete) throw new Error("You do not have permission to delete this blog post.");

  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(`DELETE FROM blog_post_views WHERE post_slug = $1`, [post.slug]);
      await client.query(`DELETE FROM blog_post_likes WHERE post_slug = $1`, [post.slug]);
      await client.query(`DELETE FROM blog_post_comments WHERE post_slug = $1`, [post.slug]);
      await client.query(`DELETE FROM portal_blog_posts WHERE id = $1`, [postId]);
      await client.query(
        `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, payload_before, detail)
         VALUES ($1, $2, 'delete', 'portal_blog_posts', $3, $4, $5)`,
        [user.id, user.fullName, String(postId), JSON.stringify(post), `Deleted blog post ${post.slug}`]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}
