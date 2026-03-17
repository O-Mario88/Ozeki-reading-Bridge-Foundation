import Link from "next/link";
import type { Metadata } from "next";
import { StoryReader } from "@/components/StoryReader";
import { StoryFeedback } from "@/components/StoryFeedback";
import { notFound } from "next/navigation";
import {
    getStoryBySlugPostgres,
    getStoryRatingStatsPostgres,
    incrementStoryViewCountPostgres,
    listPublishedStoriesBySchoolPostgres,
    listStoryCommentsPostgres,
} from "@/lib/server/postgres/repositories/public-content";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { slug } = await params;
    const story = await getStoryBySlugPostgres(slug);
    if (!story) return { title: "Story Not Found" };
    const safeAuthorName = story.publicAuthorDisplay?.trim() || "Learner Author";

    return {
        title: `${story.title} — 1001 Story Library`,
        description: story.excerpt || `A story by ${safeAuthorName} from the 1001 Story Project.`,
        openGraph: {
            title: story.title,
            description: story.excerpt || `A story by ${safeAuthorName}.`,
            type: "article",
        },
    };
}

export default async function StoryDetailPage({ params }: { params: Params }) {
    const { slug } = await params;
    const story = await getStoryBySlugPostgres(slug);
    if (!story) notFound();

    await incrementStoryViewCountPostgres(story.id);

    const moreStories = (await listPublishedStoriesBySchoolPostgres(story.schoolId, 4)).filter(s => s.slug !== story.slug);
    const comments = await listStoryCommentsPostgres(story.id);
    const ratingStats = await getStoryRatingStatsPostgres(story.id);
    const safeAuthorName = story.publicAuthorDisplay?.trim() || "Learner Author";

    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: story.title,
        description: story.excerpt,
        author: {
            "@type": "Person",
            name: safeAuthorName,
        },
        publisher: {
            "@type": "Organization",
            name: "Ozeki Reading Bridge Foundation",
            url: "https://ozekireadingbridge.org",
        },
        datePublished: story.publishedAt,
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
            />

            <section className="page-hero">
                <div className="container">
                    <nav className="impact-dash-breadcrumb" aria-label="Breadcrumb">
                        <Link href="/stories">Story Library</Link>
                        <span aria-hidden>›</span>
                        <span>{story.title}</span>
                    </nav>
                    <p className="kicker">1001 Story Project</p>
                    <h1>{story.title}</h1>
                    {story.excerpt ? (
                        <p style={{ maxWidth: "760px", margin: "0.75rem auto 0", fontSize: "1.05rem", color: "var(--md-sys-color-on-surface-variant)" }}>
                            {story.excerpt}
                        </p>
                    ) : null}
                    <div className="story-detail-meta" style={{ marginBottom: story.anthologySlug ? "1.5rem" : "0" }}>
                        <span className="story-detail-author">{safeAuthorName}</span>
                        <span className="story-detail-divider">•</span>
                        <Link href={`/schools/${story.schoolId}`} className="story-detail-school">
                            {story.schoolName}
                        </Link>
                        <span className="story-detail-divider">•</span>
                        <span>{story.district}{story.subRegion ? `, ${story.subRegion}` : ""}</span>
                        {story.grade && (
                            <>
                                <span className="story-detail-divider">•</span>
                                <span>{story.grade}</span>
                            </>
                        )}
                    </div>
                    <div style={{
                        display: "inline-grid",
                        gridTemplateColumns: "40px 1fr",
                        gap: "0.6rem",
                        alignItems: "center",
                        marginTop: "0.85rem",
                        padding: "0.55rem 0.8rem",
                        borderRadius: "12px",
                        border: "1px solid var(--md-sys-color-outline-variant)",
                        background: "var(--md-sys-color-surface)"
                    }}>
                        <div
                            aria-hidden
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "999px",
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 800,
                                color: "var(--md-sys-color-primary)",
                                background: "color-mix(in oklab, var(--md-sys-color-secondary), white 75%)"
                            }}
                        >
                            {safeAuthorName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ textAlign: "left" }}>
                            <p style={{ margin: 0, fontWeight: 700 }}>{safeAuthorName}</p>
                            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--md-sys-color-on-surface-variant)" }}>
                                {story.grade || "Class not set"} • {story.schoolName}
                            </p>
                        </div>
                    </div>
                    <p style={{ margin: "0.5rem auto 0", maxWidth: "760px", fontSize: "0.82rem", color: "var(--md-sys-color-on-surface-variant)" }}>
                        <em>
                            Learner name, photo, age, and school details are published with written consent from the parent/guardian and the school.
                        </em>
                    </p>

                    {story.anthologySlug && (
                        <div>
                            <Link href={`/anthologies/${story.anthologySlug}#page=${story.pageStart}`} className="button" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1.2rem" }}>
                                <span style={{ fontSize: "1.2rem" }}>📖</span>
                                Read original in PDF format
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            <section className="section">
                <div className="container story-detail-layout">
                    <article className="story-detail-content">
                        <div style={{ padding: "0.5rem 1rem", marginBottom: "1rem", backgroundColor: "var(--md-sys-color-surface-variant)", borderRadius: "6px", fontSize: "0.85rem", color: "var(--md-sys-color-on-surface-variant)" }}>
                            <em>Disclaimer: This work is published with the explicit written consent of the author's guardian and school. Standard safeguarding policies apply.</em>
                        </div>

                        {story.storyContentBlocks && story.storyContentBlocks.length > 0 ? (
                            <StoryReader title={story.title} author={safeAuthorName} blocks={story.storyContentBlocks} />
                        ) : story.contentText ? (
                            <div className="card" style={{ padding: "2rem" }}>
                                <div className="story-detail-body">
                                    {story.contentText.split("\n").map((para, i) => (
                                        <p key={i}>{para}</p>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: "2rem" }}>
                                <p style={{ color: "var(--md-sys-color-on-surface-variant)", fontStyle: "italic" }}>
                                    Story content is available in the printed anthology.
                                </p>
                            </div>
                        )}

                        {story.tags.length > 0 && (
                            <div className="story-detail-tags" style={{ marginTop: "2rem" }}>
                                {story.tags.map(tag => (
                                    <Link key={tag} href={`/stories?tag=${encodeURIComponent(tag)}`} className="story-tag-chip">
                                        {tag}
                                    </Link>
                                ))}
                            </div>
                        )}
                        <StoryFeedback slug={story.slug} initialStats={ratingStats} initialComments={comments} />
                    </article>

                    <aside className="story-detail-sidebar">
                        <div className="card" style={{ padding: "1.2rem" }}>
                            <h3 style={{ marginTop: 0, fontSize: "1rem" }}>About this story</h3>
                            <p style={{ fontSize: "0.9rem" }}>
                                This story was written by <strong>{safeAuthorName}</strong> as part of the{" "}
                                <Link href="/story-project" style={{ color: "var(--md-sys-color-secondary)", textDecoration: "underline" }}>1001 Story Project</Link>.
                            </p>
                            {story.authorAbout ? (
                                <p style={{ fontSize: "0.85rem", color: "var(--md-sys-color-on-surface-variant)" }}>
                                    {story.authorAbout}
                                </p>
                            ) : null}
                            <p style={{ fontSize: "0.85rem", color: "var(--md-sys-color-on-surface-variant)" }}>
                                {story.viewCount.toLocaleString()} {story.viewCount === 1 ? "view" : "views"}
                            </p>
                            <div className="action-row" style={{ marginTop: "0.8rem" }}>
                                <Link href={`/schools/${story.schoolId}`} className="button button-ghost" style={{ fontSize: "0.85rem" }}>
                                    View school profile
                                </Link>
                            </div>
                        </div>

                        {moreStories.length > 0 && (
                            <div className="card" style={{ padding: "1.2rem", marginTop: "1rem" }}>
                                <h3 style={{ marginTop: 0, fontSize: "1rem" }}>More from {story.schoolName}</h3>
                                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                    {moreStories.map(s => (
                                        <li key={s.slug} style={{ marginBottom: "0.6rem" }}>
                                            <Link href={`/stories/${s.slug}`} style={{ color: "var(--md-sys-color-secondary)", fontWeight: 600 }}>
                                                {s.title}
                                            </Link>
                                            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--md-sys-color-on-surface-variant)" }}>
                                                {s.publicAuthorDisplay}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={`/stories?schoolId=${story.schoolId}`}
                                    style={{ fontSize: "0.85rem", color: "var(--md-sys-color-secondary)", fontWeight: 600 }}
                                >
                                    View all from this school →
                                </Link>
                            </div>
                        )}
                    </aside>
                </div>
            </section>
        </>
    );
}
