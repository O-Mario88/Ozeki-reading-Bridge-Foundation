import { NextResponse } from "next/server";
import { getMergedPublishedBlogPosts } from "@/lib/blog-data";

export const runtime = "nodejs";

export async function GET() {
  const blogPosts = getMergedPublishedBlogPosts();
  return NextResponse.json({
    posts: blogPosts.map((post) => ({
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle ?? null,
      excerpt: post.excerpt,
      category: post.category,
      author: post.author,
      publishedAt: post.publishedAt,
      readTime: post.readTime,
      source: post.source ?? "static",
      views: post.views ?? 0,
      mediaImageUrl: post.mediaImageUrl ?? null,
      mediaVideoUrl: post.mediaVideoUrl ?? null,
    })),
  });
}
