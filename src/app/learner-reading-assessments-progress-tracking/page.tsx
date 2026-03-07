import Image from "next/image";
import Link from "next/link";
import assessmentPhoto from "../../../assets/photos/PXL_20260218_133343618.jpg";

export const metadata = {
  title: "Learner Assessments & Progress Tracking",
  description:
    "Measurement backbone for baseline-progress-endline literacy tracking, reading level bands, and targeted instructional decisions.",
};

export default function LearnerReadingAssessmentsProgressTrackingPage() {
  return (
    <>
      <section
        className="section tpd-hero-section bg-surface-container"
        style={{ backgroundColor: "var(--md-sys-color-surface-container)" }}
      >
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program Spotlight</p>
            <h1 className="tpd-page-title">
              Learner Assessments &amp; Progress Tracking
            </h1>
            <p className="tpd-subline">
              Measurement backbone for reliable reading evidence and practical next actions.
            </p>
            <h2>Overview</h2>
            <p>
              Learner Assessments &amp; Progress Tracking is our measurement
              backbone, designed to give schools, districts, and partners simple,
              reliable evidence of whether children are actually learning to read
              and what to do next.
            </p>
            <p>
              In literacy improvement, good intentions are not enough. The system
              must answer at any point: How many learners can decode? How many are
              fluent? Who is stuck? What is improving? What requires urgent
              catch-up? The platform turns these questions into consistent data
              that informs instruction and proves progress over time.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> schools and partners make faster,
              evidence-based literacy decisions with transparent progress tracking.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={assessmentPhoto}
              alt="Learner reading assessment and classroom review session"
              priority
              sizes="(max-width: 900px) 100vw, 45vw"
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Assessment Cycles: Baseline -&gt; Progress -&gt; Endline</h3>
            <p>
              Ozeki supports schools to run baseline, progress, and endline cycles
              using outcome areas aligned with EGRA-style reporting and classroom
              practice.
            </p>
            <ul>
              <li>Letter-sound knowledge (early grades)</li>
              <li>Decoding accuracy</li>
              <li>Oral reading fluency (CWPM) with accuracy</li>
              <li>Reading comprehension</li>
            </ul>
            <p>
              Assessments are practical enough for real school conditions while
              structured enough to generate credible, comparable results.
            </p>
          </article>

          <article className="card">
            <h3>Automatic Reading Levels and Standardized Bands</h3>
            <p>
              Each learner&apos;s scores are entered once. The platform then
              automatically calculates reading level bands (for example,
              non-reader to fluent) using standardized CWPM and related
              thresholds.
            </p>
            <p>
              This removes guesswork, reduces manual errors, and ensures schools
              and districts are compared using the same definitions.
            </p>
          </article>

          <article className="card">
            <h3>School-Level Profiles for Immediate Action</h3>
            <p>
              Once entered, data becomes immediately actionable for teachers and
              school leaders:
            </p>
            <ul>
              <li>Proportion of non-readers, emergent, minimum benchmark, and fluent readers</li>
              <li>Domain-by-domain strengths and gaps</li>
              <li>Comprehension proficiency by class and grade</li>
            </ul>
            <p>
              This is not data for reporting only. It directly informs what to
              reteach, who needs catch-up, and how to target lesson routines.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Progress Tracking by Term and Cycle</h3>
            <p>
              Over time, schools can see whether interventions are working:
            </p>
            <ul>
              <li>Are non-readers reducing?</li>
              <li>Are more learners reaching minimum benchmark?</li>
              <li>Is comprehension improving alongside fluency?</li>
            </ul>
            <p>
              The platform shows movement term by term, making school-level
              planning and accountability clearer.
            </p>
          </article>

          <article className="card">
            <h3>District and Regional Evidence Dashboards</h3>
            <p>
              At district and regional levels, school data aggregates into
              dashboards that support planning and resource targeting.
            </p>
            <p>Partners can view coverage alongside outcomes:</p>
            <ul>
              <li>Schools assessed and sample sizes</li>
              <li>Assessment completeness</li>
              <li>Reading level distributions and domain outcomes</li>
              <li>Movement from baseline to endline</li>
            </ul>
          </article>

          <article className="card">
            <h3>Data Quality Signals for Decision Confidence</h3>
            <p>
              The platform includes confidence markers so decision-makers can trust
              what they see and understand limits.
            </p>
            <ul>
              <li>Sample size</li>
              <li>Tool version</li>
              <li>Completeness indicators</li>
            </ul>
            <p>
              This strengthens credibility and keeps planning grounded in reliable
              evidence, not anecdote.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Integrated with Training, Coaching, and Follow-Up</h3>
            <p>
              The platform advantage is integration. Assessment data is not
              isolated; it is linked to teacher training attendance, coaching
              visits, lesson evaluation scores, and follow-up plans.
            </p>
            <p>
              This connects classroom practice to learner outcomes and highlights
              implementation gaps quickly.
            </p>
          </article>

          <article className="card">
            <h3>Recommendation Logic and Early Warning</h3>
            <p>
              If teaching quality improves but learner decoding does not, the
              platform flags likely implementation gaps and recommends targeted
              coaching or catch-up interventions.
            </p>
            <p>
              If a school shows strong reading movement and consistent routines,
              recommendations shift to sustaining systems and progressing toward
              graduation readiness.
            </p>
          </article>

          <article className="card">
            <h3>National Evidence System Result</h3>
            <p>
              This turns assessment into a national evidence system that guides
              decisions, triggers early warning flags, monitors improvement across
              cycles, and provides transparent proof of progress to schools,
              government stakeholders, and funders.
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
          </article>

          <article className="card">
            <h3>Launch an Assessment Cycle</h3>
            <p>
              Start a baseline-progress-endline cycle and convert results into
              targeted teaching, catch-up plans, and partner-ready reporting.
            </p>
            <div className="action-row">
              <Link className="button" href="/portal/schools">
                Open school profiles
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
