import { getDb, logAuditEvent } from "@/lib/db";
import { blogPosts as staticBlogPosts } from "@/lib/content";
import { sanitizeInlineRichText, stripHtmlTags } from "@/lib/rich-text";
import type {
  BlogArticleType,
  BlogBodyBlock,
  BlogBodyBlockType,
  BlogComment,
  BlogEngagement,
  BlogGradientCtaCard,
  BlogHeaderLayoutType,
  BlogHeroTextAlignment,
  BlogOverlayStrength,
  BlogPost,
  BlogPostSection,
  BlogSpotlightMode,
  PortalBlogPostRecord,
  PortalBlogPublishStatus,
  PortalUser,
} from "@/lib/types";

type SavePortalBlogPostInput = {
  id?: number;
  slug?: string;
  title: string;
  subtitle?: string | null;
  excerpt: string;
  category: string;
  author: string;
  role: string;
  publishedAt?: string;
  readTime?: string;
  readTimeMinutes?: number | null;
  tags?: string[];
  sections?: BlogPostSection[];
  bodyBlocks?: BlogBodyBlock[];
  mediaImageUrl?: string | null;
  mediaVideoUrl?: string | null;
  articleType?: BlogArticleType | null;
  headerLayoutType?: BlogHeaderLayoutType | null;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  featuredImageCaption?: string | null;
  featuredImageCredit?: string | null;
  overlayStrength?: BlogOverlayStrength | null;
  heroTextAlignment?: BlogHeroTextAlignment | null;
  showOverlayMetadata?: boolean;
  showOverlayShareIcons?: boolean;
  primaryCategory?: string | null;
  secondaryCategories?: string[];
  authorAvatarUrl?: string | null;
  authorBio?: string | null;
  tocEnabled?: boolean;
  spotlightMode?: BlogSpotlightMode | null;
  spotlightArticleSlugs?: string[];
  showSpotlightSidebar?: boolean;
  showCategoryExplorer?: boolean;
  showNewsletterBlock?: boolean;
  ctaCard?: BlogGradientCtaCard | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  socialImageUrl?: string | null;
  canonicalUrl?: string | null;
  featuredFlag?: boolean;
  allowComments?: boolean;
  publishStatus?: PortalBlogPublishStatus;
};

type PortalBlogPostRow = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  category: string;
  authorName: string;
  authorRole: string;
  publishedAt: string;
  readTime: string;
  readTimeMinutes: number | null;
  tagsJson: string;
  sectionsJson: string;
  bodyBlocksJson: string;
  mediaImageUrl: string | null;
  mediaVideoUrl: string | null;
  articleType: BlogArticleType | null;
  headerLayoutType: BlogHeaderLayoutType | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  featuredImageCaption: string | null;
  featuredImageCredit: string | null;
  overlayStrength: BlogOverlayStrength | null;
  heroTextAlignment: BlogHeroTextAlignment | null;
  showOverlayMetadata: number | null;
  showOverlayShareIcons: number | null;
  primaryCategory: string | null;
  secondaryCategoriesJson: string;
  authorAvatarUrl: string | null;
  authorBio: string | null;
  tocEnabled: number | null;
  spotlightMode: BlogSpotlightMode | null;
  spotlightArticleSlugsJson: string;
  showSpotlightSidebar: number | null;
  showCategoryExplorer: number | null;
  showNewsletterBlock: number | null;
  ctaCardJson: string;
  seoTitle: string | null;
  metaDescription: string | null;
  socialImageUrl: string | null;
  canonicalUrl: string | null;
  featuredFlag: number | null;
  allowComments: number | null;
  publishStatus: PortalBlogPublishStatus;
  createdByUserId: number;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string;
};

const STATIC_BLOG_SLUGS = new Set(staticBlogPosts.map((post) => post.slug));
const FALLBACK_READ_TIME = "5 min read";
const DEFAULT_CTA_CARD: BlogGradientCtaCard = {
  enabled: false,
  pillLabel: "Explore",
  headline: "Explore More Literacy Resources",
  text: "Discover practical reading tools, stories, and implementation guides.",
  buttonLabel: "Explore Resources",
  buttonLink: "/resources",
  gradientPreset: "preset-1",
};

