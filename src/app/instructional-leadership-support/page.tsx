import Image from "next/image";
import Link from "next/link";
import leadershipPhoto from "../../../assets/photos/PXL_20260217_124357146.jpg";

export const metadata = {
  title: "Instructional Leadership Support (Headteachers & Directors of Studies)",
  description:
    "Leadership support that protects reading time, strengthens supervision, and sustains quality instruction beyond one-off trainings.",
};

export default function InstructionalLeadershipSupportPage() {
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
              Instructional Leadership Support (Headteachers &amp; DOS)
            </h1>
            <p className="tpd-subline">
              Leadership systems that protect reading time and sustain instructional quality.
            </p>
            <h2>Overview</h2>
            <p>
              Instructional Leadership Support strengthens school leadership to
              protect reading time and sustain quality instruction beyond one-off
              trainings. Even strong teacher training can fade without consistent
              supervision and school-level routines.
            </p>
            <p>
              This program ensures literacy improvement becomes part of how a
              school is led, monitored, and improved, term by term.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> school leaders sustain literacy
              gains through practical supervision, evidence-led decisions, and
              daily implementation routines.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={leadershipPhoto}
              alt="Headteachers and Directors of Studies in instructional leadership coaching"
              priority
              sizes="(max-width: 900px) 100vw, 45vw"
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Practical Supervision Tools for Daily Leadership Work</h3>
            <p>
              We equip Headteachers and Directors of Studies with simple
              supervision tools that fit into their normal schedules:
            </p>
            <ul>
              <li>Observation checklists aligned to structured phonics lessons</li>
              <li>Short templates for supportive, specific teacher feedback</li>
              <li>Coaching conversation guides for lesson follow-up</li>
            </ul>
            <p>
              These tools make supervision manageable and consistent across terms.
            </p>
          </article>

          <article className="card">
            <h3>What Leaders Are Trained to Observe</h3>
            <p>During reading lessons, leaders are guided to track core routines:</p>
            <ul>
              <li>Sound revision and new sound modeling quality</li>
              <li>Explicit blending and segmenting routines</li>
              <li>Decoding practice and correction routines</li>
              <li>Fluency practice and quick checks</li>
              <li>Learner practice time and lesson pace</li>
            </ul>
          </article>

          <article className="card">
            <h3>Coaching Conversations That Drive Action</h3>
            <p>
              Leaders move beyond general comments like teach well to actionable
              guidance linked to learner outcomes:
            </p>
            <ul>
              <li>Increase learner practice time</li>
              <li>Correct blending errors immediately</li>
              <li>Align words to taught sounds</li>
            </ul>
            <p>
              This keeps post-observation feedback practical, supportive, and
              immediately usable in the next lesson.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Evidence-Led Leadership Decisions</h3>
            <p>
              Leaders are trained to use learner assessment and reading-level data
              for practical school decisions:
            </p>
            <ul>
              <li>Which classes need catch-up groups</li>
              <li>Which teachers need coaching versus refresher training</li>
              <li>How timetables should protect daily reading routines</li>
              <li>How to monitor whether changes are working</li>
            </ul>
          </article>

          <article className="card">
            <h3>Lightweight Accountability Systems</h3>
            <p>
              Leaders learn to run manageable school systems that sustain gains
              even when external coaches are not present:
            </p>
            <ul>
              <li>Weekly reading routine checks</li>
              <li>Simple implementation trackers</li>
              <li>Follow-up plans with clear responsibilities</li>
            </ul>
            <p>
              These structures embed literacy as a school-owned priority.
            </p>
          </article>

          <article className="card">
            <h3>Measured Leadership Actions in the Platform</h3>
            <p>Leadership actions are recorded and tracked, including:</p>
            <ul>
              <li>Supervision visits completed</li>
              <li>Lesson observations logged</li>
              <li>Follow-up meetings held</li>
              <li>Routine implementation progress</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Accountability Chain: Leadership to Learner Outcomes</h3>
            <p>
              Leadership actions are linked to teaching quality scores and learner
              outcomes, creating a clear chain:
            </p>
            <p className="meta-line">
              <strong>
                leadership supervision strengthens classroom practice -&gt; improved
                practice drives better reading levels and comprehension
              </strong>
            </p>
          </article>

          <article className="card">
            <h3>Value for Schools</h3>
            <p>
              Improvement becomes manageable. Leaders can see what is working,
              where support is needed, and how to keep literacy implementation
              strong across terms.
            </p>
          </article>

          <article className="card">
            <h3>Value for Partners</h3>
            <p>
              Partners receive credible evidence that literacy improvement does not
              depend on one training event, but is sustained through school-owned
              systems and leadership commitment.
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
            <h3>Support Leadership Strengthening</h3>
            <p>
              Partner to scale Headteacher and DOS instructional leadership systems
              that keep reading gains protected and sustained.
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
