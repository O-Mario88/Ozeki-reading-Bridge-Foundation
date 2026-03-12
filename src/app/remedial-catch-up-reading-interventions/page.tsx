import Image from "next/image";
import Link from "next/link";
import remedialPhoto from "../../../assets/photos/PXL_20260217_124358059.jpg";

export const metadata = {
  title: "Remedial & Catch-Up Reading Interventions",
  description:
    "Targeted recovery pathway for non-readers and below-benchmark learners using evidence-led grouping, routines, and progress tracking.",
};

export default function RemedialCatchUpReadingInterventionsPage() {
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
              Remedial &amp; Catch-Up Reading Interventions
            </h1>
            <p className="tpd-subline">
              Targeted recovery pathway for learners still below foundational reading benchmarks.
            </p>
            <h2>Overview</h2>
            <p>
              Remedial &amp; Catch-Up Reading Interventions is our targeted
              recovery pathway for schools where a significant share of learners
              are still non-readers or remain below the minimum fluency benchmark.
            </p>
            <p>
              It is designed to prevent children from being left behind as the
              curriculum advances by rebuilding foundational reading skills quickly
              and systematically, using evidence to guide exactly what is taught,
              to whom, and how progress is verified.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> rapid foundational recovery and a
              realistic pathway from non-reader status to fluent reading.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={remedialPhoto}
              alt="Small-group catch-up reading intervention session"
              priority
              sizes="(max-width: 900px) 100vw, 45vw"
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Diagnosis from Real Learner Data</h3>
            <p>
              The intervention begins with what makes our platform different:
              diagnosis from real learner data. Assessment results automatically
              identify learners who are non-readers, emergent readers, or
              struggling in specific domains such as letter-sound knowledge,
              decoding accuracy, and fluency.
            </p>
            <p>
              Rather than one-size-fits-all remediation, teachers focus on
              precise missing skills because reading failure is usually a small set
              of foundational gaps that block progress.
            </p>
          </article>

          <article className="card">
            <h3>Skill-Based Grouping, Not Class-Based Grouping</h3>
            <p>The platform supports grouping by learning need:</p>
            <ul>
              <li>Learners needing sound mastery</li>
              <li>Learners needing blending practice</li>
              <li>Learners needing decoding fluency</li>
              <li>Learners needing accuracy and pace before comprehension work</li>
            </ul>
            <p>
              This ensures each group receives the right routine at the right
              level, instead of generic remedial sessions.
            </p>
          </article>

          <article className="card">
            <h3>Practical High-Frequency Catch-Up Delivery</h3>
            <p>
              Implementation is intentionally practical and school-friendly.
              Catch-up runs through short, high-frequency small-group lessons,
              daily or several times per week, without disrupting the whole
              timetable.
            </p>
            <p>Teachers follow a clear sequence:</p>
            <ul>
              <li>Revise sounds</li>
              <li>Blend and segment</li>
              <li>Decode short words</li>
              <li>Read simple phrases and sentences</li>
              <li>Build accuracy and early fluency</li>
              <li>Introduce meaning and basic comprehension once decoding is stable</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Aligned Materials for Faster Success</h3>
            <p>
              Teachers receive intervention materials aligned to taught skills so
              practice is meaningful and success is visible early:
            </p>
            <ul>
              <li>Sound cards</li>
              <li>Blending boards</li>
              <li>Decodable word lists</li>
              <li>Short aligned reading passages</li>
            </ul>
            <p>
              This prevents mismatch between what is taught and what learners are
              asked to read.
            </p>
          </article>

          <article className="card">
            <h3>Coaching Support for Consistent Delivery</h3>
            <p>
              Ozeki coaches help schools establish grouping plans, intervention
              schedules, and delivery quality. Coaches observe sessions, provide
              feedback, model strategies for large groups and mixed abilities, and
              reinforce simple progress-monitoring habits.
            </p>
            <p>
              This transforms remediation from occasional extra help into a
              disciplined system with planned pathways and clear exit criteria.
            </p>
          </article>

          <article className="card">
            <h3>Trackable and Accountable by Design</h3>
            <p>Each intervention cycle is recorded:</p>
            <ul>
              <li>How many learners are in intervention groups</li>
              <li>Which skills are being addressed</li>
              <li>Which routines were delivered</li>
              <li>What progress checks show over time</li>
            </ul>
            <p>
              The platform monitors movement across reading levels with emphasis on
              key shifts: reducing non-readers, moving learners into minimum
              benchmark bands, and increasing fluent readers.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Transition Out of Remediation</h3>
            <p>
              The goal is rapid foundational recovery, not permanent remediation.
              As learners gain decoding ability and fluency, intervention
              transitions into broader reading practice and comprehension routines,
              and teachers move back toward whole-class instruction with lighter
              support.
            </p>
          </article>

          <article className="card">
            <h3>School-Level Next Phase Decisions</h3>
            <p>Platform evidence guides the next phase:</p>
            <ul>
              <li>Continue catch-up where non-reader rates remain high</li>
              <li>Strengthen coaching where teaching fidelity is inconsistent</li>
              <li>Move into graduation preparation where systems are stable</li>
            </ul>
            <p>
              This protects gains over time and keeps schools on a realistic
              pathway toward sustained literacy performance.
            </p>
          </article>

          <article className="card">
            <h3>Equity Result</h3>
            <p>
              Remedial and catch-up interventions become a strategic,
              evidence-led equity engine. Every child gets a realistic path to
              fluent reading and stronger success across the curriculum.
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
            <h3>Support Catch-Up Expansion</h3>
            <p>
              Partner to scale structured catch-up cycles with verified learner
              movement, accountable delivery, and targeted coaching support.
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
