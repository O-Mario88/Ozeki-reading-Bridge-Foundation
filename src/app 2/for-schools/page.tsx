import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "For Schools",
  description:
    "School Plus licensing: bulk enrollment, dashboards, private training sessions, and implementation reports.",
};

export default function ForSchoolsPage() {
  return (
    <>
      <PageHero
        kicker="School package"
        title="For Schools"
        description="School Plus enables leadership teams to track teacher progress and literacy implementation at scale."
      />

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>School Plus features</h2>
            <ul>
              <li>Bulk enrollment and seat licensing</li>
              <li>Teacher completion and certificate dashboard</li>
              <li>Private live trainings and coaching support</li>
              <li>Quarterly implementation review reports</li>
            </ul>
          </article>
          <article className="card">
            <h2>District/Network package</h2>
            <ul>
              <li>Multi-school consolidated reporting</li>
              <li>Outcome templates for donor accountability</li>
              <li>Coaching implementation plans across clusters</li>
              <li>Optional digital learner assessment integration</li>
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
