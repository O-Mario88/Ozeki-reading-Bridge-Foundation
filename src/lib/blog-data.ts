import { blogPosts } from "@/lib/content";
import { getPublishedPortalBlogPostBySlug, listPublishedPortalBlogPosts } from "@/lib/db";
import { BlogPost, PortalBlogPostRecord } from "@/lib/types";

function estimateReadTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

function bodyToParagraphs(body: string) {
  const chunks = body
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  return chunks.length > 0 ? chunks : [body.trim()];
}

function buildExcerpt(post: PortalBlogPostRecord) {
  if (post.subtitle?.trim()) {
    return post.subtitle.trim().slice(0, 220);
  }
  const excerpt = post.body.replace(/\s+/g, " ").trim();
  return excerpt.length > 220 ? `${excerpt.slice(0, 217)}...` : excerpt;
}

export function mapPortalPostToBlogPost(post: PortalBlogPostRecord): BlogPost {
  const subtitle = post.subtitle?.trim() || undefined;
  const paragraphs = bodyToParagraphs(post.body);
  return {
    slug: post.slug,
    title: post.title,
    subtitle,
    excerpt: buildExcerpt(post),
    category: post.category,
    author: post.authorName,
    role: "Staff Contributor",
    publishedAt: post.publishedAt,
    readTime: estimateReadTime(post.body),
    tags: post.tags,
    sections: [
      {
        heading: subtitle || "Article",
        paragraphs,
      },
    ],
    mediaImageUrl: post.imageFileName ? `/api/blog/${post.id}/image` : null,
    mediaVideoUrl: post.videoFileName ? `/api/blog/${post.id}/video` : null,
    source: "portal",
    views: post.views,
  };
}

export function getMergedPublishedBlogPosts(): BlogPost[] {
  const portalPosts = listPublishedPortalBlogPosts(150).map((post) =>
    mapPortalPostToBlogPost(post),
  );
  const staticPosts = blogPosts.map((post) => ({
    ...post,
    source: "static" as const,
    views: post.views ?? 0,
  }));

  const map = new Map<string, BlogPost>();
  staticPosts.forEach((post) => map.set(post.slug, post));
  portalPosts.forEach((post) => map.set(post.slug, post));

  return [...map.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getMergedPublishedBlogPostBySlug(slug: string): BlogPost | null {
  const portal = getPublishedPortalBlogPostBySlug(slug);
  if (portal) {
    return mapPortalPostToBlogPost(portal);
  }

  return blogPosts.find((post) => post.slug === slug) ?? null;
}
