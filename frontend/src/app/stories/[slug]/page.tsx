import { fetchPublic } from "@/lib/api";

export const dynamic = "force-dynamic";

type Story = {
  slug: string;
  title: string;
  excerpt: string;
  content_text: string;
  language: string;
};

export default async function StoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let story: Story = {
    slug,
    title: "Story unavailable",
    excerpt: "",
    content_text: "",
    language: "English",
  };
  try {
    story = await fetchPublic<Story>(`/api/v1/public/stories/${encodeURIComponent(slug)}`, 60);
  } catch {
    story = {
      slug,
      title: "Story unavailable",
      excerpt: "This story could not be loaded right now.",
      content_text: "",
      language: "English",
    };
  }

  return (
    <div className="container stack">
      <article className="card stack">
        <div className="pill">{story.language}</div>
        <h1 style={{ margin: 0 }}>{story.title}</h1>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>{story.excerpt}</p>
        <div style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{story.content_text}</div>
      </article>
    </div>
  );
}
