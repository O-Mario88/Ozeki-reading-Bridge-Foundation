import { fetchPublic } from "@/lib/api";

export const dynamic = "force-dynamic";

type Post = {
  slug: string;
  title: string;
  summary: string;
  content_markdown: string;
  category: string;
  author_name: string;
};

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let post: Post = {
    slug,
    title: "Article unavailable",
    summary: "",
    content_markdown: "",
    category: "Literacy",
    author_name: "",
  };
  try {
    post = await fetchPublic<Post>(`/api/v1/public/blog/${encodeURIComponent(slug)}`, 60);
  } catch {
    post = {
      slug,
      title: "Article unavailable",
      summary: "This article could not be loaded right now.",
      content_markdown: "",
      category: "Literacy",
      author_name: "",
    };
  }

  return (
    <div className="container stack">
      <article className="card stack">
        <div className="pill">{post.category || "Literacy"}</div>
        <h1 style={{ margin: 0 }}>{post.title}</h1>
        <p style={{ margin: 0, color: "var(--text-muted)" }}>{post.summary}</p>
        <div style={{ color: "var(--text-muted)", fontSize: "0.86rem" }}>
          By {post.author_name || "Editorial Team"}
        </div>
        <div style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{post.content_markdown}</div>
      </article>
    </div>
  );
}
