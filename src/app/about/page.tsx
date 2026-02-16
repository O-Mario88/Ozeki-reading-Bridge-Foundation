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
        description="A literacy-focused organization based in Gulu City, Northern Uganda, strengthening how reading is taught in primary schools through practical classroom support."
      />

      <section className="section">
        <div className="container about-intro-block">
          <h2>Vision and Mission</h2>
          <p>
            <strong>Vision:</strong> {vision}
          </p>
          <p>
            <strong>Mission:</strong> {mission}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container about-focus-grid">
          <article>
            <h2>Why we focus on Northern Uganda</h2>
            <p>
              Northern Uganda experienced more than two decades of conflict that
              disrupted school systems, teacher support, and early grade literacy
              development.
            </p>
            <p>
              Today, many schools are still rebuilding. We are based in Gulu so we can
              stay close to classrooms, teachers, and school leaders who need sustained
              literacy recovery support.
            </p>
          </article>
          <article>
            <h2>How we deliver change</h2>
            <ul>
              <li>Practical demonstration-based teacher training</li>
              <li>School-based coaching for implementation fidelity</li>
              <li>Learner assessments that guide instruction</li>
              <li>Data-driven program improvement and partner reporting</li>
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
