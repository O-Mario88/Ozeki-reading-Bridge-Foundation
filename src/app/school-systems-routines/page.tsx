import Image from "next/image";
import Link from "next/link";
import schoolSystemsPhoto from "../../../assets/photos/Literacy Training in Loro - Oyam District.jpg";

export const metadata = {
  title: "School Literacy Program Strengthening (Systems & Routines)",
  description:
    "School-wide routines and accountability systems that make literacy implementation stick across classes and terms.",
};

export default function SchoolSystemsRoutinesPage() {
  return (
    <>
      <section className="section tpd-hero-section">
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program spotlight</p>
            <h1 className="tpd-page-title">
              School Literacy Program Strengthening (Systems &amp; Routines)
            </h1>
            <p className="tpd-subline">
              School-wide routines and accountability systems that make literacy
              implementation stick.
            </p>
            <h2>Overview</h2>
            <p>
              Great training can collapse without a school system to protect it.
              This program helps schools move from one good teacher to school-wide
              consistency by putting simple routines, schedules, and accountability
              tools in place.
            </p>
            <p>
              We work with school leaders and literacy champions to design practical
              literacy timetables, establish daily and weekly reading routines, and
              install tracking tools that keep implementation on track term after
              term.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> Schools sustain literacy gains
              beyond one-off training.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={schoolSystemsPhoto}
              alt="School leaders and teachers in a literacy systems strengthening session"
              priority
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How We Do It (What Happens in a School)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>1) Set the Literacy Structure (Timetable + Roles)</h3>
              <p>
                We help the school create a realistic literacy timetable that
                protects reading time every day and clarifies responsibility.
              </p>
              <p>Includes:</p>
              <ul>
                <li>Daily reading block schedule by class and grade</li>
                <li>Allocation of phonics time vs reading practice time</li>
                <li>
                  Roles for Headteacher/DoS supervision, literacy champion, and
                  classroom teachers
                </li>
                <li>Routine standardization across classes and school years</li>
              </ul>
            </article>

            <article className="card">
              <h3>2) Install Daily &amp; Weekly Reading Routines</h3>
              <p>
                We introduce repeatable routines teachers can run every day without
                overthinking.
              </p>
              <p>Daily routines (examples):</p>
              <ul>
                <li>Sound review drill (fast, accurate pronunciation)</li>
                <li>Blending and word reading practice (guided + independent)</li>
                <li>Short decodable reading practice (paired/group)</li>
                <li>Quick 2-3 minute mastery check</li>
              </ul>
              <p>Weekly routines (examples):</p>
              <ul>
                <li>Fluency routine day (repeated or phrase reading)</li>
                <li>Spelling/encoding practice (segmenting and dictation)</li>
                <li>Mini assessment day (progress monitoring)</li>
                <li>Teacher reflection and lesson improvement focus</li>
              </ul>
            </article>

            <article className="card">
              <h3>3) Track Implementation</h3>
              <p>
                We provide simple tools to track whether routines are happening
                consistently and whether learners are progressing.
              </p>
              <p>Tracking focuses on:</p>
              <ul>
                <li>Are reading lessons happening on schedule?</li>
                <li>Are phonics routines being used correctly?</li>
                <li>Are learners getting enough reading practice time?</li>
                <li>Which classes or teachers need coaching support?</li>
              </ul>
            </article>

            <article className="card">
              <h3>4) Accountability &amp; Supervision (Supportive, not punitive)</h3>
              <p>
                We help leaders supervise reading lessons using short checklists and
                coaching conversations.
              </p>
              <p>Includes:</p>
              <ul>
                <li>Weekly or biweekly lesson checks using a short rubric</li>
                <li>Feedback conversations with 1-3 priority improvements</li>
                <li>Termly literacy review meetings using learner data</li>
                <li>Action plans for weak areas without blame</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Focus Areas</h3>
            <ul>
              <li>Literacy timetables (protected time, realistic schedule)</li>
              <li>
                Daily and weekly reading routines (standard lesson structure)
              </li>
              <li>
                Implementation tracking tools (consistency and quality checks)
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Outputs</h3>
            <ul>
              <li>School literacy plans (term plan + roles + routine standards)</li>
              <li>Routine trackers (teacher, class, wall, and weekly trackers)</li>
              <li>
                Accountability checklists (leadership supervision + coaching prompts)
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Primary CTA</h3>
            <p>
              Book a setup visit to establish literacy routines and accountability
              systems in your school.
            </p>
            <div className="action-row">
              <Link className="button" href="/portal/schools">
                Open school profiles
              </Link>
              <Link className="button button-ghost" href="/phonics-training">
                Signature program
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Website Downloads: Literacy Timetables</h3>
            <ul>
              <li><a className="inline-download-link" href="/resources">Download Literacy Timetable Template (PDF / Word)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Reading Block Schedule Samples (PDF)</a></li>
            </ul>
          </article>

          <article className="card">
            <h3>Daily &amp; Weekly Reading Routines</h3>
            <ul>
              <li><a className="inline-download-link" href="/resources">Download Daily Reading Routine Poster (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Weekly Literacy Routine Planner (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Structured Phonics Lesson Flow Card (PDF)</a></li>
            </ul>
          </article>

          <article className="card">
            <h3>Implementation Tracking Tools</h3>
            <ul>
              <li><a className="inline-download-link" href="/resources">Download Routine Tracker (Teacher/Class) (Excel/PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Term Literacy Implementation Checklist (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Learner Progress Tracking Sheet (Excel/PDF)</a></li>
            </ul>
          </article>

          <article className="card">
            <h3>Accountability &amp; Supervision Tools</h3>
            <ul>
              <li><a className="inline-download-link" href="/resources">Download Headteacher/DoS Supervision Checklist (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Coaching Conversation Guide (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Literacy Review Meeting Minutes Template (Word)</a></li>
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
