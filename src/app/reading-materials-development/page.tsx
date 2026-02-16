import Image from "next/image";
import Link from "next/link";
import readingMaterialsPhoto from "../../../assets/photos/Training In Agago Lukole Sub-County.jpg";

export const metadata = {
  title: "Reading Materials Development (Learners)",
  description:
    "Learner-friendly texts aligned to phonics progression and classroom lessons so reading practice builds real skill.",
};

export default function ReadingMaterialsDevelopmentPage() {
  return (
    <>
      <section className="section tpd-hero-section">
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program spotlight</p>
            <h1 className="tpd-page-title">Reading Materials Development (Learners)</h1>
            <p className="tpd-subline">
              Learner-friendly texts aligned to phonics progression and classroom lessons,
              so practice actually builds reading skill.
            </p>
            <h2>Overview</h2>
            <p>
              Children become readers through practice, but practice only works when
              the text matches what they have been taught.
            </p>
            <p>
              Our Reading Materials Development program produces decodable readers,
              leveled passages, and comprehension activities that align with classroom
              phonics lessons. This gives teachers ready-to-use materials that increase
              reading time, accuracy, and confidence.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> More meaningful practice leads to
              stronger fluency and comprehension.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={readingMaterialsPhoto}
              alt="Teachers and learners using structured reading materials in class"
              priority
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>What We Provide (Focus Areas)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>1) Decodable Readers (Phonics-aligned)</h3>
              <p>
                Decodable readers are short books where most words follow phonics
                patterns learners have already learned.
              </p>
              <p>
                <strong>Why it matters:</strong> Learners stop guessing and start
                decoding, building real reading skill.
              </p>
              <p>What&apos;s included:</p>
              <ul>
                <li>Phonics-sequenced stories from CVC to more complex patterns</li>
                <li>Repeated target sounds and patterns for mastery</li>
                <li>Short sentences and controlled vocabulary</li>
                <li>Teacher notes with pre-reading routine and quick checks</li>
              </ul>
            </article>

            <article className="card">
              <h3>2) Leveled Passages (Fluency and Confidence)</h3>
              <p>
                Leveled passages are short texts organized by difficulty to build
                smooth reading and stamina.
              </p>
              <p>
                <strong>Why it matters:</strong> After decoding, learners need
                structured fluency practice to read faster, smoother, and with
                understanding.
              </p>
              <p>What&apos;s included:</p>
              <ul>
                <li>Passages by level: beginner, developing, and fluent</li>
                <li>Fluency routines: repeated, echo, and timed practice</li>
                <li>Optional tracking lines for accuracy and fluency</li>
                <li>10-15 minute teacher guidance for classroom use</li>
              </ul>
            </article>

            <article className="card">
              <h3>3) Comprehension Activities (Meaning-making)</h3>
              <p>
                Comprehension activities help learners understand, retell, and respond
                to text without overwhelming them.
              </p>
              <p>
                <strong>Why it matters:</strong> Comprehension grows when decoding and
                fluency are supported and questions match learner level.
              </p>
              <p>What&apos;s included:</p>
              <ul>
                <li>Literal questions: who, what, where</li>
                <li>Sequencing prompts: beginning, middle, end</li>
                <li>Vocabulary-in-context tasks</li>
                <li>Retell frames and optional writing prompts</li>
                <li>Teacher tips for fast comprehension checks</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Outputs (What Teachers Get)</h3>
            <ul>
              <li>Practice sheets (sound drills, blending, word and sentence practice)</li>
              <li>Reading passages (decodable and leveled)</li>
              <li>Classroom text sets (bundled weekly printable packs)</li>
            </ul>
          </article>

          <article className="card">
            <h3>Website Experience (How Downloads Should Work)</h3>
            <p>Resource library page setup:</p>
            <ul>
              <li>Filters: Grade, Skill, Level, Resource Type</li>
              <li>Each card: title, short description, tags, file type, download button</li>
              <li>Optional: email capture before download or free-download toggle</li>
              <li>Optional: most downloaded and new this week sections</li>
              <li>Optional: preview first two pages before download</li>
            </ul>
          </article>

          <article className="card">
            <h3>All Download Buttons</h3>
            <ul>
              <li>Decodable Readers - Set 1, Set 2, Set 3</li>
              <li>Leveled Passages - Beginner, Intermediate, Advanced</li>
              <li>Comprehension Activities - Level 1, Level 2, Level 3</li>
              <li>Practice Sheets (PDF)</li>
              <li>Full Classroom Text Set (ZIP/PDF Bundle)</li>
            </ul>
            <div className="action-row">
              <Link className="button" href="/resources">
                Download Decodable Readers - Set 1 (PDF)
              </Link>
              <Link className="button button-ghost" href="/resources">
                Download Decodable Readers - Set 2 (PDF)
              </Link>
              <Link className="button button-ghost" href="/resources">
                Download Decodable Readers - Set 3 (PDF)
              </Link>
              <Link className="button button-ghost" href="/resources">
                Download Leveled Passages - Beginner (PDF)
              </Link>
              <Link className="button button-ghost" href="/resources">
                Download Leveled Passages - Intermediate (PDF)
              </Link>
              <Link className="button button-ghost" href="/resources">
                Download Leveled Passages - Advanced (PDF)
              </Link>
              <Link className="button button-ghost" href="/resources">
                Download Comprehension Activities - Level 1 (PDF)
              </Link>
              <Link className="button button-ghost" href="/resources">
                Download Comprehension Activities - Level 2 (PDF)
              </Link>
              <Link className="button button-ghost" href="/resources">
                Download Comprehension Activities - Level 3 (PDF)
              </Link>
              <Link className="button button-ghost" href="/resources">
                Download Practice Sheets (PDF)
              </Link>
              <Link className="button button-ghost" href="/resources">
                Download Full Classroom Text Set (ZIP/PDF Bundle)
              </Link>
              <Link className="button button-ghost" href="/book-visit">
                Book school support
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
