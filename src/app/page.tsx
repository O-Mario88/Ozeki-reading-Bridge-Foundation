import Link from "next/link";
import { CtaBand } from "@/components/CtaBand";
import { MetricStrip } from "@/components/MetricStrip";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import {
  impactMetrics,
  mission,
  organizationName,
  programs,
  signatureProgram,
  tagline,
  vision,
} from "@/lib/content";

export default function HomePage() {
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
        telephone: "+256700000000",
        email: "info@ozekireadingbridge.org",
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
          <div className="hero-copy">
            <p className="kicker">Literacy implementation partner for schools</p>
            <h1>{organizationName}</h1>
            <p>{tagline}</p>
            <p>{mission}</p>
            <div className="action-row">
              <Link className="button" href="/book-visit">
                Book a school visit
              </Link>
              <Link className="button button-ghost" href="/resources">
                Download phonics toolkit
              </Link>
            </div>
          </div>

          <div className="hero-panel">
            <article>
              <h2>Vision</h2>
              <p>{vision}</p>
            </article>
            <article>
              <h2>Signature Program</h2>
              <p>{signatureProgram.title}</p>
              <p>{signatureProgram.summary}</p>
              <Link className="button button-ghost" href="/phonics-training">
                Explore program
              </Link>
            </article>
          </div>
        </div>
      </section>

      <MetricStrip metrics={impactMetrics} />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="kicker">Programs and services</p>
            <h2>Practical implementation across training, coaching, and assessment</h2>
            <p>
              We work with nursery and primary schools, literacy champions, and school
              leaders to improve reading instruction quality and learner outcomes.
            </p>
          </div>
          <div className="cards-grid">
            {programs.slice(0, 6).map((program) => (
              <article className="card" key={program.id}>
                <h3>{program.title}</h3>
                <p>{program.summary}</p>
                <p className="meta-line">
                  <strong>Outcome:</strong> {program.outcome}
                </p>
              </article>
            ))}
          </div>
          <div className="action-row">
            <Link className="button" href="/programs">
              View all programs
            </Link>
            <Link className="button button-ghost" href="/impact">
              See impact evidence
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>What schools can book now</h2>
            <ul>
              <li>School diagnostic visit and literacy baseline</li>
              <li>Teacher phonics training sessions</li>
              <li>Coaching and mentorship follow-up</li>
              <li>Learner reading assessments and reporting</li>
              <li>1001 Story program onboarding</li>
            </ul>
            <div className="action-row">
              <Link className="button" href="/book-visit">
                Book appointment
              </Link>
            </div>
          </article>

          <article className="card">
            <h2>What partners can fund</h2>
            <ul>
              <li>Teacher training and coaching cycles</li>
              <li>Assessment systems and progress tracking</li>
              <li>Decodable materials and teaching aids</li>
              <li>1001 Story anthology production</li>
              <li>District-level implementation support</li>
            </ul>
            <div className="action-row">
              <Link className="button button-ghost" href="/partner-with-us">
                Partner with us
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Resource of the month</h2>
            <p className="meta-pill">Phonics Starter Kit</p>
            <p>
              A classroom-ready set of routines for explicit sound teaching, blending,
              dictation, and quick fluency checks.
            </p>
            <div className="action-row">
              <Link className="button" href="/resources">
                Access resource library
              </Link>
              <Link className="button button-ghost" href="/diagnostic-quiz">
                Take free diagnostic quiz
              </Link>
            </div>
          </article>

          <article className="card">
            <h2>Weekly Reading Teaching Tip</h2>
            <p>
              Join our newsletter for practical classroom strategies and upcoming webinar
              reminders.
            </p>
            <NewsletterSignup />
            <div className="action-row">
              <Link className="button button-ghost" href="/events">
                View monthly events
              </Link>
            </div>
          </article>
        </div>
      </section>

      <CtaBand
        title="Need an implementation plan for your school network?"
        body="Share your context and we will propose a phased package: training, coaching, assessments, and reporting."
        primaryHref="/contact"
        primaryLabel="Talk to the team"
        secondaryHref="/academy"
        secondaryLabel="Explore Ozeki Literacy Academy"
      />
    </>
  );
}
