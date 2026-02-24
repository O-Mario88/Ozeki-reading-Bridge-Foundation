import Image from "next/image";
import Link from "next/link";
import trainingPhoto from "../../../assets/photos/PXL_20260217_124455266.MP.jpg";

export const metadata = {
  title: "Teacher Professional Development",
  description:
    "Structured phonics and reading instruction training report, model, focus areas, and results.",
};

export default function TeacherProfessionalDevelopmentPage() {
  return (
    <>
      <section className="section tpd-hero-section bg-surface-container" style={{ backgroundColor: 'var(--md-sys-color-surface-container)' }}>
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program spotlight</p>
            <h1 className="tpd-page-title">
              Teacher Professional Development (Structured Phonics &amp; Reading
              Instruction)
            </h1>
            <p className="tpd-fy-title">Last FY Training Report (2025)</p>
            <p className="tpd-subline">
              Practical. Demonstration-based. Built for real classrooms
            </p>
            <p>
              Our Teacher Professional Development program equips early-grade
              teachers with step-by-step, evidence-based reading instruction that
              works in low-resource classrooms.
            </p>
            <p>
              We don&apos;t train theory. We train what teachers will do tomorrow
              morning: how to introduce letter sounds, teach blending, correct
              errors, build fluency, grow vocabulary, and guide comprehension
              using simple routines and materials.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> Teachers deliver clearer, more
              consistent reading instruction, and learners progress faster because
              the teaching is structured and repeatable.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={trainingPhoto}
              alt="Teachers in a practical phonics training session"
              priority
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <h2 className="tpd-page-title">Our Training Model: How We Do It (What Makes It Work)</h2>
          </div>

          <div className="cards-grid">
            <article className="card">
              <h3>1) We start with the Reading Pathway</h3>
              <p>
                We train teachers using a progression that mirrors how children
                learn to read:
              </p>
              <ul>
                <li>Letter sounds (sound-to-symbol mapping)</li>
                <li>Blend sounds into words (decoding)</li>
                <li>Break words into sounds (segmenting) and spelling (encoding)</li>
                <li>Read smoothly and accurately (fluency)</li>
                <li>Understand meaning (vocabulary and comprehension)</li>
                <li>Apply reading to writing (sentences, short stories, expression)</li>
              </ul>
              <p>
                Teachers learn to teach in this order so instruction becomes
                consistent across classes and schools.
              </p>
            </article>

            <article className="card">
              <h3>2) Demonstration-based training cycle</h3>
              <ul>
                <li>
                  <strong>Demonstration:</strong> facilitators model a full reading
                  lesson exactly as it should be taught.
                </li>
                <li>
                  <strong>Guided practice:</strong> teachers practice routines in
                  small groups and as teachers.
                </li>
                <li>
                  <strong>Micro-teaching:</strong> teachers deliver short lesson
                  segments while peers observe using a checklist.
                </li>
                <li>
                  <strong>Feedback and correction:</strong> specific coaching on
                  what to keep and what to adjust.
                </li>
                <li>
                  <strong>Classroom planning:</strong> teachers leave with a weekly
                  delivery and assessment plan.
                </li>
              </ul>
            </article>

            <article className="card">
              <h3>3) Exact classroom routines trained</h3>
              <ul>
                <li>Daily sound review routines</li>
                <li>Blending routines (sound-by-sound to whole word)</li>
                <li>Segmenting routines (word to sounds for spelling)</li>
                <li>Error correction techniques with immediate support</li>
                <li>
                  Fluency routines: timed reads, echo reading, repeated reading,
                  phrase reading
                </li>
                <li>Vocabulary routines in 60-90 seconds</li>
                <li>
                  Comprehension routines: predict, question, retell, inference
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>4) We equip teachers with tools, not just training</h3>
            <ul>
              <li>Teacher guides (step-by-step lesson delivery)</li>
              <li>Daily and weekly lesson routines</li>
              <li>Sound and blending practice activities</li>
              <li>Classroom implementation plans (timetable + routine + tracking)</li>
              <li>Simple assessment checks for learner progress</li>
            </ul>
          </article>

          <article className="card">
            <h3>Focus Areas (What We Train)</h3>
            <p>
              <strong>A)</strong> Letter sounds and sound-to-symbol mapping
            </p>
            <p>
              Teachers learn accurate sound introduction, pronunciation, and
              consistent letter-sound linkage.
            </p>
            <p>
              <strong>B)</strong> Blending, segmenting, decoding and encoding
            </p>
            <p>
              Teachers move learners from isolated sounds to reading and spelling
              words systematically.
            </p>
            <p>
              <strong>C)</strong> Fluency, vocabulary and comprehension
            </p>
            <p>
              Teachers build speed and accuracy, teach meaning efficiently, and
              guide grade-appropriate comprehension.
            </p>
          </article>

          <article className="card">
            <h3>Outputs (What the Training Produces)</h3>
            <ul>
              <li>Structured training sessions delivered</li>
              <li>Teacher guides and routine packs provided</li>
              <li>Classroom lesson routines established</li>
              <li>School and classroom implementation plans produced</li>
              <li>
                Teacher practice evidence captured (micro-teaching and observation
                checklists)
              </li>
            </ul>
            <p className="meta-line">
              <strong>Immediate program outcome:</strong> Teachers deliver clearer,
              more consistent reading instruction.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <h2 className="tpd-page-title">Last FY Results (2025): What We Have Done So Far</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <p className="meta-pill">2025 Reach</p>
              <h3>601 Schools Supported</h3>
            </article>
            <article className="card">
              <p className="meta-pill">2025 Reach</p>
              <h3>1,191 Teachers Trained</h3>
            </article>
            <article className="card">
              <p className="meta-pill">2025 Reach</p>
              <h3>1,090 School Leaders Trained</h3>
            </article>
          </div>
          <article className="card tpd-summary-card">
            <p>
              These results show strengthened capacity at both teacher level
              (instruction delivery) and school leadership level (supervision and
              sustainability), improving the likelihood that reading routines remain
              consistent beyond the training day.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>What Success Looks Like After Training</h3>
            <ul>
              <li>Teachers follow a clear lesson structure</li>
              <li>Learners spend more time actively practicing reading</li>
              <li>Accurate pronunciation and consistent sound routines are used</li>
              <li>Errors are corrected immediately and supportively</li>
              <li>
                Schools adopt reading timetables and leaders can supervise delivery
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Next Steps (Post-Training Support)</h3>
            <p>To sustain gains, our model links training to follow-up support:</p>
            <ul>
              <li>Classroom coaching visits</li>
              <li>Lesson observation and feedback</li>
              <li>Periodic assessments to track learner progress</li>
            </ul>
          </article>

          <article className="card">
            <h3>Call to Action</h3>
            <p>
              Partner with us to expand teacher training, strengthen school
              implementation, provide reading materials, and scale literacy results
              across more schools.
            </p>
            <div className="action-row">
              <Link className="button" href="/partner">
                Partner with us
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
