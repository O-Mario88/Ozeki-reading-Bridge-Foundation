import Image from "next/image";
import Link from "next/link";
import coachingPhoto from "../../../assets/photos/PXL_20260217_110739688.jpg";

export const metadata = {
  title: "In-School Coaching & Mentorship",
  description:
    "Classroom implementation engine that converts training into consistent routines and measurable learner reading improvement.",
};

export default function InSchoolCoachingMentorshipPage() {
  return (
    <>
      <section
        className="section tpd-hero-section bg-surface-container"
        style={{ backgroundColor: "var(--md-sys-color-surface-container)" }}
      >
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program Spotlight</p>
            <h1 className="tpd-page-title">In-School Coaching &amp; Mentorship</h1>
            <p className="tpd-subline">
              Classroom implementation engine for daily routines and sustained reading gains.
            </p>
            <h2>Overview</h2>
            <p>
              In-School Coaching &amp; Mentorship is our classroom implementation
              engine, designed to make sure training translates into daily
              instruction, consistent routines, and sustained learner improvement.
            </p>
            <p>
              In many education programs, training ends at the workshop; in the
              platform, training is only the beginning. Coaching is where teachers
              shift from knowing phonics to delivering phonics accurately,
              confidently, and consistently, so learners experience real change in
              reading ability.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> measurable instructional change
              that links classroom practice to learner outcomes.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={coachingPhoto}
              alt="In-school reading lesson coaching session"
              priority
              sizes="(max-width: 900px) 100vw, 45vw"
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Classroom Observation Focus</h3>
            <p>
              Ozeki coaches work directly inside classrooms and observe real
              reading lessons using a standard lesson evaluation tool. The tool
              focuses on practices that matter most:
            </p>
            <ul>
              <li>Quick revision of previously taught sounds</li>
              <li>Clear modeling of new sounds and letter formation</li>
              <li>Explicit blending and segmenting routines</li>
              <li>Structured decoding practice</li>
              <li>High time-on-task</li>
              <li>Effective error correction</li>
            </ul>
          </article>

          <article className="card">
            <h3>Coaching, Not Inspection</h3>
            <p>
              Observation is never inspection. It is a coaching moment.
              Coaches provide immediate and specific feedback that identifies:
            </p>
            <ul>
              <li>What the teacher did well</li>
              <li>What is limiting learner success</li>
              <li>What to improve in the next lesson</li>
            </ul>
            <p>
              Where needed, coaches demonstrate routines through model lessons,
              co-teaching, and guided rehearsal so teachers can see exactly how to
              run routines with the whole class and with struggling learners.
            </p>
          </article>

          <article className="card">
            <h3>Structured Coaching Cycle</h3>
            <p>Mentorship is delivered through repeatable coaching cycles:</p>
            <p className="meta-line">
              <strong>
                observe -&gt; coach -&gt; model/practise -&gt; agree next actions
                -&gt; follow-up
              </strong>
            </p>
            <p>This makes improvement predictable and measurable across visits.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Daily Routines Teachers Build Through Coaching</h3>
            <ul>
              <li>Accurate sound teaching</li>
              <li>Fast-paced choral response</li>
              <li>Blending practice that prevents guessing</li>
              <li>Segmenting practice that strengthens spelling</li>
              <li>Fluency routines that build automaticity</li>
              <li>Quick checks to identify catch-up needs</li>
            </ul>
            <p>
              Because classroom realities vary, coaching includes strategies for
              large classes, mixed-ability groups, and limited materials so
              routines remain workable in real conditions.
            </p>
          </article>

          <article className="card">
            <h3>Evidence and Accountability from Every Visit</h3>
            <p>Each coaching visit generates structured data:</p>
            <ul>
              <li>Teaching quality scores by domain</li>
              <li>Item-level strengths and gaps</li>
              <li>Prioritized action plan</li>
            </ul>
            <p>
              Teacher improvement is tracked from first visit through follow-up
              visits, enabling targeted support instead of generic support.
            </p>
          </article>

          <article className="card">
            <h3>Linked to Learner Outcomes</h3>
            <p>
              Coaching results connect directly to learner assessment data, so
              schools and partners can verify whether improved instruction is
              producing intended outcomes:
            </p>
            <ul>
              <li>Fewer non-readers</li>
              <li>More learners at minimum fluency benchmarks</li>
              <li>Stronger decoding accuracy</li>
              <li>Improved comprehension</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Leadership and School System Strengthening</h3>
            <p>
              Where leadership support is included, Headteachers and Directors of
              Studies are guided to supervise instruction, protect reading time on
              the timetable, and use simple data dashboards for decisions.
            </p>
            <p>
              This ensures progress does not depend on external coaches only, but
              becomes school-owned practice.
            </p>
          </article>

          <article className="card">
            <h3>Pathway to Graduation Readiness</h3>
            <p>
              Over time, schools move from intensive coaching to lighter follow-up
              and, when performance thresholds are met, toward graduation
              readiness.
            </p>
            <p>
              The result is not visits for reporting purposes; it is measurable
              instructional change sustained in school routines.
            </p>
          </article>

          <article className="card">
            <h3>Program Result</h3>
            <p>
              Teachers deliver clearer and more consistent reading lessons.
              Learners practise more, decode more accurately, and progress through
              reading levels. Leaders gain tools to sustain routines. Partners
              receive credible evidence linking classroom practice to learner
              outcomes until schools maintain strong reading instruction
              independently.
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
            <h3>Partner for Coaching Scale</h3>
            <p>
              Support coaching cycles that are tracked, verified, and directly
              linked to learner reading gains.
            </p>
            <div className="action-row">
              <Link className="button" href="/partner-with-us">
                Partner With Us
              </Link>
              <Link className="button button-ghost" href="/portal/schools">
                Open school profiles
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