const SELECT_PORTAL_BLOG_COLUMNS = `
  id,
  slug,
  title,
  subtitle,
  excerpt,
  category,
  author_name AS authorName,
  author_role AS authorRole,
  published_at AS publishedAt,
  read_time AS readTime,
  read_time_minutes AS readTimeMinutes,
  tags_json AS tagsJson,
  sections_json AS sectionsJson,
  body_blocks_json AS bodyBlocksJson,
  media_image_url AS mediaImageUrl,
  media_video_url AS mediaVideoUrl,
  article_type AS articleType,
  header_layout_type AS headerLayoutType,
  featured_image_url AS featuredImageUrl,
  featured_image_alt AS featuredImageAlt,
  featured_image_caption AS featuredImageCaption,
  featured_image_credit AS featuredImageCredit,
  overlay_strength AS overlayStrength,
  hero_text_alignment AS heroTextAlignment,
  show_overlay_metadata AS showOverlayMetadata,
  show_overlay_share_icons AS showOverlayShareIcons,
  primary_category AS primaryCategory,
  secondary_categories_json AS secondaryCategoriesJson,
  author_avatar_url AS authorAvatarUrl,
  author_bio AS authorBio,
  toc_enabled AS tocEnabled,
  spotlight_mode AS spotlightMode,
  spotlight_article_slugs_json AS spotlightArticleSlugsJson,
  show_spotlight_sidebar AS showSpotlightSidebar,
  show_category_explorer AS showCategoryExplorer,
  show_newsletter_block AS showNewsletterBlock,
  cta_card_json AS ctaCardJson,
  seo_title AS seoTitle,
  meta_description AS metaDescription,
  social_image_url AS socialImageUrl,
  canonical_url AS canonicalUrl,
  featured_flag AS featuredFlag,
  allow_comments AS allowComments,
  publish_status AS publishStatus,
  created_by_user_id AS createdByUserId,
  created_by_user_name AS createdByUserName,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

function hasColumn(table: string, column: string) {
  const db = getDb();
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function ensureColumn(table: string, column: string, definition: string) {
  const db = getDb();
  if (!hasColumn(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function ensurePortalBlogSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS portal_blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      subtitle TEXT,
      excerpt TEXT NOT NULL,
      category TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      published_at TEXT NOT NULL,
      read_time TEXT NOT NULL DEFAULT '5 min read',
      read_time_minutes INTEGER,
      tags_json TEXT NOT NULL DEFAULT '[]',
      sections_json TEXT NOT NULL DEFAULT '[]',
      body_blocks_json TEXT NOT NULL DEFAULT '[]',
      media_image_url TEXT,
      media_video_url TEXT,
      article_type TEXT,
      header_layout_type TEXT,
      featured_image_url TEXT,
      featured_image_alt TEXT,
      featured_image_caption TEXT,
      featured_image_credit TEXT,
      overlay_strength TEXT,
      hero_text_alignment TEXT,
      show_overlay_metadata INTEGER NOT NULL DEFAULT 1,
      show_overlay_share_icons INTEGER NOT NULL DEFAULT 1,
      primary_category TEXT,
      secondary_categories_json TEXT NOT NULL DEFAULT '[]',
      author_avatar_url TEXT,
      author_bio TEXT,
      toc_enabled INTEGER NOT NULL DEFAULT 1,
      spotlight_mode TEXT NOT NULL DEFAULT 'auto',
      spotlight_article_slugs_json TEXT NOT NULL DEFAULT '[]',
      show_spotlight_sidebar INTEGER NOT NULL DEFAULT 1,
      show_category_explorer INTEGER NOT NULL DEFAULT 1,
      show_newsletter_block INTEGER NOT NULL DEFAULT 0,
      cta_card_json TEXT NOT NULL DEFAULT '{}',
      seo_title TEXT,
      meta_description TEXT,
      social_image_url TEXT,
      canonical_url TEXT,
      featured_flag INTEGER NOT NULL DEFAULT 0,
      allow_comments INTEGER NOT NULL DEFAULT 0,
      publish_status TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published')),
      created_by_user_id INTEGER NOT NULL,
      created_by_user_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS blog_post_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_slug TEXT NOT NULL,
      session_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_slug, session_id)
    );

    CREATE TABLE IF NOT EXISTS blog_post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_slug TEXT NOT NULL,
      session_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_slug, session_id)
    );

    CREATE TABLE IF NOT EXISTS blog_post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_slug TEXT NOT NULL,
      session_id TEXT,
      display_name TEXT,
      comment_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'flagged')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_portal_blog_posts_status_published_at
      ON portal_blog_posts(publish_status, published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_blog_post_views_slug
      ON blog_post_views(post_slug);
    CREATE INDEX IF NOT EXISTS idx_blog_post_likes_slug
      ON blog_post_likes(post_slug);
    CREATE INDEX IF NOT EXISTS idx_blog_post_comments_slug_created
      ON blog_post_comments(post_slug, created_at DESC);
  `);

  ensureColumn("portal_blog_posts", "read_time_minutes", "INTEGER");
  ensureColumn("portal_blog_posts", "body_blocks_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("portal_blog_posts", "article_type", "TEXT");
  ensureColumn("portal_blog_posts", "header_layout_type", "TEXT");
  ensureColumn("portal_blog_posts", "featured_image_url", "TEXT");
  ensureColumn("portal_blog_posts", "featured_image_alt", "TEXT");
  ensureColumn("portal_blog_posts", "featured_image_caption", "TEXT");
  ensureColumn("portal_blog_posts", "featured_image_credit", "TEXT");
  ensureColumn("portal_blog_posts", "overlay_strength", "TEXT");
  ensureColumn("portal_blog_posts", "hero_text_alignment", "TEXT");
  ensureColumn("portal_blog_posts", "show_overlay_metadata", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("portal_blog_posts", "show_overlay_share_icons", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("portal_blog_posts", "primary_category", "TEXT");
  ensureColumn("portal_blog_posts", "secondary_categories_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("portal_blog_posts", "author_avatar_url", "TEXT");
  ensureColumn("portal_blog_posts", "author_bio", "TEXT");
  ensureColumn("portal_blog_posts", "toc_enabled", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("portal_blog_posts", "spotlight_mode", "TEXT NOT NULL DEFAULT 'auto'");
  ensureColumn("portal_blog_posts", "spotlight_article_slugs_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("portal_blog_posts", "show_spotlight_sidebar", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("portal_blog_posts", "show_category_explorer", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("portal_blog_posts", "show_newsletter_block", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("portal_blog_posts", "cta_card_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn("portal_blog_posts", "seo_title", "TEXT");
  ensureColumn("portal_blog_posts", "meta_description", "TEXT");
  ensureColumn("portal_blog_posts", "social_image_url", "TEXT");
  ensureColumn("portal_blog_posts", "canonical_url", "TEXT");
  ensureColumn("portal_blog_posts", "featured_flag", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("portal_blog_posts", "allow_comments", "INTEGER NOT NULL DEFAULT 0");
}

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
  if (!value) {
    return [] as string[];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeSections(value: unknown): BlogPostSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const headingRaw = "heading" in entry ? (entry as { heading?: unknown }).heading : "";
      const paragraphsRaw = "paragraphs" in entry
        ? (entry as { paragraphs?: unknown }).paragraphs
        : [];
      const heading = (typeof headingRaw === "string" ? headingRaw : "")
        .trim()
        .slice(0, 140);
      const paragraphs = Array.isArray(paragraphsRaw)
        ? paragraphsRaw
          .filter((paragraph): paragraph is string => typeof paragraph === "string")
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph) => paragraph.slice(0, 50000))
        : [];
      if (paragraphs.length === 0) {
        return null;
      }
      return {
        heading: heading || `Section ${index + 1}`,
        paragraphs,
      };
    })
    .filter((section): section is BlogPostSection => section !== null);
}

function normalizeBodyBlocks(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as BlogBodyBlock[];
  }

  const validTypes = new Set<BlogBodyBlockType>([
    "paragraph",
    "heading2",
    "heading3",
    "bullet_list",
    "numbered_list",
    "quote",
    "image",
    "callout",
    "stat",
    "divider",
    "cta_inline",
  ]);

  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const obj = entry as Record<string, unknown>;
      const type = typeof obj.type === "string" && validTypes.has(obj.type as BlogBodyBlockType)
        ? (obj.type as BlogBodyBlockType)
        : null;
      if (!type) {
        return null;
      }
      const items = Array.isArray(obj.items)
        ? obj.items
          .filter((item): item is string => typeof item === "string")
          .map((item) => sanitizeInlineRichText(item.trim()))
          .filter(Boolean)
          .slice(0, 30)
        : null;
      return {
        id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `block-${index + 1}`,
        type,
        text: typeof obj.text === "string" ? sanitizeInlineRichText(obj.text.trim()) : null,
        heading: typeof obj.heading === "string" ? sanitizeInlineRichText(obj.heading.trim()) : null,
        items,
        quoteAttribution:
          typeof obj.quoteAttribution === "string"
            ? sanitizeInlineRichText(obj.quoteAttribution.trim())
            : null,
        imageUrl: typeof obj.imageUrl === "string" ? obj.imageUrl.trim() : null,
        imageAlt: typeof obj.imageAlt === "string" ? stripHtmlTags(obj.imageAlt) : null,
        imageCaption: typeof obj.imageCaption === "string" ? stripHtmlTags(obj.imageCaption) : null,
        imageCredit: typeof obj.imageCredit === "string" ? stripHtmlTags(obj.imageCredit) : null,
        imageWidthStyle:
          obj.imageWidthStyle === "full" || obj.imageWidthStyle === "contained" || obj.imageWidthStyle === "small"
            ? obj.imageWidthStyle
            : null,
        calloutTitle:
          typeof obj.calloutTitle === "string" ? sanitizeInlineRichText(obj.calloutTitle.trim()) : null,
        calloutTone:
          obj.calloutTone === "neutral"
          || obj.calloutTone === "info"
          || obj.calloutTone === "success"
          || obj.calloutTone === "warning"
          || obj.calloutTone === "critical"
            ? obj.calloutTone
            : null,
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

function parseSectionsJson(value: string | null | undefined) {
  if (!value) {
    return [] as BlogPostSection[];
  }
  try {
    return normalizeSections(JSON.parse(value));
  } catch {
    return [];
  }
}

function parseBodyBlocksJson(value: string | null | undefined) {
  if (!value) {
    return [] as BlogBodyBlock[];
  }
  try {
    return normalizeBodyBlocks(JSON.parse(value));
  } catch {
    return [];
  }
}

function normalizeCtaCard(value: unknown): BlogGradientCtaCard {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_CTA_CARD };
  }
  const obj = value as Record<string, unknown>;
  return {
    enabled: obj.enabled === true,
    pillLabel:
      typeof obj.pillLabel === "string"
        ? obj.pillLabel.trim().slice(0, 60)
        : DEFAULT_CTA_CARD.pillLabel,
    headline:
      typeof obj.headline === "string"
        ? obj.headline.trim().slice(0, 180)
        : DEFAULT_CTA_CARD.headline,
    text:
      typeof obj.text === "string"
        ? obj.text.trim().slice(0, 500)
        : DEFAULT_CTA_CARD.text,
    buttonLabel:
      typeof obj.buttonLabel === "string"
        ? obj.buttonLabel.trim().slice(0, 80)
        : DEFAULT_CTA_CARD.buttonLabel,
    buttonLink:
      typeof obj.buttonLink === "string"
        ? obj.buttonLink.trim().slice(0, 320)
        : DEFAULT_CTA_CARD.buttonLink,
    gradientPreset:
      obj.gradientPreset === "preset-1"
      || obj.gradientPreset === "preset-2"
      || obj.gradientPreset === "preset-3"
        ? obj.gradientPreset
        : DEFAULT_CTA_CARD.gradientPreset,
  };
}

function parseCtaCardJson(value: string | null | undefined) {
  if (!value) {
    return { ...DEFAULT_CTA_CARD };
  }
  try {
    return normalizeCtaCard(JSON.parse(value));
  } catch {
    return { ...DEFAULT_CTA_CARD };
  }
}

function textFromBodyBlocks(bodyBlocks: BlogBodyBlock[]) {
  return bodyBlocks
    .flatMap((block) => {
      const pieces: string[] = [];
      if (block.heading) pieces.push(stripHtmlTags(block.heading));
      if (block.text) pieces.push(stripHtmlTags(block.text));
      if (Array.isArray(block.items)) pieces.push(block.items.map((item) => stripHtmlTags(item)).join(" "));
      if (block.calloutTitle) pieces.push(stripHtmlTags(block.calloutTitle));
      if (block.statLabel) pieces.push(stripHtmlTags(block.statLabel));
      if (block.statValue) pieces.push(stripHtmlTags(block.statValue));
      if (block.ctaLabel) pieces.push(stripHtmlTags(block.ctaLabel));
      return pieces;
    })
    .join(" ");
}

function wordsInText(value: string) {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function inferReadTimeFromBodyBlocks(bodyBlocks: BlogBodyBlock[]) {
  const words = wordsInText(textFromBodyBlocks(bodyBlocks));
  if (words <= 0) {
    return { readTimeMinutes: 5, readTime: FALLBACK_READ_TIME };
  }
  const minutes = Math.max(1, Math.round(words / 220));
  return {
    readTimeMinutes: minutes,
    readTime: `${minutes} min read`,
  };
}

function sectionsFromBodyBlocks(bodyBlocks: BlogBodyBlock[]) {
  if (bodyBlocks.length === 0) {
    return [] as BlogPostSection[];
  }

  const sections: BlogPostSection[] = [];
  let currentHeading = "Overview";
  let currentParagraphs: string[] = [];

  const flushSection = () => {
    if (currentParagraphs.length === 0) {
      return;
    }
    sections.push({
      heading: currentHeading,
      paragraphs: [...currentParagraphs],
    });
    currentParagraphs = [];
  };

  bodyBlocks.forEach((block, index) => {
    if (block.type === "heading2" || block.type === "heading3") {
      flushSection();
      currentHeading = stripHtmlTags(block.heading || block.text || "") || `Section ${index + 1}`;
      return;
    }

    if (block.type === "divider") {
      return;
    }

    if (block.type === "bullet_list" || block.type === "numbered_list") {
      if (Array.isArray(block.items) && block.items.length > 0) {
        const lines = block.items.map((item, itemIndex) => {
          const text = stripHtmlTags(item);
          return block.type === "numbered_list" ? `${itemIndex + 1}. ${text}` : `• ${text}`;
        });
        currentParagraphs.push(lines.join("\n"));
      }
      return;
    }

    if (block.type === "image") {
      if (block.imageCaption) {
        currentParagraphs.push(stripHtmlTags(block.imageCaption));
      }
      return;
    }

    if (block.type === "stat") {
      const statLine = [stripHtmlTags(block.statLabel), stripHtmlTags(block.statValue)]
        .filter(Boolean)
        .join(": ");
      if (statLine) {
        currentParagraphs.push(statLine);
      }
      return;
    }

    const text = stripHtmlTags(block.text || "");
    if (text) {
      currentParagraphs.push(text);
    }
  });

  flushSection();
  return sections;
}

function normalizeTags(tags: string[] | undefined) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  (tags ?? []).forEach((tag) => {
    const next = tag.trim().slice(0, 60);
    if (!next) {
      return;
    }
    const key = next.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push(next);
  });
  return normalized;
}

function normalizeIsoDate(value: string | undefined, fallback: string) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return fallback;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
}

