import Image from "next/image";
import Link from "next/link";
import contentAdvocacyPhoto from "../../../assets/photos/PXL_20260217_124415441.MP.jpg";

export const metadata = {
  title: "Literacy Content Creation & Advocacy",
  description:
    "Practical knowledge-sharing that helps educators teach reading better every week, not only during trainings.",
};

export default function LiteracyContentCreationAdvocacyPage() {
  return (
    <>
      <section className="section tpd-hero-section bg-surface-container" style={{ backgroundColor: 'var(--md-sys-color-surface-container)' }}>
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program spotlight</p>
            <h1 className="tpd-page-title">Literacy Content Creation &amp; Advocacy</h1>
            <p className="tpd-subline">
              Practical knowledge-sharing that helps educators teach reading
              better, every week, not only during trainings.
            </p>
            <h2>Overview</h2>
            <p>
              Many teachers want to improve, but they lack clear, practical
              guidance they can trust. Our Literacy Content Creation &amp;
              Advocacy program produces short, teacher-friendly content that
              translates evidence-based literacy practices into simple routines,
              tools, and tips for real classrooms. This keeps good practice
              alive between trainings and helps schools standardize quality
              across teachers.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> More educators apply proven
              literacy practices in real classrooms.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={contentAdvocacyPhoto}
              alt="Teachers participating in literacy content and instructional advocacy session"
              priority
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <h2 className="tpd-page-title">What We Produce (Focus Areas)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>1) Guides (Step-by-step how-to teach resources)</h3>
              <p>
                We create practical guides that show teachers exactly what to do
                during reading lessons using simple language, examples, and
                ready-to-use routines.
              </p>
              <p>Examples of guides:</p>
              <ul>
                <li>&quot;How to Teach Letter Sounds Correctly&quot;</li>
                <li>&quot;Blending Routine: From Sounds to Words&quot;</li>
                <li>&quot;Error Correction in Phonics (Fast &amp; Supportive)&quot;</li>
                <li>&quot;Fluency Routines in 10 Minutes&quot;</li>
                <li>&quot;Simple Comprehension Checks That Work&quot;</li>
                <li>&quot;Catch-Up Reading: Small-Group Lesson Plans&quot;</li>
                <li>&quot;How to Use Decodable Readers Effectively&quot;</li>
              </ul>
            </article>

            <article className="card">
              <h3>2) Articles (Professional learning in bite-sized form)</h3>
              <p>
                We publish articles that explain common classroom challenges and
                provide practical solutions teachers can apply immediately.
              </p>
              <p>Article themes:</p>
              <ul>
                <li>Why learners guess words and how to stop it</li>
                <li>Common phonics mistakes and how to fix them</li>
                <li>How to manage large classes in phonics lessons</li>
                <li>How to support slow learners without slowing the class</li>
                <li>How to build reading culture inside the classroom</li>
                <li>How to track progress using simple learner data</li>
              </ul>
            </article>

            <article className="card">
              <h3>3) Implementation Tips (Quick wins teachers can use tomorrow)</h3>
              <p>
                We share short do-this-next-lesson tips designed for busy teachers
                and school leaders.
              </p>
              <p>Examples:</p>
              <ul>
                <li>5-minute warm-up routines for daily sound review</li>
                <li>A 3-step blending drill for faster decoding</li>
                <li>Weekly routines for fluency and spelling</li>
                <li>Simple class trackers for reading progress</li>
                <li>Supervision tips for Headteachers and DoS</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <h2 className="tpd-page-title">Outputs (What Schools and Educators Receive)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>1) Toolkits (Downloadable Packs)</h3>
              <p>
                Curated bundles combining charts, templates, routines, and
                lesson tools:
              </p>
              <ul>
                <li>Phonics Starter Toolkit</li>
                <li>Fluency Toolkit</li>
                <li>Assessment Toolkit</li>
                <li>Remedial/Catch-Up Toolkit</li>
                <li>School Supervision Toolkit</li>
              </ul>
            </article>

            <article className="card">
              <h3>2) Campaign Content (Consistency at Scale)</h3>
              <p>
                Short, shareable content for literacy campaigns and teacher
                reinforcement:
              </p>
              <ul>
                <li>Posters, routines cards, classroom reminders</li>
                <li>
                  Themed reading improvement campaigns (for example, Decode
                  First, Then Read Fast)
                </li>
                <li>Optional termly implementation challenges for schools</li>
              </ul>
            </article>

            <article className="card">
              <h3>3) Best-Practice Briefs (Clear, credible summaries)</h3>
              <p>Short briefs that condense proven literacy practices into:</p>
              <ul>
                <li>What works</li>
                <li>Why it works</li>
                <li>
                  How to implement in a Ugandan/African classroom context
                </li>
                <li>Common mistakes to avoid</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Where Content Lives (Website + Visibility)</h3>
            <ul>
              <li>
                Blog articles organized by phonics, fluency, comprehension,
                assessment, and leadership
              </li>
              <li>
                Resource Library downloads for toolkits and templates with
                download links
              </li>
              <li>
                Program pages with embedded implementation tips and sample tools
              </li>
              <li>Optional monthly Teaching Tip newsletter</li>
            </ul>
          </article>

          <article className="card">
            <h3>Website Downloads</h3>
            <ul>
              <li><a className="inline-download-link" href="/resources">Download Phonics Teaching Guide (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Fluency Routines Toolkit (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Reading Assessment Pack (PDF/Excel)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Remedial Reading Toolkit (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Supervision &amp; Coaching Toolkit (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Best-Practice Briefs (PDF Bundle)</a></li>
            </ul>
          </article>

          <article className="card">
            <h3>Primary Call To Action</h3>
            <p>
              Access practical teaching resources, toolkits, and implementation
              guides in one place.
            </p>
            <div className="action-row">
              <Link className="button" href="/resources">
                Access Free Teaching Resources
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <article className="card">
            <h3>Outcome</h3>
            <p>
              More educators apply proven literacy practices in real classrooms
              because they have practical guidance, tools, and routines they
              can use immediately and repeat consistently.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
