import Image from "next/image";
import Link from "next/link";
import teachingAidsPhoto from "../../../assets/photos/Training In Agago Lukole Sub-County.jpg";

export const metadata = {
  title: "Teaching Aids & Instructional Resources (Teachers)",
  description:
    "Practical classroom tools that improve consistency and reduce preparation time so every reading lesson is structured and effective.",
};

export default function TeachingAidsInstructionalResourcesTeachersPage() {
  return (
    <>
      <section className="section tpd-hero-section">
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
          <div className="section-head">
            <h2>What We Provide (Focus Areas)</h2>
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
                <li>Download Sound Charts - Basic Letter Sounds (PDF)</li>
                <li>Download Sound Charts - Digraphs &amp; Blends (PDF)</li>
                <li>Download Sound Charts - Vowel Patterns (PDF)</li>
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
                <li>Download Flashcards - Letter Sounds (PDF)</li>
                <li>Download Flashcards - Decodable Words (PDF)</li>
                <li>Download Flashcards - High-Frequency Words (PDF)</li>
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
                <li>Download Blending Boards - Sound Boxes (PDF)</li>
                <li>Download Blending Boards - Word Building Mats (PDF)</li>
                <li>Download Blending Routine Cards (PDF)</li>
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
              <li>Download Word Lists - Phonics Sequence Set 1 (PDF)</li>
              <li>Download Word Lists - Blends &amp; Digraphs (PDF)</li>
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
              <li>Download Lesson Templates - Daily Phonics Lesson (PDF)</li>
              <li>Download Lesson Templates - Weekly Reading Plan (PDF)</li>
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
              <li>Download Teacher Guide - Phonics Routines (PDF)</li>
              <li>Download Teacher Guide - Fluency Routines (PDF)</li>
              <li>Download Teacher Guide - Error Correction Techniques (PDF)</li>
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
              <li>Each card: title, short description, tags, file type, download button</li>
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
            <h3>Download Button Label</h3>
            <p>
              <strong>Download Teacher Starter Pack (PDF Bundle)</strong>
            </p>
            <div className="action-row">
              <Link className="button" href="/resources">
                Open resources library
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
