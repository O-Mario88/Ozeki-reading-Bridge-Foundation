import { PageHero } from "@/components/PageHero";
import { ResourceLibrary } from "@/components/ResourceLibrary";
import { resources } from "@/lib/content";
import { listPublishedPortalResources } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resources Library",
  description:
    "Search and download phonics, fluency, comprehension, and assessment resources by grade and skill.",
};

export default function ResourcesPage() {
  const portalResources = listPublishedPortalResources(250, {
    sections: ["Resources Library"],
  }).map((entry) => ({
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
    <>
      <PageHero
        kicker="Downloadable resources"
        title="Resources Library"
        description="Filter by grade, skill, and resource type. Enter your email once to unlock all downloads."
      />

      <section className="section">
        <div className="container">
          <ResourceLibrary resources={mergedResources} />
        </div>
      </section>
    </>
  );
}
