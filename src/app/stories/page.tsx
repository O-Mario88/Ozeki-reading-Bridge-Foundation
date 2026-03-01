import type { Metadata } from "next";
import { listPublishedStories, listStoryLanguages, listStoryTags, listPublishedAnthologies } from "@/lib/db";
import { StoryLibraryClient } from "@/components/StoryLibraryClient";
import { FeaturedAnthologyHero } from "@/components/dashboard/FeaturedAnthologyHero";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "1001 Story Library — Learner-Authored Stories",
    description:
        "Read stories written by primary school learners across Uganda through the Ozeki Reading Bridge Foundation 1001 Story Project.",
    openGraph: {
        title: "1001 Story Library",
        description: "Learner-authored stories from schools in Uganda.",
        type: "website",
    },
};

export default function StoriesPage() {
    const { stories, total } = listPublishedStories({ limit: 24 });
    const anthologies = listPublishedAnthologies({ limit: 24 });
    const languages = listStoryLanguages();
    const tags = listStoryTags();

    return (
        <>
            <section className="page-hero">
                <div className="container">
                    <p className="kicker">1001 Story Project</p>
                    <h1>Story Library</h1>
                    <p style={{ maxWidth: "640px", fontSize: "1.1rem" }}>
                        Read stories written by primary school learners across Uganda.
                        Every story is a step toward confidence, literacy, and voice.
                    </p>
                </div>
            </section>

            {anthologies.length > 0 && anthologies[0].featured && (
                <FeaturedAnthologyHero anthology={anthologies[0]} />
            )}

            <section className="section" style={{ backgroundColor: "var(--md-sys-color-surface-container-low, #f6f6f6)" }}>
                <div className="container">
                    <StoryLibraryClient
                        initialStories={stories}
                        initialTotal={total}
                        initialAnthologies={anthologies}
                        languages={languages}
                        tags={tags}
                    />
                </div>
            </section>
        </>
    );
}
