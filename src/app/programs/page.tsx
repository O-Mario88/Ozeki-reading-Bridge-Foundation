import { CtaBand } from "@/components/CtaBand";
import { PageHero } from "@/components/PageHero";
import { ProgramCard } from "@/components/ProgramCard";
import { programs } from "@/lib/content";

export const metadata = {
  title: "Programs & Services",
  description:
    "Detailed literacy programs including teacher training, coaching, assessments, materials development, and school systems support.",
};

export default function ProgramsPage() {
  return (
    <>
      <PageHero
        kicker="SEO pillar page"
        title="Programs & Services"
        description="Our full implementation support stack for nursery and primary literacy improvement."
      />

      <section className="section">
        <div className="container program-grid">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      </section>

      <CtaBand
        title="Need a customized school or district package?"
        body="We can combine training, coaching, learner assessment, and reporting into a phased implementation plan."
        primaryHref="/book-visit"
        primaryLabel="Book a diagnostic visit"
        secondaryHref="/partner-with-us"
        secondaryLabel="Discuss partnership"
      />
    </>
  );
}
