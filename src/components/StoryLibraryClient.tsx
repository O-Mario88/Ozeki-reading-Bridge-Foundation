"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { PublishedStory, AnthologyRecord } from "@/lib/types";

interface Props {
    initialStories: PublishedStory[];
    initialTotal: number;
    initialAnthologies: AnthologyRecord[];
    languages: string[];
    tags: string[];
}

type Tab = "stories" | "anthologies";

function StoryCard({ story }: { story: PublishedStory }) {
    return (
        <Link href={`/stories/${story.slug}`} className="story-card card">
            {story.coverImagePath ? (
                <div className="story-card-cover">
                    <img src={story.coverImagePath} alt="" loading="lazy" />
                </div>
            ) : (
                <div className="story-card-cover story-card-cover-placeholder">
                    <span>📖</span>
                </div>
            )}
            <div className="story-card-body">
                <h3 className="story-card-title">{story.title}</h3>
                <p className="story-card-author">{story.publicAuthorDisplay}</p>
                <p className="story-card-school">
                    {story.schoolName} — {story.district}
                    {story.grade ? ` • ${story.grade}` : ""}
                </p>
                {story.excerpt && (
                    <p className="story-card-excerpt">{story.excerpt.length > 120 ? `${story.excerpt.slice(0, 120)}…` : story.excerpt}</p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.80rem", color: "var(--md-sys-color-on-surface-variant)", marginTop: "0.5rem" }}>
                    <span title="Reads" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        👁️ {story.viewCount || 0}
                    </span>
                    {story.averageStars ? (
                        <span title="Average Rating" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            ⭐ {story.averageStars.toFixed(1)} {story.ratingCount ? <span style={{ opacity: 0.6 }}>({story.ratingCount})</span> : ""}
                        </span>
                    ) : null}
                    {story.commentCount ? (
                        <span title="Comments" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            💬 {story.commentCount}
                        </span>
                    ) : null}
                </div>
                {story.latestCommentSnippet && (
                    <div style={{ padding: "0.5rem", margin: "0.5rem 0", backgroundColor: "var(--md-sys-color-surface-container)", borderRadius: "6px", fontSize: "0.82rem", fontStyle: "italic" }}>
                        "{story.latestCommentSnippet.length > 65 ? `${story.latestCommentSnippet.slice(0, 65)}…` : story.latestCommentSnippet}"
                    </div>
                )}
                <div className="story-card-footer" style={{ marginTop: "auto", paddingTop: "1rem" }}>
                    {story.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="story-tag-chip-small">{tag}</span>
                    ))}
                </div>
            </div>
        </Link>
    );
}

function AnthologyCard({ anthology }: { anthology: AnthologyRecord }) {
    return (
        <Link href={`/anthologies/${anthology.slug}`} className="story-card card">
            {anthology.coverImagePath ? (
                <div className="story-card-cover">
                    <img src={anthology.coverImagePath} alt="" loading="lazy" />
                </div>
            ) : (
                <div className="story-card-cover story-card-cover-placeholder" style={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}>
                    <span>📚</span>
                </div>
            )}
            <div className="story-card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3 className="story-card-title">{anthology.title}</h3>
                    {anthology.featured && <span title="Featured" style={{ fontSize: "1.2rem" }}>⭐</span>}
                </div>
                <p className="story-card-school">
                    {anthology.edition && <span style={{ fontWeight: 600 }}>{anthology.edition} • </span>}
                    {anthology.scopeType === "school" ? anthology.schoolName : `${anthology.districtScope || anthology.scopeType} Anthology`}
                </p>
                <div className="story-card-footer" style={{ marginTop: "auto", paddingTop: "1rem" }}>
                    <span className="story-tag-chip-small">{anthology.pdfPageCount} pages</span>
                </div>
            </div>
        </Link>
    );
}

