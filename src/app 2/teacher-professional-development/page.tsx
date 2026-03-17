import Image from "next/image";
import Link from "next/link";
import trainingPhoto from "../../../assets/photos/PXL_20260217_124455266.MP.jpg";

export const metadata = {
  title: "Teacher Professional Development (Structured Phonics)",
  description:
    "Hands-on structured phonics training pathway that links teacher practice to measurable reading outcomes through NLIP.",
};

export default function TeacherProfessionalDevelopmentPage() {
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
              Teacher Professional Development (Structured Phonics)
            </h1>
            <p className="tpd-subline">
              Practical, demonstration-led training built for real Ugandan
              classrooms.
            </p>
            <p>
              Teacher Professional Development (Structured Phonics) is our
              hands-on training pathway that equips teachers to teach reading the
              right way, step by step, in a sequence that aligns with how children
              learn to read and how Ugandan classrooms actually operate.
            </p>
            <p>
              It is practical, demonstration-led, and designed for real
              constraints: large class sizes, limited materials, mixed learner
              ability, and teachers who need routines that work the very next day.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> teacher confidence improves,
              lesson delivery strengthens, and learner reading levels move with
              evidence.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={trainingPhoto}
              alt="Teachers in a practical structured phonics training session"
              priority
              sizes="(max-width: 900px) 100vw, 45vw"
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Instructional Model Teachers Use Daily</h3>
            <p>
              Each training series begins by aligning teachers to a clear
              instructional model:
            </p>
            <ol>
              <li>Review</li>
              <li>Teach</li>
              <li>Guided practice</li>
              <li>Independent practice</li>
              <li>Quick check</li>
            </ol>
            <p>
              This structure gives teachers repeatable routines they can apply
              immediately, even in large and mixed-ability classes.
            </p>
          </article>

          <article className="card">
            <h3>Core Reading Engine Trained in Sequence</h3>
            <p>
              Teachers learn how to teach pure letter sounds (without extra vowel
              sounds), strengthen sound-symbol mapping, and run oral response
              routines that keep every learner active and accurate.
            </p>
            <p>
              Training then focuses on phonemic skills and decoding, so learners
              stop guessing and begin decoding systematically:
            </p>
            <ul>
              <li>Explicit blending: sound -&gt; blend -&gt; read</li>
              <li>Explicit segmenting: say word -&gt; segment -&gt; spell/write</li>
              <li>Decoding and spelling/encoding progression</li>
              <li>
                Tricky-word instruction that supports fluency without confusing
                phonics routines
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Fluency + Comprehension Routines That Accelerate Growth</h3>
            <p>
              The program builds habits that accelerate reading growth: accuracy,
              pace, repeated reading, partner reading, and grade-appropriate
              comprehension routines that connect decoding to meaning.
            </p>
            <p>
              Teachers are supported to select texts that match taught skills,
              including decodable and leveled passages, so practice is meaningful
              and success is visible in learner performance.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Ready-to-Use Materials for Immediate Implementation</h3>
            <p>
              Throughout training, teachers receive practical tools that reduce
              preparation burden and improve consistency:
            </p>
            <ul>
              <li>Lesson templates</li>
              <li>Word lists</li>
              <li>Sound cards</li>
              <li>Blending boards</li>
              <li>Practice activities aligned to the phonics sequence</li>
            </ul>
          </article>

          <article className="card">
            <h3>Implementation and Accountability After Every Session</h3>
            <p>
              A defining feature of NLIP professional development is that it ends
              with implementation and accountability, not just a certificate.
            </p>
            <p>Every session closes with a simple plan:</p>
            <ul>
              <li>What the teacher will do daily</li>
              <li>What routines will be introduced this week</li>
              <li>What will be checked in the next visit</li>
            </ul>
            <p>
              A follow-up date is scheduled immediately, turning training into a
              continuous improvement cycle that converts motivation into habit and
              habit into results.
            </p>
          </article>

          <article className="card">
            <h3>NLIP Measurement and Partner-Ready Evidence</h3>
            <p>
              NLIP makes teacher training measurable and partner-ready. Attendance
              is captured by school, role, gender, class, and subject taught, so
              leadership and coverage can be tracked across districts and
              sub-regions.
            </p>
            <p>
              The system connects each teacher to follow-up coaching and lesson
              evaluation results, enabling a clear change pathway:
            </p>
            <p className="meta-line">
              <strong>
                training delivered -&gt; teaching quality improves -&gt; learner
                outcomes move
              </strong>
            </p>
            <p>
              Lesson evaluations verify routine quality (sound modeling,
              blending/segmenting, decoding practice, correction), and learner
              assessments verify movement from non-reader to fluent.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>NLIP Promise for Teacher Development</h3>
            <p>
              Teacher Professional Development is not an isolated event. It is a
              structured pathway that produces measurable instructional
              improvement and better reading outcomes, tracked, verified, and
              strengthened over time.
            </p>
          </article>

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
            <h3>Partner to Scale Teacher Quality</h3>
            <p>
              Fund structured teacher professional development with built-in
              follow-up, coaching linkage, and verified literacy outcomes.
            </p>
            <div className="action-row">
              <Link className="button" href="/partner-with-us">
                Partner With Us
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
