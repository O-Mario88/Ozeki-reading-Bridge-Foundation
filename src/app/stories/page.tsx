import type { Metadata } from "next";
import { StoryLibraryClient } from "@/components/StoryLibraryClient";
import { FeaturedAnthologyHero } from "@/components/dashboard/FeaturedAnthologyHero";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PageHero } from "@/components/public/PageHero";
import { BookOpen } from "lucide-react";
import {
    listPublishedAnthologiesPostgres,
    listPublishedStoriesPostgres,
    listStoryLanguagesPostgres,
    listStoryTagsPostgres,
} from "@/lib/server/postgres/repositories/public-content";

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

export default async function StoriesPage() {
    let stories: Awaited<ReturnType<typeof listPublishedStoriesPostgres>>["stories"] = [];
    let total = 0;
    let anthologies: Awaited<ReturnType<typeof listPublishedAnthologiesPostgres>> = [];
    let languages: string[] = [];
    let tags: string[] = [];
    try {
        const result = await listPublishedStoriesPostgres({ limit: 24 });
        stories = result.stories;
        total = result.total;
        anthologies = await listPublishedAnthologiesPostgres({ limit: 24 });
        languages = await listStoryLanguagesPostgres();
        tags = await listStoryTagsPostgres();
    } catch (error) {
        console.error("Failed to load stories data.", error);
    }

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <main className="flex-grow pt-[72px] md:pt-20">
                <PageHero
                    tagline={<><BookOpen className="w-4 h-4 inline" /> 1001 Story Project</>}
                    title="Story Library"
                    subtitle="Read stories written by primary school learners across Uganda. Every story is a step toward confidence, literacy, and voice."
                    imageSrc="/photos/27.jpeg"
                />

                {anthologies.length > 0 && anthologies[0].featured && (
                    <FeaturedAnthologyHero anthology={anthologies[0]} />
                )}

                <SectionWrapper theme="charius-beige">
                    <div className="max-w-7xl mx-auto">
                        <StoryLibraryClient
                            initialStories={stories}
                            initialTotal={total}
                            initialAnthologies={anthologies}
                            languages={languages}
                            tags={tags}
                        />
                    </div>
                </SectionWrapper>
            </main>
        </div>
    );
}
