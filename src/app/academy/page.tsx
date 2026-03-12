import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { academyFeatures } from "@/lib/content";

export const metadata = {
  title: "Ozeki Literacy Academy",
  description:
    "Premium teacher portal with courses, certificates, live sessions, resource vault, and school dashboards.",
};

export default function AcademyPage() {
  return (
    <>
      <PageHero
        kicker="Premium platform"
        title="Ozeki Literacy Academy"
        description="A teacher and school portal for courses, coaching, certifications, and implementation reporting."
      />

      <section className="section">
        <div className="container cards-grid">
          {academyFeatures.map((feature) => (
            <article key={feature} className="card">
              <h2>{feature}</h2>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Portal modules</h2>
            <ul>
              <li>Self-paced course player with quizzes and mastery checks</li>
              <li>Live training hub with reminders and session recordings</li>
              <li>Premium resource vault with term packs and templates</li>
              <li>Coaching support workflows and lesson feedback uploads</li>
            </ul>
          </article>
          <article className="card">
            <h2>School dashboard</h2>
            <ul>
              <li>Bulk teacher enrollment and course assignment</li>
              <li>Completion and certificate tracking by staff member</li>
              <li>Report export for leadership and partner accountability</li>
              <li>Optional learner assessment and M&E integration</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container action-row">
          <Link className="button" href="/pricing">
            View membership tiers
          </Link>
          <Link className="button button-ghost" href="/for-schools">
            Explore school licensing
          </Link>
        </div>
      </section>
    </>
  );
}