export function StoryLibraryClient({ initialStories, initialTotal, initialAnthologies, languages, tags }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>("stories");

    const [stories, setStories] = useState(initialStories);
    const [total, setTotal] = useState(initialTotal);
    const [query, setQuery] = useState("");
    const [district, setDistrict] = useState("");
    const [grade, setGrade] = useState("");
    const [tag, setTag] = useState("");
    const [language, setLanguage] = useState("");
    const [sort, setSort] = useState("newest");
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);

    const doSearch = useCallback(async (overrides: Record<string, string | number> = {}) => {
        setLoading(true);
        const params = new URLSearchParams();
        const q = (overrides.q as string) ?? query;
        const d = (overrides.district as string) ?? district;
        const g = (overrides.grade as string) ?? grade;
        const t = (overrides.tag as string) ?? tag;
        const l = (overrides.language as string) ?? language;
        const s = (overrides.sort as string) ?? sort;
        const p = (overrides.page as number) ?? page;

        if (q) params.set("q", q);
        if (d) params.set("district", d);
        if (g) params.set("grade", g);
        if (t) params.set("tag", t);
        if (l) params.set("language", l);
        params.set("sort", s);
        params.set("page", String(p));

        try {
            const res = await fetch(`/api/stories?${params}`);
            const data = await res.json();
            setStories(data.stories ?? []);
            setTotal(data.total ?? 0);
        } finally {
            setLoading(false);
        }
    }, [query, district, grade, tag, language, sort, page]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        doSearch({ page: 1 });
    };

    const updateFilter = (key: string, value: string) => {
        const setters: Record<string, (v: string) => void> = { district: setDistrict, grade: setGrade, tag: setTag, language: setLanguage, sort: setSort };
        setters[key]?.(value);
        setPage(1);
        doSearch({ [key]: value, page: 1 });
    };

    const hasMore = stories.length < total;

    return (
        <>
            <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--md-sys-color-outline-variant)", paddingBottom: "0.5rem", marginBottom: "2rem" }}>
                <button
                    className={`button ${activeTab === "stories" ? "" : "button-ghost"}`}
                    onClick={() => setActiveTab("stories")}
                >
                    Individual Stories
                </button>
                <button
                    className={`button ${activeTab === "anthologies" ? "" : "button-ghost"}`}
                    onClick={() => setActiveTab("anthologies")}
                >
                    Full Anthologies
                </button>
            </div>

            {activeTab === "stories" ? (
                <>
                    <form onSubmit={handleSearch} className="story-search-bar">
                        <input
                            type="search"
                            placeholder="Search stories by title or keyword…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="story-search-input"
                        />
                        <button type="submit" className="button" disabled={loading}>
                            {loading ? "…" : "Search"}
                        </button>
                    </form>

                    <div className="story-filter-row">
                        <select value={grade} onChange={e => updateFilter("grade", e.target.value)} aria-label="Filter by grade">
                            <option value="">All Grades</option>
                            {["P1", "P2", "P3", "P4", "P5", "P6", "P7"].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>

                        {languages.length > 1 && (
                            <select value={language} onChange={e => updateFilter("language", e.target.value)} aria-label="Filter by language">
                                <option value="">All Languages</option>
                                {languages.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        )}

                        {tags.length > 0 && (
                            <select value={tag} onChange={e => updateFilter("tag", e.target.value)} aria-label="Filter by tag">
                                <option value="">All Themes</option>
                                {tags.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        )}

                        <select value={sort} onChange={e => updateFilter("sort", e.target.value)} aria-label="Sort stories">
                            <option value="newest">Newest</option>
                            <option value="views">Most Viewed</option>
                            <option value="school">By School</option>
                        </select>
                    </div>

                    <p className="story-result-count">
                        {total} {total === 1 ? "story" : "stories"} found
                    </p>

                    {stories.length === 0 ? (
                        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
                            <p style={{ fontSize: "1.1rem" }}>No stories match your search.</p>
                            <p style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
                                Try adjusting your filters or search query.
                            </p>
                        </div>
                    ) : (
                        <div className="story-library-grid">
                            {stories.map(story => (
                                <StoryCard key={story.slug} story={story} />
                            ))}
                        </div>
                    )}

                    {hasMore && (
                        <div style={{ textAlign: "center", marginTop: "2rem" }}>
                            <button
                                className="button button-ghost"
                                onClick={() => {
                                    const next = page + 1;
                                    setPage(next);
                                    doSearch({ page: next });
                                }}
                                disabled={loading}
                            >
                                Load more stories
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <>
                    {initialAnthologies.length === 0 ? (
                        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
                            <p style={{ fontSize: "1.1rem" }}>No anthologies published yet.</p>
                        </div>
                    ) : (
                        <div className="story-library-grid">
                            {initialAnthologies.map(anth => (
                                <AnthologyCard key={anth.slug} anthology={anth} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </>
    );
}
