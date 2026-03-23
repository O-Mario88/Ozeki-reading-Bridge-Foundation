import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { ResourceLibrary } from "@/components/ResourceLibrary";
import { resources } from "@/lib/content";
import { listPublishedPortalResources } from "@/lib/content-db";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resources Library | Ozeki Reading Bridge Foundation",
  description:
    "Search and download phonics, fluency, comprehension, and assessment resources by grade and skill.",
};

export default async function ResourcesPage() {
  const portalResources = (await listPublishedPortalResources(250, {
    sections: ["Resources Library"],
  })).map((entry) => ({
    slug: entry.slug,
    title: entry.title,
    description: entry.description,
    grade: entry.grade,
    skill: entry.skill,
    type: entry.type,
    section: entry.section,
    filePath: entry.externalUrl || `/api/resources/${entry.id}/download`,
    downloadLabel: entry.downloadLabel || undefined,
  }));

  const mergedResources = [...portalResources, ...resources];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <SiteHeader />
      
      <main className="flex-grow pt-[72px] md:pt-20">
        <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-24 border-b border-gray-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-[#006b61]/10 via-brand-background to-brand-background pointer-events-none" />
          <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#006b61]/10 text-[#006b61] font-bold text-sm mb-6 shadow-sm border border-[#006b61]/20">
              <BookOpen className="w-4 h-4" /> Downloadable Resources
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
              Resources Library
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Filter by grade, skill, and resource type. Enter your email once to unlock all curriculum downloads.
            </p>
          </div>
        </section>

        <SectionWrapper theme="light">
          <div className="max-w-7xl mx-auto">
            <ResourceLibrary resources={mergedResources} />
          </div>
        </SectionWrapper>
      </main>

      <SiteFooter />
    </div>
  );
}