function normalizeSectionsForSave(
  sections: BlogPostSection[] | undefined,
  bodyBlocks: BlogBodyBlock[],
) {
  const normalizedSections = normalizeSections(sections ?? []);
  if (normalizedSections.length > 0) {
    return normalizedSections;
  }

  const derived = sectionsFromBodyBlocks(bodyBlocks);
  if (derived.length > 0) {
    return derived;
  }

  throw new Error("At least one body section or content block is required.");
}

function normalizeBodyBlocksForSave(bodyBlocks: BlogBodyBlock[] | undefined, sections: BlogPostSection[]) {
  const normalizedBlocks = normalizeBodyBlocks(bodyBlocks ?? []);
  if (normalizedBlocks.length > 0) {
    return normalizedBlocks;
  }

  return sections.flatMap((section, sectionIndex) => {
    const headingBlock: BlogBodyBlock = {
      id: `block-h2-${sectionIndex + 1}`,
      type: "heading2",
      heading: section.heading,
      hideFromToc: false,
    };
    const paragraphBlocks = section.paragraphs.map((paragraph, paragraphIndex) => ({
      id: `block-p-${sectionIndex + 1}-${paragraphIndex + 1}`,
      type: "paragraph" as const,
      text: paragraph,
    }));
    return [headingBlock, ...paragraphBlocks];
  });
}

