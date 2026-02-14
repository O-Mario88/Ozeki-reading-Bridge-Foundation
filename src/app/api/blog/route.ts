import { NextResponse } from "next/server";
import { blogPosts } from "@/lib/content";

export async function GET() {
  return NextResponse.json({
    posts: blogPosts.map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      author: post.author,
      publishedAt: post.publishedAt,
      readTime: post.readTime,
    })),
  });
}
