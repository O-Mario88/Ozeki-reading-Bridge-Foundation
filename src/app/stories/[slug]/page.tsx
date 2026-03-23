import Link from "next/link";
import type { Metadata } from "next";
import { StoryReader } from "@/components/StoryReader";
import { StoryFeedback } from "@/components/StoryFeedback";
import { notFound } from "next/navigation";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { BookOpen, User, BookMarked, Eye } from "lucide-react";
import {
    getStoryBySlugPostgres,
    getStoryRatingStatsPostgres,
    incrementStoryViewCountPostgres,
    listPublishedStoriesBySchoolPostgres,
    listStoryCommentsPostgres,
} from "@/lib/server/postgres/repositories/public-content";

export const revalidate = 300;

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
            url: "https://www.ozekiread.org",
        },
        datePublished: story.publishedAt,
    };

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
            />

            <main className="flex-grow pt-[72px] md:pt-20">
                <section className="relative overflow-hidden bg-brand-background pt-16 pb-16 md:pt-24 md:pb-24 border-b border-gray-100">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#FA7D15]/5 via-brand-background to-brand-background pointer-events-none" />
                    
                    <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10">
                        <nav className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-8" aria-label="Breadcrumb">
                            <Link href="/stories" className="hover:text-[#FA7D15] transition-colors">Story Library</Link>
                            <span aria-hidden>›</span>
                            <span className="text-gray-900 truncate max-w-[200px] md:max-w-md">{story.title}</span>
                        </nav>
                        
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] font-bold text-sm mb-6 shadow-sm border border-[#FA7D15]/20">
                            <BookOpen className="w-4 h-4" /> 1001 Story Project
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
                            {story.title}
                        </h1>
                        
                        {story.excerpt ? (
                            <p className="text-xl text-gray-600 max-w-3xl leading-relaxed mb-6">
                                {story.excerpt}
                            </p>
                        ) : null}
                        
                        <div className="flex flex-wrap items-center gap-3 text-gray-600 font-medium mb-10 text-lg">
                            <span className="text-gray-900 font-bold">{safeAuthorName}</span>
                            <span className="text-gray-300">•</span>
                            <Link href={`/schools/${story.schoolId}`} className="hover:text-[#FA7D15] transition-colors">
                                {story.schoolName}
                            </Link>
                            <span className="text-gray-300">•</span>
                            <span>{story.district}{story.subRegion ? `, ${story.subRegion}` : ""}</span>
                            {story.grade && (
                                <>
                                    <span className="text-gray-300">•</span>
                                    <span>{story.grade}</span>
                                </>
                            )}
                        </div>

                        <div className="inline-flex items-center gap-4 p-3 pr-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-[#006b61] bg-[#006b61]/10">
                                {safeAuthorName.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-left">
                                <p className="m-0 font-bold text-gray-900 leading-tight">{safeAuthorName}</p>
                                <p className="m-0 text-sm font-medium text-gray-500">
                                    {story.grade || "Class not set"} • {story.schoolName}
                                </p>
                            </div>
                        </div>

                        {story.anthologySlug && (
                            <div className="mt-8 flex items-center gap-4">
                                <Link 
                                    href={`/anthologies/${story.anthologySlug}#page=${story.pageStart}`} 
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#006b61] text-white font-bold hover:bg-[#006b61]/90 transition-colors shadow-md"
                                >
                                    <BookMarked className="w-5 h-5" /> Read original in PDF
                                </Link>
                            </div>
                        )}
                    </div>
                </section>

                <SectionWrapper theme="light">
                    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12">
                        
                        <article className="flex-grow w-full lg:w-2/3">
                            <div className="p-4 mb-8 bg-[#FA7D15]/5 border border-[#FA7D15]/10 rounded-xl text-sm text-gray-600 leading-relaxed italic">
                                Disclaimer: This work is published with the explicit written consent of the author's guardian and school. Standard safeguarding policies apply.
                            </div>

                            {story.storyContentBlocks && story.storyContentBlocks.length > 0 ? (
                                <div className="prose prose-lg text-gray-800 max-w-none">
                                    <StoryReader title={story.title} author={safeAuthorName} blocks={story.storyContentBlocks} />
                                </div>
                            ) : story.contentText ? (
                                <PremiumCard className="p-8 md:p-12 mb-8 bg-white border border-gray-100 shadow-sm leading-relaxed text-lg text-gray-800 space-y-6">
                                    {story.contentText.split("\n").map((para, i) => (
                                        <p key={i}>{para}</p>
                                    ))}
                                </PremiumCard>
                            ) : (
                                <PremiumCard className="p-8 text-center text-gray-500 italic bg-white">
                                    Story content is available in the printed anthology.
                                </PremiumCard>
                            )}

                            {story.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-8 mb-12">
                                    {story.tags.map(tag => (
                                        <Link key={tag} href={`/stories?tag=${encodeURIComponent(tag)}`} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors">
                                            {tag}
                                        </Link>
                                    ))}
                                </div>
                            )}
                            
                            <hr className="my-12 border-gray-100" />
                            <StoryFeedback slug={story.slug} initialStats={ratingStats} initialComments={comments} />
                        </article>

                        <aside className="w-full lg:w-1/3 flex flex-col gap-8 shrink-0">
                            <PremiumCard className="p-6 md:p-8 bg-white" withHover>
                                <h3 className="font-extrabold text-xl text-gray-900 mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5 text-[#006b61]" /> About the Author
                                </h3>
                                <p className="text-gray-600 leading-relaxed mb-4">
                                    This story was written by <strong>{safeAuthorName}</strong> as part of the{" "}
                                    <Link href="/story-project" className="text-[#FA7D15] font-bold hover:underline">1001 Story Project</Link>.
                                </p>
                                {story.authorAbout ? (
                                    <p className="text-sm text-gray-500 leading-relaxed italic border-l-2 border-[#006b61]/20 pl-4 mb-4">
                                        "{story.authorAbout}"
                                    </p>
                                ) : null}
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-6 bg-gray-50 p-3 rounded-lg">
                                    <Eye className="w-4 h-4 text-gray-400" /> {story.viewCount.toLocaleString()} {story.viewCount === 1 ? "view" : "views"}
                                </div>
                                <Link 
                                    href={`/schools/${story.schoolId}`} 
                                    className="block text-center w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 text-gray-700 font-bold hover:border-[#006b61] hover:text-[#006b61] transition-colors"
                                >
                                    View School Profile
                                </Link>
                            </PremiumCard>

                            {moreStories.length > 0 && (
                                <PremiumCard className="p-6 md:p-8 bg-white">
                                    <h3 className="font-extrabold text-lg text-gray-900 mb-6 border-b border-gray-100 pb-4">
                                        More from {story.schoolName}
                                    </h3>
                                    <div className="flex flex-col gap-5">
                                        {moreStories.map(s => (
                                            <Link key={s.slug} href={`/stories/${s.slug}`} className="group block">
                                                <h4 className="font-bold text-gray-900 group-hover:text-[#FA7D15] transition-colors line-clamp-2 leading-tight mb-1">
                                                    {s.title}
                                                </h4>
                                                <p className="text-sm text-gray-500 font-medium">
                                                    {s.publicAuthorDisplay}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                    <Link
                                        href={`/stories?schoolId=${story.schoolId}`}
                                        className="inline-block mt-6 text-sm text-[#006b61] font-bold hover:text-[#006b61]/80 hover:underline"
                                    >
                                        View all from this school →
                                    </Link>
                                </PremiumCard>
                            )}
                        </aside>

                    </div>
                </SectionWrapper>
            </main>
        </div>
    );
}