function resolveUniqueSlug(rawSlug: string | undefined, title: string, excludeId?: number) {
  const db = getDb();
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
    const existing = db
      .prepare(
        `SELECT id
         FROM portal_blog_posts
         WHERE slug = @slug`,
      )
      .get({ slug }) as { id: number } | undefined;
    if (!existing || (excludeId && existing.id === excludeId)) {
      return slug;
    }
    slug = `${candidate}-${suffix++}`;
  }
}

function normalizeBlogSlugInput(slug: string) {
  const normalized = slug.trim().toLowerCase().slice(0, 140);
  if (!normalized) {
    throw new Error("Blog slug is required.");
  }
  return normalized;
}

function normalizeSessionId(value: string) {
  const trimmed = value.trim().slice(0, 120);
  if (!trimmed) {
    throw new Error("Session id is required.");
  }
  return trimmed;
}

function normalizeCommentDisplayName(value: string | undefined | null) {
  const cleaned = stripHtmlTags(value ?? "").trim().slice(0, 80);
  return cleaned || "Anonymous";
}

function normalizeCommentText(value: string) {
  const cleaned = stripHtmlTags(value)
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1800);
  if (cleaned.length < 2) {
    throw new Error("Comment must be at least 2 characters.");
  }
  return cleaned;
}

