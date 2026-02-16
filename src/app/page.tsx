import Link from "next/link";
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

      <section className="hero section">
        <div className="container">
          <div className="hero-copy hero-copy-with-photo flow">
            <p className="kicker">Northern Uganda literacy recovery</p>
            <h1>{organizationName}</h1>
            <p>{tagline}</p>
            <p>
              Based in Gulu City, we work with schools across Northern Uganda where
              more than 20 years of conflict disrupted foundational learning and left
              many children behind in reading.
            </p>
          </div>

          <div className="home-mission-content">
            <p className="lead">
              Across Uganda, too many children move through school without mastering
              the gateway skill of reading. Many learners can recite words or copy
              from the board, but struggle to decode unfamiliar text, read with
              fluency, or understand what they read.
            </p>
            <p>
              When that foundation is weak, learning slows everywhere—because every
              subject depends on reading: instructions in mathematics, word problems,
              science explanations, social studies, even exams. A child who cannot
              read confidently is not just behind in English; they are behind in the
              entire curriculum, and their confidence often collapses along the way.
            </p>
            <p>
              That is why we focus on foundational literacy—not as one subject among
              many, but as the engine that powers all learning.
            </p>
            <p>
              We work nationally across Uganda, partnering with schools to strengthen
              early grade reading instruction in a practical, classroom-focused way.
              At the same time, we maintain a special focus on Northern Uganda
              because it illustrates the urgency of learning recovery. Decades of
              conflict disrupted schooling systems, weakened instructional
              continuity, and left many communities rebuilding with limited teaching
              and learning materials, overcrowded classrooms, and teacher shortages.
              Even after stability returns, the “learning gap” remains—cohorts of
              children may progress through grades without fully mastering letter
              sounds, blending, decoding, fluency, and comprehension. Without
              deliberate intervention, these gaps can persist for years and become a
              pattern that repeats across generations.
            </p>
            <p>
              Our response is evidence-based and implementation-driven: we strengthen
              teachers and school leaders so reading improves in real
              classrooms—term by term.
            </p>
            <h3>We do this through a structured model that includes:</h3>
            <ul>
              <li>
                <strong>Teacher training in structured phonics and effective reading routines</strong>
                —practical, demonstration-based sessions that equip teachers to teach
                sounds accurately, guide blending and decoding, build fluency, and
                support comprehension.
              </li>
              <li>
                <strong>School-based coaching and classroom support</strong>
                —observation, feedback, model lessons, and coaching cycles that turn
                training into consistent daily practice, not a one-time workshop.
              </li>
              <li>
                <strong>Learner reading assessments and progress tracking</strong>
                —simple tools that show what learners can do (and what they need next),
                enabling targeted instruction, catch-up support for struggling readers,
                and clear measurement of improvement over time.
              </li>
              <li>
                <strong>Materials and instructional resources aligned to what is taught</strong>
                —decodable texts, practice passages, and teaching aids that increase
                successful reading practice and strengthen consistency across
                classrooms.
              </li>
              <li>
                <strong>Leadership support for sustainability</strong>
                —helping headteachers and Directors of Studies protect reading time,
                supervise instruction effectively, and use data to guide improvement.
              </li>
            </ul>
            <p>
              The result is not just “activity.” It is visible change: teachers
              deliver clearer, more consistent reading lessons; struggling learners
              receive targeted support; and schools begin to build routines that
              sustain progress beyond a single training cycle. Over time, children
              rebuild reading confidence, improve fluency and comprehension, and
              engage more fully in every subject—because once the gateway skill is
              unlocked, learning accelerates.
            </p>
            <p>
              This is why partners support Ozeki Reading Bridge Foundation: we
              combine practical training with coaching and evidence, so results are
              measurable and improvement is sustained.
            </p>
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
