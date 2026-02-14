import { PageHero } from "@/components/PageHero";
import { caseStudies } from "@/lib/content";

export const metadata = {
  title: "Case Studies",
  description: "District and school implementation snapshots with problem-action-result format.",
};

export default function CaseStudiesPage() {
  return (
    <>
      <PageHero
        kicker="Case studies"
        title="School and district implementation stories"
        description="Problem -> intervention -> measurable results and stakeholder feedback."
      />
      <section className="section">
        <div className="container cards-grid">
          {caseStudies.map((study) => (
            <article key={study.slug} className="card">
              <h2>
                {study.school} ({study.district})
              </h2>
              <p>
                <strong>Problem:</strong> {study.challenge}
              </p>
              <h3>What we did</h3>
              <ul>
                {study.intervention.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3>Results</h3>
              <ul>
                {study.results.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="note-box">"{study.testimonial}"</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
