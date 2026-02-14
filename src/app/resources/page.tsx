import { PageHero } from "@/components/PageHero";
import { ResourceLibrary } from "@/components/ResourceLibrary";
import { resources } from "@/lib/content";

export const metadata = {
  title: "Resources Library",
  description:
    "Search and download phonics, fluency, comprehension, and assessment resources by grade and skill.",
};

export default function ResourcesPage() {
  return (
    <>
      <PageHero
        kicker="Downloadable resources"
        title="Resources Library"
        description="Filter by grade, skill, and resource type. Enter your email once to unlock all downloads."
      />

      <section className="section">
        <div className="container">
          <ResourceLibrary resources={resources} />
        </div>
      </section>
    </>
  );
}