function getBlogPostViewCount(postSlug: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM blog_post_views WHERE post_slug = @postSlug")
    .get({ postSlug }) as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

function getBlogPostLikeCount(postSlug: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM blog_post_likes WHERE post_slug = @postSlug")
    .get({ postSlug }) as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

function getBlogPostCommentCount(postSlug: string) {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) AS count FROM blog_post_comments WHERE post_slug = @postSlug AND status = 'visible'",
    )
    .get({ postSlug }) as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

function mapBlogCommentRow(row: Record<string, unknown>): BlogComment {
  return {
    id: Number(row.id),
    postSlug: String(row.post_slug ?? ""),
    displayName: String(row.display_name ?? "Anonymous").trim() || "Anonymous",
    commentText: String(row.comment_text ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapPortalBlogPostRow(row: PortalBlogPostRow): PortalBlogPostRecord {
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
    sections: parseSectionsJson(row.sectionsJson),
    bodyBlocks: parseBodyBlocksJson(row.bodyBlocksJson),
    mediaImageUrl: row.mediaImageUrl,
    mediaVideoUrl: row.mediaVideoUrl,
    articleType: row.articleType,
    headerLayoutType: row.headerLayoutType,
    featuredImageUrl: row.featuredImageUrl,
    featuredImageAlt: row.featuredImageAlt,
    featuredImageCaption: row.featuredImageCaption,
    featuredImageCredit: row.featuredImageCredit,
    overlayStrength: row.overlayStrength,
    heroTextAlignment: row.heroTextAlignment,
    showOverlayMetadata: Number(row.showOverlayMetadata ?? 1) === 1,
    showOverlayShareIcons: Number(row.showOverlayShareIcons ?? 1) === 1,
    primaryCategory: row.primaryCategory,
    secondaryCategories: parseStringArrayJson(row.secondaryCategoriesJson),
    authorAvatarUrl: row.authorAvatarUrl,
    authorBio: row.authorBio,
    tocEnabled: Number(row.tocEnabled ?? 1) === 1,
    spotlightMode: row.spotlightMode,
    spotlightArticleSlugs: parseStringArrayJson(row.spotlightArticleSlugsJson),
    showSpotlightSidebar: Number(row.showSpotlightSidebar ?? 1) === 1,
    showCategoryExplorer: Number(row.showCategoryExplorer ?? 1) === 1,
    showNewsletterBlock: Number(row.showNewsletterBlock ?? 0) === 1,
    ctaCard: parseCtaCardJson(row.ctaCardJson),
    seoTitle: row.seoTitle,
    metaDescription: row.metaDescription,
    socialImageUrl: row.socialImageUrl,
    canonicalUrl: row.canonicalUrl,
    featuredFlag: Number(row.featuredFlag ?? 0) === 1,
    allowComments: Number(row.allowComments ?? 0) === 1,
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
    headerLayoutType: record.headerLayoutType,
    featuredImageUrl: record.featuredImageUrl,
    featuredImageAlt: record.featuredImageAlt,
    featuredImageCaption: record.featuredImageCaption,
    featuredImageCredit: record.featuredImageCredit,
    overlayStrength: record.overlayStrength,
    heroTextAlignment: record.heroTextAlignment,
    showOverlayMetadata: record.showOverlayMetadata,
    showOverlayShareIcons: record.showOverlayShareIcons,
    primaryCategory: record.primaryCategory,
    secondaryCategories: record.secondaryCategories,
    authorAvatarUrl: record.authorAvatarUrl,
    authorBio: record.authorBio,
    tocEnabled: record.tocEnabled,
    spotlightMode: record.spotlightMode,
    spotlightArticleSlugs: record.spotlightArticleSlugs,
    showSpotlightSidebar: record.showSpotlightSidebar,
    showCategoryExplorer: record.showCategoryExplorer,
    showNewsletterBlock: record.showNewsletterBlock,
    ctaCard: record.ctaCard,
    seoTitle: record.seoTitle,
    metaDescription: record.metaDescription,
    socialImageUrl: record.socialImageUrl,
    canonicalUrl: record.canonicalUrl,
    featuredFlag: record.featuredFlag,
    allowComments: record.allowComments,
    source: "portal",
    views: 0,
  };
}

function getPortalBlogPostById(id: number) {
  ensurePortalBlogSchema();
  const db = getDb();
  const row = db
    .prepare(`SELECT ${SELECT_PORTAL_BLOG_COLUMNS} FROM portal_blog_posts WHERE id = @id`)
    .get({ id }) as PortalBlogPostRow | undefined;
  return row ? mapPortalBlogPostRow(row) : null;
}

function canDeletePost(user: PortalUser, post: PortalBlogPostRecord) {
  return user.isSuperAdmin || user.isAdmin || post.createdByUserId === user.id;
}

export function listPortalBlogPosts(includeDrafts = true): PortalBlogPostRecord[] {
  ensurePortalBlogSchema();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ${SELECT_PORTAL_BLOG_COLUMNS}
       FROM portal_blog_posts
       ${includeDrafts ? "" : "WHERE publish_status = 'published'"}
       ORDER BY datetime(published_at) DESC, id DESC`,
    )
    .all() as PortalBlogPostRow[];
  return rows.map(mapPortalBlogPostRow);
}

export function getPublishedPortalBlogPostBySlug(slug: string): BlogPost | null {
  ensurePortalBlogSchema();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT ${SELECT_PORTAL_BLOG_COLUMNS}
       FROM portal_blog_posts
       WHERE slug = @slug AND publish_status = 'published'
       LIMIT 1`,
    )
    .get({ slug }) as PortalBlogPostRow | undefined;

  if (!row) {
    return null;
  }

  return toPublishedBlogPost(mapPortalBlogPostRow(row));
}

export function listPublishedPortalBlogPosts(): BlogPost[] {
  return listPortalBlogPosts(false).map(toPublishedBlogPost);
}

export function recordBlogPostView(postSlugRaw: string, sessionIdRaw: string) {
  ensurePortalBlogSchema();
  const db = getDb();
  const postSlug = normalizeBlogSlugInput(postSlugRaw);
  const sessionId = normalizeSessionId(sessionIdRaw);

  db.prepare(
    `INSERT OR IGNORE INTO blog_post_views (post_slug, session_id)
     VALUES (@postSlug, @sessionId)`,
  ).run({
    postSlug,
    sessionId,
  });

  return {
    postSlug,
    viewCount: getBlogPostViewCount(postSlug),
  };
}

export function toggleBlogPostLike(postSlugRaw: string, sessionIdRaw: string) {
  ensurePortalBlogSchema();
  const db = getDb();
  const postSlug = normalizeBlogSlugInput(postSlugRaw);
  const sessionId = normalizeSessionId(sessionIdRaw);

  const existing = db
    .prepare(
      `SELECT id
       FROM blog_post_likes
       WHERE post_slug = @postSlug AND session_id = @sessionId
       LIMIT 1`,
    )
    .get({ postSlug, sessionId }) as { id: number } | undefined;

  let likedByViewer = false;
  if (existing) {
    db.prepare("DELETE FROM blog_post_likes WHERE id = @id").run({ id: existing.id });
  } else {
    db.prepare(
      `INSERT INTO blog_post_likes (post_slug, session_id)
       VALUES (@postSlug, @sessionId)`,
    ).run({ postSlug, sessionId });
    likedByViewer = true;
  }

  return {
    postSlug,
    likedByViewer,
    likeCount: getBlogPostLikeCount(postSlug),
  };
}

export function addBlogPostComment(input: {
  postSlug: string;
  commentText: string;
  displayName?: string | null;
  sessionId?: string | null;
}) {
  ensurePortalBlogSchema();
  const db = getDb();
  const postSlug = normalizeBlogSlugInput(input.postSlug);
  const commentText = normalizeCommentText(input.commentText);
  const displayName = normalizeCommentDisplayName(input.displayName);
  const sessionId = input.sessionId ? normalizeSessionId(input.sessionId) : null;

  const result = db.prepare(
    `INSERT INTO blog_post_comments (post_slug, session_id, display_name, comment_text)
     VALUES (@postSlug, @sessionId, @displayName, @commentText)`,
  ).run({
    postSlug,
    sessionId,
    displayName,
    commentText,
  });

  const row = db
    .prepare("SELECT * FROM blog_post_comments WHERE id = @id")
    .get({ id: Number(result.lastInsertRowid) }) as Record<string, unknown> | undefined;

  return row ? mapBlogCommentRow(row) : null;
}

export function listBlogPostComments(postSlugRaw: string, limit = 50): BlogComment[] {
  ensurePortalBlogSchema();
  const db = getDb();
  const postSlug = normalizeBlogSlugInput(postSlugRaw);
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.round(limit))) : 50;

  const rows = db
    .prepare(
      `SELECT id, post_slug, display_name, comment_text, created_at
       FROM blog_post_comments
       WHERE post_slug = @postSlug AND status = 'visible'
       ORDER BY datetime(created_at) DESC, id DESC
       LIMIT @limit`,
    )
    .all({ postSlug, limit: normalizedLimit }) as Record<string, unknown>[];

  return rows.map(mapBlogCommentRow);
}

