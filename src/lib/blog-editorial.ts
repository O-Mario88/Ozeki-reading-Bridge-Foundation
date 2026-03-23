import type { BlogBodyBlock, BlogPost } from "@/lib/types";
import { buildMediaPlaceholderDataUri } from "@/lib/media-placeholders";
import { stripHtmlTags } from "@/lib/rich-text";

export type EditorialTocItem = {
  id: string;
  label: string;
  level: 2 | 3;
  blockId: string;
};

export type PreparedEditorialPost = {
  blocks: BlogBodyBlock[];
  toc: EditorialTocItem[];
  readTimeLabel: string;
  readTimeMinutes: number;
  categories: string[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toUniqueIds() {
  const seen = new Map<string, number>();
  return (baseValue: string) => {
    const base = slugify(baseValue) || "section";
    const previous = seen.get(base) ?? 0;
    const next = previous + 1;
    seen.set(base, next);
    return previous === 0 ? base : `${base}-${next}`;
  };
}

function parseReadTimeMinutes(value: string | undefined) {
  if (!value) {
    return null;
  }
  const match = value.match(/(\d+)/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function wordsIn(value: string) {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function toFallbackBlocks(post: BlogPost) {
  const sectionBlocks = post.sections.flatMap((section, sectionIndex) => {
    const headingBlock: BlogBodyBlock = {
      id: `section-h2-${sectionIndex + 1}`,
      type: "heading2",
      heading: section.heading,
      hideFromToc: false,
    };
    const paragraphBlocks = section.paragraphs.map((paragraph, paragraphIndex) => {
      return {
        id: `section-p-${sectionIndex + 1}-${paragraphIndex + 1}`,
        type: "paragraph" as const,
        text: paragraph,
      };
    });
    return [headingBlock, ...paragraphBlocks];
  });

  return sectionBlocks.length > 0
    ? sectionBlocks
    : [
      {
        id: "fallback-paragraph",
        type: "paragraph" as const,
        text: post.excerpt,
      },
    ];
}

function normalizeBlocks(blocks: BlogBodyBlock[]) {
  return blocks.map((block, index) => {
    const id = block.id?.trim() ? block.id.trim() : `block-${index + 1}`;
    return {
      ...block,
      id,
      text: block.text?.trim() ?? null,
      heading: block.heading?.trim() ?? null,
      imageAlt: block.imageAlt?.trim() ?? null,
      imageCaption: block.imageCaption?.trim() ?? null,
      imageCredit: block.imageCredit?.trim() ?? null,
      tocLabel: block.tocLabel?.trim() ?? null,
    } satisfies BlogBodyBlock;
  });
}

function inferReadTime(blocks: BlogBodyBlock[]) {
  const text = blocks
    .flatMap((block) => {
      const parts: string[] = [];
      if (block.heading) parts.push(stripHtmlTags(block.heading));
      if (block.text) parts.push(stripHtmlTags(block.text));
      if (Array.isArray(block.items)) parts.push(block.items.map((item) => stripHtmlTags(item)).join(" "));
      if (block.calloutTitle) parts.push(stripHtmlTags(block.calloutTitle));
      if (block.statLabel) parts.push(stripHtmlTags(block.statLabel));
      if (block.statValue) parts.push(stripHtmlTags(block.statValue));
      return parts;
    })
    .join(" ");

  const words = wordsIn(text);
  const readTimeMinutes = Math.max(1, Math.round(words / 220)) || 5;
  return {
    readTimeMinutes,
    readTimeLabel: `${readTimeMinutes} min read`,
  };
}

export function prepareEditorialPost(post: BlogPost): PreparedEditorialPost {
  const baseBlocks = post.bodyBlocks && post.bodyBlocks.length > 0
    ? post.bodyBlocks
    : toFallbackBlocks(post);
  const blocks = normalizeBlocks(baseBlocks);
  const buildId = toUniqueIds();
  const toc: EditorialTocItem[] = [];

  blocks.forEach((block) => {
    const isHeading = block.type === "heading2" || block.type === "heading3";
    if (!isHeading || block.hideFromToc) {
      return;
    }
    const rawLabel = block.tocLabel || block.heading || block.text || "Section";
    const label = stripHtmlTags(rawLabel).trim();
    if (!label) {
      return;
    }
    toc.push({
      id: buildId(label),
      label,
      level: block.type === "heading3" ? 3 : 2,
      blockId: block.id,
    });
  });

  const parsedMinutes = parseReadTimeMinutes(post.readTime);
  const inferred = inferReadTime(blocks);
  const readTimeMinutes = parsedMinutes ?? inferred.readTimeMinutes;
  const readTimeLabel = post.readTime?.trim() || `${readTimeMinutes} min read`;

  const categories = [post.primaryCategory || post.category, ...(post.secondaryCategories ?? [])]
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    blocks,
    toc,
    readTimeLabel,
    readTimeMinutes,
    categories: categories.length > 0 ? categories : [post.category],
  };
}

export function getPostCoverImage(post: BlogPost, variant: "hero" | "card" | "thumb" = "hero") {
  const image = post.featuredImageUrl || post.mediaImageUrl;
  if (image && !image.startsWith("data:image/")) {
    return image;
  }

  const placeholderVariant = variant === "thumb" ? "thumb" : variant === "card" ? "card" : "hero";
  return buildMediaPlaceholderDataUri(
    `blog-${post.slug}`,
    post.title || "Reading Insights",
    post.primaryCategory || post.category || "Editorial",
    { variant: placeholderVariant },
  );
}

export function selectSpotlightPosts(post: BlogPost, allPosts: BlogPost[], limit = 4) {
  const sameCategory = allPosts.filter((candidate) => {
    if (candidate.slug === post.slug) {
      return false;
    }
    return candidate.category === post.category || candidate.primaryCategory === post.primaryCategory;
  });

  const fallback = allPosts.filter((candidate) => candidate.slug !== post.slug);
  const unique = new Map<string, BlogPost>();
  [...sameCategory, ...fallback].forEach((candidate) => {
    if (!unique.has(candidate.slug)) {
      unique.set(candidate.slug, candidate);
    }
  });
  return [...unique.values()].slice(0, limit);
}

export function formatPostDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
