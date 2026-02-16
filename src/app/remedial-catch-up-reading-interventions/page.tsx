import Image from "next/image";
import Link from "next/link";
import remedialPhoto from "../../../assets/photos/PXL_20250531_090804621.jpg";

export const metadata = {
  title: "Remedial & Catch-Up Reading Interventions",
  description:
    "Structured small-group interventions that move non-readers to foundational reading quickly and consistently.",
};

export default function RemedialCatchUpReadingInterventionsPage() {
  return (
    <>
      <section className="section tpd-hero-section">
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program spotlight</p>
            <h1 className="tpd-page-title">
              Remedial &amp; Catch-Up Reading Interventions
            </h1>
            <p className="tpd-subline">
              Small-group support that turns non-readers into readers, fast,
              safely, and consistently.
            </p>
            <h2>Overview</h2>
            <p>
              Many learners fall behind not because they can&apos;t learn, but
              because they missed one or two foundational skills, especially
              letter sounds and blending.
            </p>
            <p>
              Our Remedial &amp; Catch-Up Reading Interventions are structured
              small-group sessions designed for non-readers and struggling
              readers, helping them build the missing foundations quickly and
              rejoin grade-level learning.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> At-risk learners gain foundational
              reading skills faster.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={remedialPhoto}
              alt="Small-group catch-up reading intervention session"
              priority
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How We Do It (Our Catch-Up Model)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>1) Skill-Gap Diagnosis (We find the exact broken link)</h3>
              <p>
                Before intervention starts, we diagnose each learner&apos;s
                specific reading gap. We do not guess.
              </p>
              <p>We identify:</p>
              <ul>
                <li>Learners who lack letter-sound mastery</li>
                <li>Learners who know sounds but cannot blend</li>
                <li>Learners who decode slowly or inaccurately</li>
                <li>Learners who read words but struggle with simple comprehension</li>
              </ul>
              <p>
                This diagnosis guides grouping and lesson targets, so time is not
                wasted.
              </p>
            </article>

            <article className="card">
              <h3>2) Smart Grouping (Right learner, right group, right level)</h3>
              <p>
                We group learners by skill level rather than by age or grade, so
                instruction matches need.
              </p>
              <p>Typical group types:</p>
              <ul>
                <li>Group A: Non-readers (sound gaps)</li>
                <li>Group B: Emerging readers (blending and decoding gaps)</li>
                <li>Group C: Developing readers (fluency building)</li>
                <li>
                  Group D: Fluent but weak comprehension (grade-appropriate
                  meaning work)
                </li>
              </ul>
              <p>
                Groups stay small to ensure high participation, frequent feedback,
                and rapid correction.
              </p>
            </article>

            <article className="card">
              <h3>3) Targeted Decoding &amp; Blending Lessons</h3>
              <p>
                Each remedial session follows a consistent routine teachers can
                sustain.
              </p>
              <p>Session structure (example):</p>
              <ul>
                <li>Quick review (sounds or high-frequency patterns)</li>
                <li>Teach or re-teach one target skill step</li>
                <li>Guided practice with immediate correction</li>
                <li>Independent practice at learner level</li>
                <li>Quick check to confirm same-day mastery</li>
              </ul>
              <p>Key features:</p>
              <ul>
                <li>Fast pace with many repetitions</li>
                <li>Immediate and supportive correction</li>
                <li>Practice texts matched to taught skills</li>
              </ul>
            </article>

            <article className="card">
              <h3>4) Structured Fluency Building (From decoding to smooth reading)</h3>
              <p>
                Once learners can decode, we build fluency deliberately because
                fluency unlocks comprehension.
              </p>
              <p>Fluency routines we use:</p>
              <ul>
                <li>Repeated reading</li>
                <li>Echo reading</li>
                <li>Phrase reading</li>
                <li>Timed reads (simple, motivating, and not stressful)</li>
              </ul>
              <p>
                Fluency practice is always paired with accuracy checks so learners
                do not build fast guessing habits.
              </p>
            </article>

            <article className="card">
              <h3>5) Progress Monitoring (We track growth and adjust quickly)</h3>
              <p>
                Every intervention includes a simple way to measure improvement
                and guide next steps.
              </p>
              <p>We monitor:</p>
              <ul>
                <li>Sound mastery (accuracy and speed)</li>
                <li>Decoding accuracy</li>
                <li>Fluency gains (accuracy and rate)</li>
                <li>Movement between groups (evidence-based promotion)</li>
              </ul>
              <p>
                Teachers can see who is improving, who is stuck, and which
                routine needs adjustment.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Focus Areas (What the Intervention Targets)</h3>
            <ul>
              <li>
                Skill-gap diagnosis (sounds, blending, decoding, fluency, and
                comprehension basics)
              </li>
              <li>
                Targeted decoding and blending lessons with a structured routine
              </li>
              <li>Structured fluency building (accuracy to speed to expression)</li>
              <li>Continuous progress checks and regrouping when needed</li>
            </ul>
          </article>

          <article className="card">
            <h3>Outputs (What Schools Receive)</h3>
            <ul>
              <li>Intervention plans (by level, by group, by week)</li>
              <li>Grouping strategies (how to form groups and move learners)</li>
              <li>Progress monitoring tools (simple checklists and trackers)</li>
              <li>
                Optional lesson routine cards, word lists, and decodable practice
                texts aligned to intervention targets
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Outcome</h3>
            <p>
              At-risk learners gain foundational reading skills faster because
              intervention is based on diagnosis, delivered through structured
              small-group routines, and guided by continuous progress tracking.
            </p>
            <div className="action-row">
              <Link className="button" href="/portal/schools">
                Open school profiles
              </Link>
              <Link className="button button-ghost" href="/partner">
                Partner with us
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
