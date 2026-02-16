import Image from "next/image";
import Link from "next/link";
import storyProjectPhoto from "../../../assets/photos/Training In Agago Lukole Sub-County.jpg";

export const metadata = {
  title: "The 1001 Story Project",
  description:
    "School-based learner authorship program that strengthens writing, fluency, and comprehension, then compiles stories into a school anthology.",
};

export default function StoryProjectPage() {
  return (
    <>
      <section className="section tpd-hero-section">
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program spotlight</p>
            <h1 className="tpd-page-title">The 1001 Story Project</h1>
            <p className="tpd-subline">
              Learner Authors -&gt; Stronger Literacy -&gt; Published Stories
            </p>
            <h2>What it is</h2>
            <p>
              The 1001 Story Project is a school-based literacy program that helps
              primary learners become confident writers and stronger readers by
              guiding them to write short stories, then compiling the best drafts
              into a school anthology (digital or print, depending on funding).
              It is structured, teacher-led, and designed to fit into the normal
              school routine.
            </p>
            <p>
              At its core, the project turns writing into a literacy engine:
              learners plan, draft, revise, read aloud, and edit, which
              strengthens spelling, vocabulary, sentence construction, fluency,
              and comprehension.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={storyProjectPhoto}
              alt="Teachers and learners during 1001 Story Project writing support session"
              priority
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How the 1001 Story Project promotes literacy (why it works)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>1) Writing strengthens reading (and vice versa)</h3>
              <p>When learners write, they practice the foundations of literacy:</p>
              <ul>
                <li>Phonics/encoding: hearing sounds and spelling them correctly</li>
                <li>Vocabulary growth: using words to express ideas</li>
                <li>Sentence construction: grammar, punctuation, and clarity</li>
                <li>Comprehension and sequencing: beginning, middle, end and cause/effect</li>
                <li>
                  Fluency: reading drafts aloud improves speed, accuracy, and
                  expression
                </li>
              </ul>
            </article>

            <article className="card">
              <h3>2) Motivation increases when learners become authors</h3>
              <p>Publishing stories creates pride and ownership. Learners read more because:</p>
              <ul>
                <li>They want to read their own story and their friends&apos; stories</li>
                <li>They feel recognized and capable</li>
                <li>Reading becomes meaningful, not just a classroom task</li>
              </ul>
            </article>

            <article className="card">
              <h3>3) The school gains local reading materials</h3>
              <p>
                Anthologies become locally relevant texts with names, places,
                values, and experiences children understand, making reading
                easier and more enjoyable.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>How it boosts school academics (beyond English)</h3>
            <p>The project improves:</p>
            <ul>
              <li>Language performance: stronger writing, spelling, and comprehension</li>
              <li>
                Overall learning: better reading improves performance in Science,
                SST, Math word problems, and exams
              </li>
              <li>Class participation: confident readers participate more and learn faster</li>
              <li>
                Teacher quality: teachers improve writing instruction, marking,
                and feedback
              </li>
              <li>
                School image: published books show school seriousness and support
                enrollment, reputation, and partnerships
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How Schools Join (Step-by-Step)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>Step 1: Registration &amp; Planning (1 week)</h3>
              <p>The school submits a simple registration form with:</p>
              <ul>
                <li>School name and location</li>
                <li>Grades/classes participating</li>
                <li>Teacher focal persons (English/literacy)</li>
                <li>Preferred timeline (term dates)</li>
                <li>Digital-only or print preference (funding dependent)</li>
              </ul>
              <p>
                <strong>Deliverable:</strong> Project schedule and participating
                teacher list.
              </p>
            </article>

            <article className="card">
              <h3>Step 2: Teacher Orientation &amp; Writing-Routine Training (1-2 days)</h3>
              <p>We orient teachers and school leaders on:</p>
              <ul>
                <li>How the project works</li>
                <li>How to run writing sessions efficiently</li>
                <li>Age-appropriate story structure</li>
                <li>Sentence-building and vocabulary support strategies</li>
                <li>How to assess writing using simple rubrics</li>
                <li>How to guide revision without writing for learners</li>
              </ul>
              <p>
                <strong>Deliverables:</strong> Writing routine toolkit and weekly
                session plan.
              </p>
            </article>

            <article className="card">
              <h3>Step 3: Learner Prompt-Based Drafting Sessions (4-8 weeks)</h3>
              <p>
                Teachers run structured writing sessions weekly or twice weekly,
                using prompts matched to learner level.
              </p>
              <p>Simple session routine:</p>
              <ul>
                <li>Prompt (picture, sentence starter, or theme)</li>
                <li>Plan (characters + setting + beginning/middle/end)</li>
                <li>Draft (guided writing time)</li>
                <li>Quick share (pair/share or small group)</li>
                <li>Teacher check (1-2 key corrections only)</li>
              </ul>
              <p>Differentiation support for struggling learners includes:</p>
              <ul>
                <li>Sentence starters and word banks</li>
                <li>Guided group writing</li>
                <li>Oral storytelling before writing</li>
                <li>Shorter formats (6-10 sentences) then gradual expansion</li>
              </ul>
              <p>
                <strong>Deliverables:</strong> Learner draft portfolio and teacher
                session log.
              </p>
            </article>

            <article className="card">
              <h3>Step 4: Revision, Read-Aloud &amp; Editing Cycles (2-3 weeks)</h3>
              <p>This is where literacy accelerates. Learners revise to:</p>
              <ul>
                <li>Improve sentence clarity</li>
                <li>Correct spelling and punctuation</li>
                <li>Strengthen vocabulary</li>
                <li>Improve story flow and meaning</li>
              </ul>
              <p>Read-aloud practice is built in:</p>
              <ul>
                <li>Learners read drafts aloud in pairs/groups</li>
                <li>Teachers coach accuracy and expression</li>
                <li>Peers give simple feedback</li>
              </ul>
              <p>
                <strong>Deliverables:</strong> Revised drafts, growth notes, and
                shortlist for anthology.
              </p>
            </article>

            <article className="card">
              <h3>Step 5: Story Compilation &amp; Optional School Showcase (1-2 weeks)</h3>
              <p>We compile selected stories into a school anthology with:</p>
              <ul>
                <li>Light editing while preserving learner voice</li>
                <li>Formatting and basic design</li>
                <li>Optional learner illustrations</li>
              </ul>
              <p>
                Schools may host an optional Story Day where learners read aloud
                and celebrate authorship.
              </p>
              <p>
                <strong>Deliverables:</strong> Final edited anthology draft and
                optional showcase plan.
              </p>
            </article>

            <article className="card">
              <h3>Step 6: Anthology Publishing (Digital or Print)</h3>
              <ul>
                <li>Digital: PDF anthology shared for school printing and reading use</li>
                <li>Print: books printed and delivered based on partner funding</li>
              </ul>
              <p>
                <strong>Deliverables:</strong> Published anthology and
                distribution plan for classes, library corners, and awards.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Outcomes (What changes)</h3>
            <ul>
              <li>Improved writing quality and sentence construction</li>
              <li>Stronger reading fluency through structured read-aloud practice</li>
              <li>Higher learner confidence and motivation</li>
              <li>
                Locally relevant reading materials created by learners and reused
                for reading practice
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Sample Implementation Outputs (Evidence &amp; Reporting)</h3>
            <ul>
              <li>Teacher training log and writing routines toolkit</li>
              <li>Learner draft portfolio and final edited anthology</li>
              <li>Progress notes on writing improvement and fluency growth</li>
              <li>Optional photos, showcase report, and school testimony quotes</li>
            </ul>
          </article>

          <article className="card">
            <h3>Ready to Join?</h3>
            <p>Join the 1001 Story Project:</p>
            <ul>
              <li>Register your school</li>
              <li>Get teacher orientation and writing toolkit</li>
              <li>Run weekly story sessions</li>
              <li>Publish your learners&apos; stories into a school anthology</li>
            </ul>
            <div className="action-row">
              <Link className="button" href="/book-visit">
                Register your school
              </Link>
              <Link className="button button-ghost" href="/partner">
                Sponsor anthology printing
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
