import Image from "next/image";
import Link from "next/link";
import storyProjectPhoto from "../../../assets/photos/PXL_20260217_124359226.jpg";

export const metadata = {
  title: "The 1001 Story Project",
  description:
    "Structured learner authorship program that strengthens writing, reinforces reading, and links participation outputs to measurable literacy outcomes.",
};

export default function StoryProjectPage() {
  return (
    <>
      <section
        className="section tpd-hero-section bg-surface-container"
        style={{ backgroundColor: "var(--md-sys-color-surface-container)" }}
      >
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program Spotlight</p>
            <h1 className="tpd-page-title">The 1001 Story Project</h1>
            <p className="tpd-subline">
              Structured learner authorship that reinforces reading through meaningful writing.
            </p>
            <h2>Overview</h2>
            <p>
              The 1001 Story Project is our structured learner authorship
              program, designed to strengthen writing while reinforcing reading
              through purposeful, motivating practice.
            </p>
            <p>
              It transforms learners from passive readers into creators of
              meaningful text and helps schools build a culture where reading and
              writing are normal, celebrated, and connected to measurable learning
              outcomes.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> stronger writing quality, better
              reading fluency and comprehension, and school-level reading culture
              growth with evidence.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={storyProjectPhoto}
              alt="Learners and teachers in guided story writing and read-aloud practice"
              priority
              sizes="(max-width: 900px) 100vw, 45vw"
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Structured Classroom Routine</h3>
            <p>
              At the heart of the project is a simple but powerful routine:
              learners write short stories using clear prompts and guided
              structures, then improve them through repeated cycles of drafting,
              reading aloud, revising, and editing.
            </p>
            <p>
              This moves the project beyond creative writing activities into a
              consistent literacy-development process.
            </p>
          </article>

          <article className="card">
            <h3>Teacher Training for Story Instruction</h3>
            <p>
              Teachers are trained to deliver story writing as structured literacy
              instruction. They guide learners in:
            </p>
            <ul>
              <li>Planning a story (characters, setting, problem, solution)</li>
              <li>Writing clear, connected sentences</li>
              <li>Improving spelling and punctuation</li>
              <li>Strengthening vocabulary and meaning</li>
            </ul>
          </article>

          <article className="card">
            <h3>Read-Aloud Cycles That Reinforce Reading</h3>
            <p>
              Read-aloud cycles are used strategically. Learners read their own
              work and peers&apos; work as drafts improve, building fluency,
              confidence, and comprehension alongside writing quality.
            </p>
            <p>
              Over time, sentence construction strengthens and learners gain pride
              in producing complete, understandable text.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Publication and Visibility</h3>
            <p>
              The project is designed for publication. Learner stories are
              compiled into school anthologies that can be published as PDF for
              rapid release or printed when funding allows.
            </p>
            <p>
              This creates a strong motivation loop: learners see their work
              valued, teachers see tangible outputs, and schools gain locally
              relevant reading materials.
            </p>
          </article>

          <article className="card">
            <h3>School Story Showcases</h3>
            <p>
              Where appropriate, schools can host story showcases to celebrate
              learner authorship, reinforce reading culture, and make literacy
              progress visible to communities and partners.
            </p>
          </article>

          <article className="card">
            <h3>Locally Relevant Reading Content</h3>
            <p>
              Anthologies provide context-relevant texts grounded in learners&apos;
              language, culture, and experiences, strengthening reading engagement
              and sustained classroom use.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Measured Participation and Outputs</h3>
            <p>
              What makes this a true literacy intelligence program is measurement
              and integration. The platform tracks:
            </p>
            <ul>
              <li>Writing sessions conducted</li>
              <li>Drafts produced and stories edited</li>
              <li>Published stories and anthologies created</li>
              <li>School-level participation and output coverage</li>
            </ul>
            <p>
              Where consent is available, outputs are linked to learner authors.
            </p>
          </article>

          <article className="card">
            <h3>Linked to Literacy Outcomes</h3>
            <p>
              Story activity is connected to broader literacy outcomes in the
              platform:
            </p>
            <ul>
              <li>Reading-level movement</li>
              <li>Fluency and comprehension trends</li>
              <li>Teaching quality improvements</li>
            </ul>
            <p>
              Schools and partners can verify whether writing and read-aloud
              routines are strengthening reading performance over time.
            </p>
          </article>

          <article className="card">
            <h3>Evidence-Led Partner Value</h3>
            <p>
              For partners and funders, the project works as both literacy
              intervention and scalable content-creation model, producing credible
              outputs alongside measurable learning progress.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid-two">
          <article className="card">
            <h3>Program Result</h3>
            <p>
              The 1001 Story Project strengthens literacy from multiple angles at
              once: purposeful reading practice, stronger writing and sentence
              construction, learner confidence and motivation, and expanded supply
              of locally relevant texts.
            </p>
            <p>
              It helps schools move from learning to read into reading and writing
              to learn, through a uniquely Ugandan, learner-centered pathway.
            </p>
          </article>

          <article className="card">
            <h3>Join or Sponsor the Project</h3>
            <p>
              Support story sessions, anthology publishing, and learner-centered
              literacy growth linked to measurable outcomes.
            </p>
            <div className="action-row">
              <Link className="button" href="/portal/schools">
                Open school profiles
              </Link>
              <Link className="button button-ghost" href="/partner-with-us">
                Sponsor anthology printing
              </Link>
            </div>
            <p>
              <Link className="inline-download-link" href="/stories">
                Explore published stories
              </Link>
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
