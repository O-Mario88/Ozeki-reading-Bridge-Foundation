import { PageHero } from "@/components/PageHero";
import { mission, organizationName, vision } from "@/lib/content";

export const metadata = {
  title: "About",
  description:
    "Learn about Ozeki Reading Bridge Foundation's vision, mission, and practical literacy implementation model.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        kicker="Who we are"
        title={organizationName}
        description="A literacy-focused organization strengthening how reading is taught in primary schools through evidence-based classroom practice."
      />

      <section className="section">
        <div className="container two-col">
          <article className="card">
            <h2>Vision</h2>
            <p>{vision}</p>
          </article>
          <article className="card">
            <h2>Mission</h2>
            <p>{mission}</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Approach</h2>
            <ul>
              <li>Practical demonstration-based teacher training</li>
              <li>School-based coaching for implementation fidelity</li>
              <li>Learner assessments that guide instruction</li>
              <li>Data-driven program improvement and partner reporting</li>
            </ul>
          </article>
          <article className="card">
            <h2>Credibility pillars</h2>
            <ul>
              <li>Evidence-based methods aligned to how children learn to read</li>
              <li>Classroom-tested tools and routines for teachers</li>
              <li>Leadership support for school-wide accountability</li>
              <li>Transparent monitoring, evaluation, and reporting</li>
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
