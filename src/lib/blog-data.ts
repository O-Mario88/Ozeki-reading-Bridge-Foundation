import { blogPosts } from "@/lib/content";
import {
  getPublishedPortalBlogPostBySlugAsync,
  listPublishedPortalBlogPostsAsync,
} from "@/services/blogService";
import { BlogPost } from "@/lib/types";

async function safeListPublishedPortalPostsAsync() {
  try {
    return await listPublishedPortalBlogPostsAsync();
  } catch {
    return [] as BlogPost[];
  }
}

export async function getMergedPublishedBlogPostsAsync(): Promise<BlogPost[]> {
  const mergedBySlug = new Map<string, BlogPost>();
  blogPosts.forEach((post) => {
    mergedBySlug.set(post.slug, post);
  });
  
  const portalPosts = await safeListPublishedPortalPostsAsync();
  portalPosts.forEach((post) => {
    mergedBySlug.set(post.slug, post);
  });

  return [...mergedBySlug.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export async function getMergedPublishedBlogPostBySlugAsync(slug: string): Promise<BlogPost | null> {
  try {
    const portalPost = await getPublishedPortalBlogPostBySlugAsync(slug);
    if (portalPost) {
      return portalPost;
    }
  } catch {
    // Fall through to static content for resilience.
  }
  return blogPosts.find((post) => post.slug === slug) ?? null;
}

export async function getMergedBlogCategoriesAsync() {
  const posts = await getMergedPublishedBlogPostsAsync();
  return [...new Set(posts.map((post) => post.category))].sort();
}
