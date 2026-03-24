import type { Metadata } from "next";
import { StoryLibraryClient } from "@/components/StoryLibraryClient";
import { FeaturedAnthologyHero } from "@/components/dashboard/FeaturedAnthologyHero";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { BookOpen } from "lucide-react";
import {
    listPublishedAnthologiesPostgres,
    listPublishedStoriesPostgres,
    listStoryLanguagesPostgres,
    listStoryTagsPostgres,
} from "@/lib/server/postgres/repositories/public-content";

export const revalidate = 300;

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
                <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-24 border-b border-gray-100">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#006b61]/10 via-brand-background to-brand-background pointer-events-none" />
                    <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] font-bold text-sm mb-6 shadow-sm border border-[#FA7D15]/20">
                            <BookOpen className="w-4 h-4" /> 1001 Story Project
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold text-brand-primary tracking-tight leading-tight mb-6">
                            Story Library
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                            Read stories written by primary school learners across Uganda.
                            Every story is a step toward confidence, literacy, and voice.
                        </p>
                    </div>
                </section>

                {anthologies.length > 0 && anthologies[0].featured && (
                    <FeaturedAnthologyHero anthology={anthologies[0]} />
                )}

                <SectionWrapper theme="off-white">
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
