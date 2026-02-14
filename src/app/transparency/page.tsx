import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "Transparency",
  description:
    "Program methodology, safeguarding statement, and monitoring/evaluation commitments.",
};

export default function TransparencyPage() {
  return (
    <>
      <PageHero
        kicker="Transparency"
        title="How we work"
        description="A clear statement of our implementation approach, safeguarding commitments, and evidence standards."
      />

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>Program approach</h2>
            <ul>
              <li>Evidence-based reading instruction design</li>
              <li>Structured teacher support and mentoring</li>
              <li>School-level systems for sustained implementation</li>
            </ul>
          </article>
          <article className="card">
            <h2>Monitoring and evaluation</h2>
            <ul>
              <li>Baseline, progress, and endline data cycles</li>
              <li>Routine quality checks and reflective learning reviews</li>
              <li>Partner reporting with actionable recommendations</li>
            </ul>
          </article>
          <article className="card">
            <h2>Safeguarding statement</h2>
            <p>
              We commit to child protection, ethical data handling, and professional
              conduct in all school and community engagements.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
