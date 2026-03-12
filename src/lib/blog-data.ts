import { blogPosts } from "@/lib/content";
import {
  getPublishedPortalBlogPostBySlug,
  listPublishedPortalBlogPosts,
} from "@/lib/blog-db";
import { BlogPost } from "@/lib/types";

function safeListPublishedPortalPosts() {
  try {
    return listPublishedPortalBlogPosts();
  } catch {
    return [] as BlogPost[];
  }
}

export function getMergedPublishedBlogPosts(): BlogPost[] {
  const mergedBySlug = new Map<string, BlogPost>();
  blogPosts.forEach((post) => {
    mergedBySlug.set(post.slug, post);
  });
  safeListPublishedPortalPosts().forEach((post) => {
    mergedBySlug.set(post.slug, post);
  });

  return [...mergedBySlug.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getMergedPublishedBlogPostBySlug(slug: string): BlogPost | null {
  try {
    const portalPost = getPublishedPortalBlogPostBySlug(slug);
    if (portalPost) {
      return portalPost;
    }
  } catch {
    // Fall through to static content for resilience.
  }
  return blogPosts.find((post) => post.slug === slug) ?? null;
}

export function getMergedBlogCategories() {
  return [...new Set(getMergedPublishedBlogPosts().map((post) => post.category))].sort();
}
