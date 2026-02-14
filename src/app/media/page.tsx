import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "Media & Press",
  description: "Training highlights, event notes, and media updates.",
};

export default function MediaPage() {
  return (
    <>
      <PageHero
        kicker="Media"
        title="Media & Press"
        description="Updates from school trainings, events, implementation visits, and literacy advocacy activities."
      />

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>Training gallery</h2>
            <p>
              Add photos and short captions from teacher sessions, coaching visits, and
              classroom demonstrations.
            </p>
          </article>
          <article className="card">
            <h2>Press mentions</h2>
            <p>
              Publish links to media coverage, education forums, or conference
              participation highlights.
            </p>
          </article>
          <article className="card">
            <h2>Monthly updates</h2>
            <p>
              Share concise program updates with dates, locations, and implementation
              milestones.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
