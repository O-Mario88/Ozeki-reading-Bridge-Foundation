import Link from "next/link";
import { listPublishedChangeStories } from "@/lib/change-stories";

export const revalidate = 300;

export const metadata = {
  title: "Stories of Measurable Change",
  description:
    "Staff-entered change stories with field evidence and measurable outcomes from supported schools.",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ImpactCaseStudiesPage() {
  const stories = await listPublishedChangeStories(240);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Impact</p>
          <h1>Stories of measurable change</h1>
          <p>Summaries from staff-entered change stories. Full details are available per story.</p>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          {stories.length === 0 ? (
            <article className="card">
              <h2>No change stories published yet</h2>
              <p>Staff can submit stories from the portal. Approved stories appear here automatically.</p>
              <div className="action-row">
                <Link className="button" href="/portal/testimonials">
                  Open staff change story form
                </Link>
              </div>
            </article>
          ) : null}

          {stories.map((story) => (
            <article className="card" key={story.id}>
              {story.photoUrl ? (
                <img
                  src={story.photoUrl}
                  alt={`Evidence photo for ${story.title}`}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    objectFit: "cover",
                    borderRadius: "12px",
                    marginBottom: "0.85rem",
                  }}
                />
              ) : null}
              <p className="meta-pill">{story.district}</p>
              <h2>{story.title}</h2>
              <p>{story.excerpt}</p>
              <p className="meta-line">
                {story.schoolName} • {story.storytellerName} ({story.storytellerRole}) •{" "}
                {formatDate(story.createdAt)}
              </p>
              <div className="action-row">
                <Link className="button" href={`/impact/case-studies/${story.slug}`}>
                  Read full change story
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
