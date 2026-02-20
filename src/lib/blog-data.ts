import { blogCategories, blogPosts } from "@/lib/content";
import { BlogPost } from "@/lib/types";

export function getMergedPublishedBlogPosts(): BlogPost[] {
  return [...blogPosts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getMergedPublishedBlogPostBySlug(slug: string): BlogPost | null {
  return blogPosts.find((post) => post.slug === slug) ?? null;
}

export { blogCategories };