export function getBlogPostEngagement(postSlugRaw: string, sessionIdRaw?: string | null): BlogEngagement {
  ensurePortalBlogSchema();
  const db = getDb();
  const postSlug = normalizeBlogSlugInput(postSlugRaw);
  const sessionId = sessionIdRaw ? normalizeSessionId(sessionIdRaw) : null;

  const likedByViewer = sessionId
    ? Boolean(
      db
        .prepare(
          `SELECT 1
           FROM blog_post_likes
           WHERE post_slug = @postSlug AND session_id = @sessionId
           LIMIT 1`,
        )
        .get({ postSlug, sessionId }),
    )
    : false;

  const comments = listBlogPostComments(postSlug, 120);

  return {
    postSlug,
    viewCount: getBlogPostViewCount(postSlug),
    likeCount: getBlogPostLikeCount(postSlug),
    commentCount: getBlogPostCommentCount(postSlug),
    likedByViewer,
    comments,
  };
}

export function savePortalBlogPost(input: SavePortalBlogPostInput, user: PortalUser) {
  ensurePortalBlogSchema();
  const db = getDb();
  const now = new Date().toISOString();

  const title = input.title.trim().slice(0, 220);
  const subtitle = (input.subtitle ?? "").trim().slice(0, 280);
  const excerpt = input.excerpt.trim().slice(0, 1500);
  const category = input.category.trim().slice(0, 80);
  const author = input.author.trim().slice(0, 120);
  const role = input.role.trim().slice(0, 120);
  const publishStatus: PortalBlogPublishStatus = input.publishStatus === "published"
    ? "published"
    : "draft";

  const bodyBlocks = normalizeBodyBlocksForSave(input.bodyBlocks, input.sections ?? []);
  const sections = normalizeSectionsForSave(input.sections, bodyBlocks);
  const inferredReadTime = inferReadTimeFromBodyBlocks(bodyBlocks);
  const readTimeMinutes = Number.isFinite(input.readTimeMinutes ?? Number.NaN)
    ? Math.max(1, Math.round(Number(input.readTimeMinutes)))
    : inferredReadTime.readTimeMinutes;
  const readTime = (input.readTime ?? "").trim() || `${readTimeMinutes} min read`;
  const tags = normalizeTags(input.tags);
  const secondaryCategories = normalizeTags(input.secondaryCategories);
  const spotlightArticleSlugs = normalizeTags(input.spotlightArticleSlugs);
  const ctaCard = normalizeCtaCard(input.ctaCard ?? DEFAULT_CTA_CARD);

  if (title.length < 3) {
    throw new Error("Blog title must be at least 3 characters.");
  }
  if (excerpt.length < 10) {
    throw new Error("Blog excerpt must be at least 10 characters.");
  }
  if (category.length < 2) {
    throw new Error("Blog category is required.");
  }
  if (author.length < 2) {
    throw new Error("Author name is required.");
  }
  if (role.length < 2) {
    throw new Error("Author role is required.");
  }

  const values = {
    title,
    subtitle: subtitle || null,
    excerpt,
    category,
    authorName: author,
    authorRole: role,
    readTime,
    readTimeMinutes,
    tagsJson: JSON.stringify(tags),
    sectionsJson: JSON.stringify(sections),
    bodyBlocksJson: JSON.stringify(bodyBlocks),
    mediaImageUrl: (input.mediaImageUrl ?? "").trim() || null,
    mediaVideoUrl: (input.mediaVideoUrl ?? "").trim() || null,
    articleType: input.articleType ?? "Blog Post",
    headerLayoutType: input.headerLayoutType ?? "standard",
    featuredImageUrl: (input.featuredImageUrl ?? "").trim() || null,
    featuredImageAlt: (input.featuredImageAlt ?? "").trim() || null,
    featuredImageCaption: (input.featuredImageCaption ?? "").trim() || null,
    featuredImageCredit: (input.featuredImageCredit ?? "").trim() || null,
    overlayStrength: input.overlayStrength ?? "medium",
    heroTextAlignment: input.heroTextAlignment ?? "left",
    showOverlayMetadata: input.showOverlayMetadata === false ? 0 : 1,
    showOverlayShareIcons: input.showOverlayShareIcons === false ? 0 : 1,
    primaryCategory: (input.primaryCategory ?? "").trim() || category,
    secondaryCategoriesJson: JSON.stringify(secondaryCategories),
    authorAvatarUrl: (input.authorAvatarUrl ?? "").trim() || null,
    authorBio: (input.authorBio ?? "").trim() || null,
    tocEnabled: input.tocEnabled === false ? 0 : 1,
    spotlightMode: input.spotlightMode ?? "auto",
    spotlightArticleSlugsJson: JSON.stringify(spotlightArticleSlugs),
    showSpotlightSidebar: input.showSpotlightSidebar === false ? 0 : 1,
    showCategoryExplorer: input.showCategoryExplorer === false ? 0 : 1,
    showNewsletterBlock: input.showNewsletterBlock === true ? 1 : 0,
    ctaCardJson: JSON.stringify(ctaCard),
    seoTitle: (input.seoTitle ?? "").trim() || null,
    metaDescription: (input.metaDescription ?? "").trim() || null,
    socialImageUrl: (input.socialImageUrl ?? "").trim() || null,
    canonicalUrl: (input.canonicalUrl ?? "").trim() || null,
    featuredFlag: input.featuredFlag === true ? 1 : 0,
    allowComments: input.allowComments === true ? 1 : 0,
    publishStatus,
  };

  if (input.id) {
    const existing = getPortalBlogPostById(input.id);
    if (!existing) {
      throw new Error("Blog post not found.");
    }
    const canEdit = user.isSuperAdmin || user.isAdmin || existing.createdByUserId === user.id;
    if (!canEdit) {
      throw new Error("You do not have permission to edit this blog post.");
    }

    const slug = resolveUniqueSlug(input.slug, title, existing.id);
    const publishedAt = normalizeIsoDate(
      input.publishedAt,
      publishStatus === "published" ? now : existing.publishedAt,
    );

    db.prepare(
      `UPDATE portal_blog_posts
       SET
         slug = @slug,
         title = @title,
         subtitle = @subtitle,
         excerpt = @excerpt,
         category = @category,
         author_name = @authorName,
         author_role = @authorRole,
         published_at = @publishedAt,
         read_time = @readTime,
         read_time_minutes = @readTimeMinutes,
         tags_json = @tagsJson,
         sections_json = @sectionsJson,
         body_blocks_json = @bodyBlocksJson,
         media_image_url = @mediaImageUrl,
         media_video_url = @mediaVideoUrl,
         article_type = @articleType,
         header_layout_type = @headerLayoutType,
         featured_image_url = @featuredImageUrl,
         featured_image_alt = @featuredImageAlt,
         featured_image_caption = @featuredImageCaption,
         featured_image_credit = @featuredImageCredit,
         overlay_strength = @overlayStrength,
         hero_text_alignment = @heroTextAlignment,
         show_overlay_metadata = @showOverlayMetadata,
         show_overlay_share_icons = @showOverlayShareIcons,
         primary_category = @primaryCategory,
         secondary_categories_json = @secondaryCategoriesJson,
         author_avatar_url = @authorAvatarUrl,
         author_bio = @authorBio,
         toc_enabled = @tocEnabled,
         spotlight_mode = @spotlightMode,
         spotlight_article_slugs_json = @spotlightArticleSlugsJson,
         show_spotlight_sidebar = @showSpotlightSidebar,
         show_category_explorer = @showCategoryExplorer,
         show_newsletter_block = @showNewsletterBlock,
         cta_card_json = @ctaCardJson,
         seo_title = @seoTitle,
         meta_description = @metaDescription,
         social_image_url = @socialImageUrl,
         canonical_url = @canonicalUrl,
         featured_flag = @featuredFlag,
         allow_comments = @allowComments,
         publish_status = @publishStatus,
         updated_at = @updatedAt
       WHERE id = @id`,
    ).run({
      ...values,
      id: existing.id,
      slug,
      publishedAt,
      updatedAt: now,
    });

    logAuditEvent(
      user.id,
      user.fullName,
      "update",
      "portal_blog_posts",
      existing.id,
      JSON.stringify(existing),
      JSON.stringify({ slug, title, publishStatus }),
      `Updated blog post ${slug}`,
    );

    return getPortalBlogPostById(existing.id);
  }

  const slug = resolveUniqueSlug(input.slug, title);
  const publishedAt = normalizeIsoDate(input.publishedAt, now);

  const result = db.prepare(
    `INSERT INTO portal_blog_posts (
      slug,
      title,
      subtitle,
      excerpt,
      category,
      author_name,
      author_role,
      published_at,
      read_time,
      read_time_minutes,
      tags_json,
      sections_json,
      body_blocks_json,
      media_image_url,
      media_video_url,
      article_type,
      header_layout_type,
      featured_image_url,
      featured_image_alt,
      featured_image_caption,
      featured_image_credit,
      overlay_strength,
      hero_text_alignment,
      show_overlay_metadata,
      show_overlay_share_icons,
      primary_category,
      secondary_categories_json,
      author_avatar_url,
      author_bio,
      toc_enabled,
      spotlight_mode,
      spotlight_article_slugs_json,
      show_spotlight_sidebar,
      show_category_explorer,
      show_newsletter_block,
      cta_card_json,
      seo_title,
      meta_description,
      social_image_url,
      canonical_url,
      featured_flag,
      allow_comments,
      publish_status,
      created_by_user_id,
      created_by_user_name,
      created_at,
      updated_at
    ) VALUES (
      @slug,
      @title,
      @subtitle,
      @excerpt,
      @category,
      @authorName,
      @authorRole,
      @publishedAt,
      @readTime,
      @readTimeMinutes,
      @tagsJson,
      @sectionsJson,
      @bodyBlocksJson,
      @mediaImageUrl,
      @mediaVideoUrl,
      @articleType,
      @headerLayoutType,
      @featuredImageUrl,
      @featuredImageAlt,
      @featuredImageCaption,
      @featuredImageCredit,
      @overlayStrength,
      @heroTextAlignment,
      @showOverlayMetadata,
      @showOverlayShareIcons,
      @primaryCategory,
      @secondaryCategoriesJson,
      @authorAvatarUrl,
      @authorBio,
      @tocEnabled,
      @spotlightMode,
      @spotlightArticleSlugsJson,
      @showSpotlightSidebar,
      @showCategoryExplorer,
      @showNewsletterBlock,
      @ctaCardJson,
      @seoTitle,
      @metaDescription,
      @socialImageUrl,
      @canonicalUrl,
      @featuredFlag,
      @allowComments,
      @publishStatus,
      @createdByUserId,
      @createdByUserName,
      @createdAt,
      @updatedAt
    )`,
  ).run({
    ...values,
    slug,
    publishedAt,
    createdByUserId: user.id,
    createdByUserName: user.fullName,
    createdAt: now,
    updatedAt: now,
  });

  const createdId = Number(result.lastInsertRowid);

  logAuditEvent(
    user.id,
    user.fullName,
    "create",
    "portal_blog_posts",
    createdId,
    null,
    JSON.stringify({ slug, title, publishStatus }),
    `Created blog post ${slug}`,
  );

  return getPortalBlogPostById(createdId);
}

