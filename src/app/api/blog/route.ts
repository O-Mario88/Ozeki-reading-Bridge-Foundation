import { NextResponse } from "next/server";
import { getMergedPublishedBlogPosts } from "@/lib/blog-data";

export async function GET() {
  const posts = getMergedPublishedBlogPosts();

  return NextResponse.json({
    posts: posts.map((post) => ({
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
