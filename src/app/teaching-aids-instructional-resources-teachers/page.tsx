import Image from "next/image";
import Link from "next/link";
import teachingAidsPhoto from "../../../assets/photos/PXL_20260218_124653516.MP.jpg";

export const metadata = {
  title: "Teaching Aids & Instructional Resources (Teachers)",
  description:
    "Practical classroom tools that improve consistency and reduce preparation time so every reading lesson is structured and effective.",
};

export default function TeachingAidsInstructionalResourcesTeachersPage() {
  return (
    <>
      <section className="section tpd-hero-section bg-surface-container" style={{ backgroundColor: 'var(--md-sys-color-surface-container)' }}>
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program spotlight</p>
            <h1 className="tpd-page-title">
              Teaching Aids &amp; Instructional Resources (Teachers)
            </h1>
            <p className="tpd-subline">
              Practical classroom tools that improve consistency and save
              preparation time, so every reading lesson is structured, fast-paced,
              and effective.
            </p>
            <h2>Overview</h2>
            <p>
              Even a well-trained teacher can struggle without the right tools.
              Our Teaching Aids &amp; Instructional Resources provide ready-to-use
              classroom materials that make phonics lessons easier to deliver and
              more consistent across teachers and schools.
            </p>
            <p>
              These tools reduce preparation time, increase learner participation,
              and help teachers follow clear routines every day.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> Teachers deliver engaging lessons
              with stronger structure.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={teachingAidsPhoto}
              alt="Teachers in a literacy session using practical classroom tools and routines"
              priority
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <h2 className="tpd-page-title">What We Provide (Focus Areas)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>1) Sound Charts (Phonics Wall Tools)</h3>
              <p>
                Sound charts help teachers introduce, review, and reinforce letter
                sounds and common sound patterns visually and consistently.
              </p>
              <p>What&apos;s included:</p>
              <ul>
                <li>Letter-sound charts (single sounds)</li>
                <li>Digraph charts (sh, ch, th, ph)</li>
                <li>Blend charts (bl, cl, tr, st)</li>
                <li>Vowel pattern charts (where applicable)</li>
                <li>Classroom placement guidance for daily use</li>
              </ul>
              <p>Button examples:</p>
              <ul>
                <li><a className="inline-download-link" href="/resources">Download Sound Charts - Basic Letter Sounds (PDF)</a></li>
                <li><a className="inline-download-link" href="/resources">Download Sound Charts - Digraphs &amp; Blends (PDF)</a></li>
                <li><a className="inline-download-link" href="/resources">Download Sound Charts - Vowel Patterns (PDF)</a></li>
              </ul>
            </article>

            <article className="card">
              <h3>2) Flashcards (Fast Practice + Assessment)</h3>
              <p>
                Flashcards support quick drills for sounds, words, and sight
                vocabulary, ideal for warm-ups, group practice, and catch-up
                sessions.
              </p>
              <p>What&apos;s included:</p>
              <ul>
                <li>Letter-sound flashcards</li>
                <li>Blend and digraph flashcards</li>
                <li>Decodable word flashcards aligned to phonics sequence</li>
                <li>Optional high-frequency word cards by level</li>
                <li>Simple game routines for rapid practice</li>
              </ul>
              <p>Button examples:</p>
              <ul>
                <li><a className="inline-download-link" href="/resources">Download Flashcards - Letter Sounds (PDF)</a></li>
                <li><a className="inline-download-link" href="/resources">Download Flashcards - Decodable Words (PDF)</a></li>
                <li><a className="inline-download-link" href="/resources">Download Flashcards - High-Frequency Words (PDF)</a></li>
              </ul>
            </article>

            <article className="card">
              <h3>3) Blending Boards (The Decoding Engine)</h3>
              <p>
                Blending boards are structured tools that help teachers teach
                blending clearly and help learners see how sounds combine to form
                words.
              </p>
              <p>What&apos;s included:</p>
              <ul>
                <li>Sound boxes and phoneme frames</li>
                <li>Blending slides (for example c-a-t to cat)</li>
                <li>Word-building mats (cat to cap to cup)</li>
                <li>Teacher instructions for a 10-minute blending routine</li>
              </ul>
              <p>Button examples:</p>
              <ul>
                <li><a className="inline-download-link" href="/resources">Download Blending Boards - Sound Boxes (PDF)</a></li>
                <li><a className="inline-download-link" href="/resources">Download Blending Boards - Word Building Mats (PDF)</a></li>
                <li><a className="inline-download-link" href="/resources">Download Blending Routine Cards (PDF)</a></li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>A) Word Lists (Aligned to Phonics Progression)</h3>
            <p>Teachers receive structured word lists for:</p>
            <ul>
              <li>Sound practice</li>
              <li>Blending practice</li>
              <li>Dictation and spelling practice</li>
              <li>Fluency drills</li>
            </ul>
            <p>Button examples:</p>
            <ul>
              <li><a className="inline-download-link" href="/resources">Download Word Lists - Phonics Sequence Set 1 (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Word Lists - Blends &amp; Digraphs (PDF)</a></li>
            </ul>
          </article>

          <article className="card">
            <h3>B) Lesson Templates (Planning Made Easy)</h3>
            <p>
              Simple templates help teachers plan quickly while maintaining clear
              lesson structure.
            </p>
            <ul>
              <li>Lesson objective and target sound</li>
              <li>Routine steps from review to quick check</li>
              <li>Materials needed and quick assessment check</li>
            </ul>
            <p>Button examples:</p>
            <ul>
              <li><a className="inline-download-link" href="/resources">Download Lesson Templates - Daily Phonics Lesson (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Lesson Templates - Weekly Reading Plan (PDF)</a></li>
            </ul>
          </article>

          <article className="card">
            <h3>C) Teacher Guides (Step-by-Step Delivery)</h3>
            <p>
              Short guides that show teachers exactly how to teach, correct errors,
              and sustain routine quality.
            </p>
            <ul>
              <li>Introducing a sound</li>
              <li>Blending and segmenting</li>
              <li>Error correction techniques</li>
              <li>Fluency and comprehension checks</li>
            </ul>
            <p>Button examples:</p>
            <ul>
              <li><a className="inline-download-link" href="/resources">Download Teacher Guide - Phonics Routines (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Teacher Guide - Fluency Routines (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Teacher Guide - Error Correction Techniques (PDF)</a></li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Website Experience (Teaching Resources Page)</h3>
            <p>Cards + filters + downloads:</p>
            <ul>
              <li>Filters: Grade, Skill, Resource Type</li>
              <li>Each card: title, short description, tags, file type, download link</li>
              <li>Recommended section for high-conversion resources</li>
            </ul>
          </article>

          <article className="card">
            <h3>Recommended Starter Pack</h3>
            <p>
              Teacher Starter Pack (free download): sound charts + flashcards +
              blending board + lesson template.
            </p>
          </article>

          <article className="card">
            <h3>Download Link Label</h3>
            <p>
              <a className="inline-download-link" href="/resources">
                Download Teacher Starter Pack (PDF Bundle)
              </a>
            </p>
            <p>
              <Link className="inline-download-link" href="/portal/schools">
                Open school profiles for support
              </Link>
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
