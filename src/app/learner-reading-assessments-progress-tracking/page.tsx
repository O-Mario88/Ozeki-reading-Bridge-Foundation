import Image from "next/image";
import Link from "next/link";
import assessmentPhoto from "../../../assets/photos/PXL_20260218_133343618.jpg";

export const metadata = {
  title: "Learner Reading Assessments & Progress Tracking",
  description:
    "Simple and reliable learner reading assessment tools that convert data into targeted instruction decisions.",
};

export default function LearnerReadingAssessmentsProgressTrackingPage() {
  return (
    <>
      <section className="section tpd-hero-section bg-surface-container" style={{ backgroundColor: 'var(--md-sys-color-surface-container)' }}>
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program spotlight</p>
            <h1 className="tpd-page-title">
              Learner Reading Assessments &amp; Progress Tracking
            </h1>
            <p className="tpd-subline">
              Simple, reliable tools that turn learner performance into targeted
              instruction.
            </p>
            <h2>Overview</h2>
            <p>
              You can&apos;t improve reading if you don&apos;t measure it. Our
              Learner Reading Assessments &amp; Progress Tracking program provides
              simple, practical assessment tools that help teachers and school
              leaders understand exactly where learners are struggling and what to
              do next.
            </p>
            <p>
              We focus on key building blocks of reading and convert results into
              clear instructional recommendations teachers can implement
              immediately.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> Schools make better literacy
              decisions using real learner data.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={assessmentPhoto}
              alt="Learner reading assessment and classroom review session"
              priority
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <h2 className="tpd-page-title">What We Assess (Focus Areas)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>1) Letter-Sound Knowledge (Foundation)</h3>
              <p>
                We assess whether learners correctly identify and produce letter
                sounds and common sound patterns.
              </p>
              <p>
                <strong>Why it matters:</strong> If learners don&apos;t know sounds
                automatically, they cannot decode words fluently.
              </p>
              <p>We assess:</p>
              <ul>
                <li>Sound recognition and correct pronunciation</li>
                <li>Speed and automaticity of response</li>
                <li>Confusion pairs (similar sounds) for targeted practice</li>
              </ul>
            </article>

            <article className="card">
              <h3>2) Blending and Decoding Accuracy</h3>
              <p>
                We assess the learner&apos;s ability to blend sounds and decode
                words from simple to more complex levels.
              </p>
              <p>
                <strong>Why it matters:</strong> Decoding is the engine of reading.
                Without it, learners guess words and struggle long-term.
              </p>
              <p>We assess:</p>
              <ul>
                <li>Blending accuracy (sound-by-sound into word)</li>
                <li>Decoding of familiar and unfamiliar words</li>
                <li>Error patterns such as sound skipping and guessing</li>
              </ul>
            </article>

            <article className="card">
              <h3>3) Oral Reading Fluency and Comprehension</h3>
              <p>
                After decoding, we assess fluency and comprehension with
                grade-appropriate short texts.
              </p>
              <p>
                <strong>Why it matters:</strong> Fluency supports comprehension. If
                learners read slowly or inaccurately, meaning is lost.
              </p>
              <p>We assess:</p>
              <ul>
                <li>Oral reading fluency (accuracy and speed)</li>
                <li>Expression and phrasing where appropriate</li>
                <li>
                  Comprehension with literal and basic inference questions
                  (grade-appropriate)
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <h2 className="tpd-page-title">How We Do It (Simple Process Schools Can Use)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>Step 1: Baseline Assessment (Starting Point)</h3>
              <p>
                At the start of a term or program cycle, we assess learners to
                determine:
              </p>
              <ul>
                <li>Current skill level by grade and class</li>
                <li>
                  Proportion of non-readers, emergent readers, and fluent readers
                </li>
                <li>Priority gaps requiring immediate intervention</li>
              </ul>
            </article>

            <article className="card">
              <h3>Step 2: Progress Monitoring (Track Growth)</h3>
              <p>
                We run short progress checks to see whether instruction is working.
              </p>
              <p>Checks are:</p>
              <ul>
                <li>Quick so they don&apos;t disrupt teaching time</li>
                <li>Consistent with the same method each cycle</li>
                <li>Skill-based so teachers know what to adjust</li>
              </ul>
              <p>
                Teachers and school leaders can see if learners are improving or
                stuck and act early.
              </p>
            </article>

            <article className="card">
              <h3>Step 3: Endline Assessment (Results and Accountability)</h3>
              <p>At the end of a cycle, we assess again to answer:</p>
              <ul>
                <li>What improved</li>
                <li>Which skills remain weak</li>
                <li>Which classes or teachers need additional coaching</li>
                <li>What the next cycle should focus on</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <h2 className="tpd-page-title">What Schools Receive (Outputs)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>1) Baseline, Progress and Endline Summaries</h3>
              <p>Clear summaries by:</p>
              <ul>
                <li>Grade and class</li>
                <li>Skill area: sounds, decoding, fluency, comprehension</li>
                <li>
                  Learning levels: non-reader, emerging, developing, fluent
                </li>
              </ul>
            </article>

            <article className="card">
              <h3>2) Learner Profiles</h3>
              <p>Simple learner-level profiles showing:</p>
              <ul>
                <li>Current reading level</li>
                <li>Specific skill gaps</li>
                <li>
                  Recommended support pathway (catch-up group, routine
                  reinforcement, fluency practice)
                </li>
              </ul>
            </article>

            <article className="card">
              <h3>3) Instructional Recommendations</h3>
              <p>Data translated into classroom action:</p>
              <ul>
                <li>Which sounds to reteach and how</li>
                <li>Which blending routines to intensify</li>
                <li>Which learners need small-group remedial support</li>
                <li>Which fluency routine to use</li>
                <li>
                  Which comprehension questions are appropriate for each level
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>How Schools Use the Data</h3>
            <p>Our data supports practical decisions such as:</p>
            <ul>
              <li>Grouping learners for catch-up reading</li>
              <li>Adjusting lesson pacing and routines</li>
              <li>
                Prioritizing coaching support for specific teachers and classes
              </li>
              <li>Tracking whether interventions are working</li>
              <li>Reporting outcomes to partners and stakeholders</li>
            </ul>
          </article>

          <article className="card">
            <h3>Outcome</h3>
            <p>
              Schools make better literacy decisions using real learner data,
              leading to stronger instruction, faster learner progress, and better
              accountability for results.
            </p>
          </article>

          <article className="card">
            <h3>Launch an Assessment Cycle</h3>
            <p>
              Start with baseline, progress, and endline reading checks and get
              practical recommendations your teachers can apply immediately.
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
