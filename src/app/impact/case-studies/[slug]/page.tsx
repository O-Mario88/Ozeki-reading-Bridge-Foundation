import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedChangeStoryBySlug } from "@/lib/change-stories";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ImpactCaseStudyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = getPublishedChangeStoryBySlug(slug);

  if (!story) {
    notFound();
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Change story</p>
          <h1>{story.title}</h1>
          <p>
            {story.schoolName}, {story.district}
          </p>
          <p className="meta-line">
            Submitted by {story.storytellerName} ({story.storytellerRole}) •{" "}
            {formatDate(story.createdAt)}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Summary</h2>
            <p>{story.excerpt}</p>
            {story.videoUrl ? (
              <div className="action-row">
                <a className="button button-ghost" href={story.videoUrl} target="_blank" rel="noreferrer">
                  Open related video evidence
                </a>
              </div>
            ) : null}
          </article>

          <article className="card">
            <h2>Photo evidence</h2>
            {story.photoUrl ? (
              <img
                src={story.photoUrl}
                alt={`Photo evidence for ${story.title}`}
                loading="lazy"
                decoding="async"
                style={{
                  width: "100%",
                  maxHeight: "420px",
                  objectFit: "cover",
                  borderRadius: "12px",
                }}
              />
            ) : (
              <p>No photo was uploaded for this story.</p>
            )}
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container card flow">
          <h2>Full change story details</h2>
          {story.sections.length > 0 ? (
            story.sections.map((section) => (
              <article key={`${story.id}-${section.heading}`} className="flow">
                <h3>{section.heading}</h3>
                <p>{section.body}</p>
              </article>
            ))
          ) : (
            <p>{story.storyText}</p>
          )}

          <div className="action-row">
            <Link className="button button-ghost" href="/impact/case-studies">
              Back to stories of measurable change
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
