import Image from "next/image";
import Link from "next/link";
import contentAdvocacyPhoto from "../../../assets/photos/PXL_20260217_124415441.MP.jpg";

export const metadata = {
  title: "Literacy Content Creation & Advocacy",
  description:
    "Continuous practical literacy guidance that reinforces training, coaching, and assessment standards across schools and districts.",
};

export default function LiteracyContentCreationAdvocacyPage() {
  return (
    <>
      <section
        className="section tpd-hero-section bg-surface-container"
        style={{ backgroundColor: "var(--md-sys-color-surface-container)" }}
      >
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program Spotlight</p>
            <h1 className="tpd-page-title">Literacy Content Creation &amp; Advocacy</h1>
            <p className="tpd-subline">
              Continuous practical guidance for teachers and school leaders beyond trainings.
            </p>
            <h2>Overview</h2>
            <p>
              Literacy Content Creation &amp; Advocacy extends Ozeki Reading Bridge
              Foundation beyond trainings and school visits by providing
              continuous, practical guidance that teachers and school leaders can
              use every week.
            </p>
            <p>
              In many schools, improvement slows when support is not immediately
              available. This program keeps best practice accessible, simple to
              apply, and aligned to the same standards used in training, coaching,
              and assessment.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> stronger consistency across
              districts through shared access to proven routines, tools, and
              implementation examples.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={contentAdvocacyPhoto}
              alt="Teachers and facilitators engaging with literacy content and advocacy resources"
              priority
              sizes="(max-width: 900px) 100vw, 45vw"
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Implementation-Focused Resource Types</h3>
            <p>
              Ozeki produces resources designed for real classrooms and quick use:
            </p>
            <ul>
              <li>Short teacher guides and lesson tips</li>
              <li>Phonics routine scripts and remediation plans</li>
              <li>Fluency practice ideas and comprehension mini-lessons</li>
              <li>Assessment quick guides</li>
              <li>Leadership supervision checklists</li>
            </ul>
          </article>

          <article className="card">
            <h3>Built for Immediate Use</h3>
            <p>
              Content is structured to be usable in minutes: clear steps, examples,
              and common mistakes with corrections.
            </p>
            <p>
              This allows teachers to improve practice without long workshops and
              supports leaders to supervise instruction and protect reading time
              with practical tools.
            </p>
          </article>

          <article className="card">
            <h3>Leadership-Oriented Guidance</h3>
            <p>
              For Headteachers and Directors of Studies, content emphasizes:
            </p>
            <ul>
              <li>How to protect daily reading time on timetables</li>
              <li>How to supervise classroom routines effectively</li>
              <li>
                How to use learner data to decide grouping, coaching, and support
                priorities
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>From Static Library to Smart Support</h3>
            <p>
              Within the platform, resources are organized by grade, phonics set,
              topic, and program. This turns content into a practical support
              system rather than a static repository.
            </p>
          </article>

          <article className="card">
            <h3>Engagement Tracking and Usage Signals</h3>
            <p>
              The platform tracks engagement including views, downloads, and usage
              patterns so Ozeki and partners can see what schools are actually
              accessing and where support demand is highest.
            </p>
          </article>

          <article className="card">
            <h3>Targeted Content Recommendations</h3>
            <p>
              Resources can be surfaced strategically by school need:
            </p>
            <ul>
              <li>Decoding gaps: blending and error-correction resources</li>
              <li>Weak fluency: repeated-reading routines and passage packs</li>
              <li>Catch-up flags: small-group intervention guides</li>
            </ul>
            <p>
              This makes support responsive and efficient, especially in schools
              with limited connectivity or fewer coaching visits.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>National Advocacy for Evidence-Based Reading</h3>
            <p>
              As an advocacy channel, the program builds national momentum for
              evidence-based reading instruction by sharing practical guidance and
              highlighting what works based on platform evidence.
            </p>
          </article>

          <article className="card">
            <h3>System-Level Value</h3>
            <p>
              This strengthens teacher practice, informs district-level
              conversations, and increases partner confidence that literacy
              improvement is driven by a coherent and measurable approach.
            </p>
          </article>

          <article className="card">
            <h3>Program Result</h3>
            <p>
              The result is a national knowledge-sharing system that reinforces
              classroom implementation, supports sustainability, and accelerates
              literacy gains across Uganda.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid-two">
          <article className="card">
            <h3>Explore Related Evidence</h3>
            <p>
              <Link className="inline-download-link" href="/impact">
                Open Live Impact Dashboard
              </Link>
            </p>
            <p>
              <Link className="inline-download-link" href="/resources">
                Open Resources Library
              </Link>
            </p>
            <p>
              <Link className="inline-download-link" href="/blog">
                Open Literacy Blog
              </Link>
            </p>
          </article>

          <article className="card">
            <h3>Scale Practical Literacy Guidance</h3>
            <p>
              Partner with us to expand high-quality literacy content that is used,
              tracked, and linked to implementation and outcome improvement.
            </p>
            <div className="action-row">
              <Link className="button" href="/resources">
                Access Teaching Resources
              </Link>
              <Link className="button button-ghost" href="/partner-with-us">
                Partner With Us
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
