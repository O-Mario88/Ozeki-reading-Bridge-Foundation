import Link from "next/link";
import { BlogIndex } from "@/components/BlogIndex";
import { PageHero } from "@/components/PageHero";
import { getMergedPublishedBlogPosts } from "@/lib/blog-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog",
  description:
    "Practical literacy guidance for phonics, fluency, comprehension, assessments, remedial strategies, and school systems.",
};

export default function BlogPage() {
  const posts = getMergedPublishedBlogPosts();
  const categories = Array.from(new Set(posts.map((post) => post.category))).sort((a, b) =>
    a.localeCompare(b),
  );
  const latestPost = posts[0] ?? null;
  const highlights = [...posts]
    .sort((a, b) => {
      const viewDiff = (b.views ?? 0) - (a.views ?? 0);
      if (viewDiff !== 0) {
        return viewDiff;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })
    .slice(0, 3);

  return (
    <>
      <PageHero
        kicker="Knowledge hub"
        title="Blog"
        description="Practical content for teachers and school leaders: phonics, fluency, assessments, coaching, and implementation tips."
      />

      {latestPost ? (
        <section className="section">
          <div className="container">
            <article className="card">
              <p className="meta-pill">Latest article</p>
              <h2>{latestPost.title}</h2>
              {latestPost.subtitle ? <p>{latestPost.subtitle}</p> : null}
              <p>{latestPost.excerpt}</p>
              <p className="meta-line">
                {latestPost.author} · {new Date(latestPost.publishedAt).toLocaleDateString()} ·{" "}
                {latestPost.readTime}
              </p>
              <div className="action-row">
                <Link className="button" href={`/blog/${latestPost.slug}`}>
                  Read latest article
                </Link>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="container">
          <BlogIndex posts={posts} categories={categories} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Most Recent / Popular</h2>
            <p>Top performing and latest practical literacy articles.</p>
          </div>
          <div className="cards-grid">
            {highlights.map((post) => (
              <article key={post.slug} className="card">
                <p className="meta-pill">{post.category}</p>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <p className="meta-line">
                  {post.author} · {new Date(post.publishedAt).toLocaleDateString()} ·{" "}
                  {post.views ?? 0} views
                </p>
                <Link className="button button-ghost" href={`/blog/${post.slug}`}>
                  Open article
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
