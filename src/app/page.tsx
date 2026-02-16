import Link from "next/link";
import { CtaBand } from "@/components/CtaBand";
import { MediaTestimonialGrid } from "@/components/MediaTestimonialGrid";
import { MetricStrip } from "@/components/MetricStrip";
import { officialContact } from "@/lib/contact";
import { getImpactSummary } from "@/lib/db";
import { getMediaShowcase } from "@/lib/media-showcase";
import {
  organizationName,
  tagline,
} from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const summary = getImpactSummary();
  const mediaShowcase = await getMediaShowcase();
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "NonProfit",
    name: organizationName,
    description: tagline,
    url: "https://ozekireadingbridge.org",
    areaServed: "Uganda",
    sameAs: ["https://www.linkedin.com"],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: officialContact.phone,
        email: officialContact.email,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      <section className="hero">
        <div className="container hero-layout">
          <div className="hero-copy hero-copy-with-photo">
            <p className="kicker">Northern Uganda literacy recovery</p>
            <h1>{organizationName}</h1>
            <p>{tagline}</p>
            <p>
              Based in Gulu City, we work with schools across Northern Uganda where
              more than 20 years of conflict disrupted foundational learning and left
              many children behind in reading.
            </p>
            <div className="action-row">
              <Link className="button" href="/book-visit">
                Book a school visit
              </Link>
            </div>
          </div>

          <div className="hero-panel hero-panel-stretch">
            <article className="hero-vision-card hero-vision-card-horizontal">
              <section className="hero-vision-block">
                <h2>Vision</h2>
                <p>
                  We empower teachers to build confident readers-and strengthen
                  Uganda&apos;s future through literacy.
                </p>
              </section>

              <section className="hero-vision-block">
                <h3>Why We Work in Uganda (with Northern Uganda as a case example)</h3>
                <p>
                  Across Uganda, too many children move through school without mastering
                  the most important gateway skill: reading. When reading is weak,
                  learning slows in every subject-and the cost is lifelong.
                </p>
                <p>
                  We serve schools across Uganda, and we place special focus on
                  communities where learning foundations were most disrupted. Northern
                  Uganda is a clear case example. Decades of conflict strained school
                  systems, disrupted early learning, and left many classrooms still
                  rebuilding: limited materials, large classes, teacher shortages, and
                  cohorts of learners who missed early reading skills.
                </p>
                <p>
                  Our response is simple and evidence-based: rebuild reading from the
                  ground up by strengthening teachers. Because when a teacher learns
                  structured phonics-and receives coaching to implement it-hundreds of
                  children benefit, year after year.
                </p>
                <p className="cta-line">
                  Support literacy where it matters most-and see the evidence in real
                  classrooms.
                </p>
              </section>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container story-focus-grid">
          <article>
            <h2>The literacy story we are changing</h2>
            <p>
              Many learners in Northern Uganda are still rebuilding foundational
              reading skills. Ozeki Reading Bridge Foundation exists to help schools
              move from low reading confidence to structured, daily literacy success.
            </p>
            <p>
              We focus on practical classroom change: stronger teacher routines,
              school coaching, learner assessments, and sustained support for school
              leaders.
            </p>
          </article>

          <article>
            <h2>How we work</h2>
            <ul>
              <li>Train teachers using structured phonics and reading routines</li>
              <li>Coach in real classrooms until routines are consistent</li>
              <li>Assess learners and track progress term by term</li>
              <li>Support school leaders to supervise literacy implementation</li>
            </ul>
            <div className="action-row">
              <Link className="button" href="/programs">
                See our program model
              </Link>
            </div>
          </article>
        </div>
      </section>

      <CtaBand
        title="Stand with Northern Uganda schools"
        body="Partner with Ozeki Reading Bridge Foundation to train teachers, strengthen school routines, and help learners rebuild reading confidence."
        primaryHref="/partner"
        primaryLabel="Partner with us"
      />

      <MetricStrip metrics={summary.metrics} />

      <section className="section home-evidence-section">
        <div className="container">
          <div className="section-head">
            <h2>Testimonial Evidence from the Field</h2>
            <p>
              Photo and video stories from real training and coaching sessions in
              Northern Uganda, showing implementation quality in action.
            </p>
          </div>
          <MediaTestimonialGrid items={mediaShowcase.featuredItems.slice(0, 3)} />
          <div className="action-row">
            <Link className="button" href="/testimonials">
              View all testimonials
            </Link>
            <Link className="button button-ghost" href="/media">
              Open photo and video gallery
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