export function setPortalBlogPublishStatus(
  postId: number,
  publishStatus: PortalBlogPublishStatus,
  user: PortalUser,
) {
  ensurePortalBlogSchema();
  const db = getDb();
  const post = getPortalBlogPostById(postId);
  if (!post) {
    throw new Error("Blog post not found.");
  }

  const canUpdate = user.isSuperAdmin || user.isAdmin || post.createdByUserId === user.id;
  if (!canUpdate) {
    throw new Error("You do not have permission to change this blog post status.");
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE portal_blog_posts
     SET publish_status = @publishStatus,
         published_at = CASE WHEN @publishStatus = 'published' THEN @now ELSE published_at END,
         updated_at = @now
     WHERE id = @id`,
  ).run({
    id: postId,
    publishStatus,
    now,
  });

  logAuditEvent(
    user.id,
    user.fullName,
    "update",
    "portal_blog_posts",
    postId,
    JSON.stringify({ publishStatus: post.publishStatus }),
    JSON.stringify({ publishStatus }),
    `${publishStatus === "published" ? "Published" : "Unpublished"} blog post ${post.slug}`,
  );

  return getPortalBlogPostById(postId);
}

export function deletePortalBlogPost(postId: number, user: PortalUser) {
  ensurePortalBlogSchema();
  const db = getDb();
  const post = getPortalBlogPostById(postId);
  if (!post) {
    throw new Error("Blog post not found.");
  }
  if (!canDeletePost(user, post)) {
    throw new Error("You do not have permission to delete this blog post.");
  }

  db.prepare("DELETE FROM blog_post_views WHERE post_slug = @postSlug").run({ postSlug: post.slug });
  db.prepare("DELETE FROM blog_post_likes WHERE post_slug = @postSlug").run({ postSlug: post.slug });
  db.prepare("DELETE FROM blog_post_comments WHERE post_slug = @postSlug").run({ postSlug: post.slug });
  db.prepare("DELETE FROM portal_blog_posts WHERE id = @id").run({ id: postId });

  logAuditEvent(
    user.id,
    user.fullName,
    "delete",
    "portal_blog_posts",
    postId,
    JSON.stringify(post),
    null,
    `Deleted blog post ${post.slug}`,
  );
}
