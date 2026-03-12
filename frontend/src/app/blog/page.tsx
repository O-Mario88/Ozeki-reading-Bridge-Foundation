import Link from "next/link";

import { fetchPublic } from "@/lib/api";

export const dynamic = "force-dynamic";

type Post = {
  slug: string;
  title: string;
  summary: string;
  category: string;
};

export default async function BlogPage() {
  let posts: Post[] = [];
  try {
    posts = await fetchPublic<Post[]>("/api/v1/public/blog", 60);
  } catch {
    posts = [];
  }

  return (
    <div className="container stack">
      <h1 style={{ margin: 0 }}>Blog</h1>
      <div className="grid">
        {posts.map((post) => (
          <article key={post.slug} className="card">
            <div className="pill" style={{ marginBottom: 6 }}>
              {post.category || "Literacy"}
            </div>
            <h2 style={{ margin: 0, fontSize: "1rem" }}>
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>{post.summary || "No summary."}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
