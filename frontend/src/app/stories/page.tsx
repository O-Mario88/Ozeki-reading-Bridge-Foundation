import Link from "next/link";

import { fetchPublic } from "@/lib/api";

export const dynamic = "force-dynamic";

type Story = {
  slug: string;
  title: string;
  excerpt: string;
  language: string;
  published_at: string | null;
};

export default async function StoriesPage() {
  let stories: Story[] = [];
  try {
    stories = await fetchPublic<Story[]>("/api/v1/public/stories", 60);
  } catch {
    stories = [];
  }

  return (
    <div className="container stack">
      <h1 style={{ margin: 0 }}>Stories</h1>
      <div className="grid">
        {stories.map((story) => (
          <article key={story.slug} className="card">
            <div className="pill" style={{ marginBottom: 6 }}>
              {story.language}
            </div>
            <h2 style={{ margin: 0, fontSize: "1rem" }}>
              <Link href={`/stories/${story.slug}`}>{story.title}</Link>
            </h2>
            <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>{story.excerpt || "No excerpt."}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
