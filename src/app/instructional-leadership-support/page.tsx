import Image from "next/image";
import Link from "next/link";
import leadershipPhoto from "../../../assets/photos/PXL_20250531_090804621.jpg";

export const metadata = {
  title: "Instructional Leadership Support (Headteachers & Directors of Studies)",
  description:
    "Leadership coaching that strengthens supervision, supports teachers, and protects reading time.",
};

export default function InstructionalLeadershipSupportPage() {
  return (
    <>
      <section className="section tpd-hero-section">
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program spotlight</p>
            <h1 className="tpd-page-title">
              Instructional Leadership Support (Headteachers &amp; Directors of
              Studies)
            </h1>
            <p className="tpd-subline">
              Leadership coaching that strengthens supervision, supports teachers,
              and protects reading time.
            </p>
            <h2>Overview</h2>
            <p>
              Even strong teachers struggle without strong instructional
              leadership. This program equips Headteachers and Directors of Studies
              with practical tools and routines to supervise reading lessons, coach
              teachers, and use learner data to guide decisions.
            </p>
            <p>
              The goal is simple: literacy becomes a school priority with
              consistent follow-through, not a one-time activity.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> Leaders drive consistent,
              high-quality reading instruction.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={leadershipPhoto}
              alt="Headteachers and school leaders participating in instructional leadership coaching"
              priority
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How We Support School Leaders (What We Do)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>1) Observation &amp; Supervision Systems</h3>
              <p>
                We train leaders to observe reading lessons using clear, short
                checklists, so supervision is possible even with busy schedules.
              </p>
              <p>What leaders learn to check:</p>
              <ul>
                <li>Is the reading block happening as scheduled?</li>
                <li>
                  Is the lesson following the phonics routine (review, teach,
                  practice, check)?
                </li>
                <li>Is sound pronunciation and blending taught accurately?</li>
                <li>Are learners getting enough active practice time?</li>
                <li>Are errors corrected immediately and correctly?</li>
                <li>Are teaching aids and materials being used properly?</li>
              </ul>
              <p>
                We also help leaders plan a realistic supervision timetable with
                clear classroom coverage and recording routines.
              </p>
            </article>

            <article className="card">
              <h3>2) Coaching Conversations</h3>
              <p>
                Observation without coaching does not improve teaching. We train
                leaders to hold short, effective conversations that help teachers
                improve quickly.
              </p>
              <p>Coaching conversation structure:</p>
              <ul>
                <li>Start with strengths (what is working and why)</li>
                <li>Name 1-2 priority improvements (not 10 issues)</li>
                <li>Give a clear next step for the next lesson</li>
                <li>Agree on daily routine practice actions</li>
                <li>Set a follow-up date for accountability</li>
              </ul>
              <p>
                Leaders also learn micro-coaching: 5-minute post-lesson feedback
                that drives immediate classroom change.
              </p>
            </article>

            <article className="card">
              <h3>3) Data-Informed Decisions</h3>
              <p>
                We help leaders interpret simple learner reading data and translate
                it into practical action.
              </p>
              <p>Leaders use data to:</p>
              <ul>
                <li>Identify classes or grades with most non-readers</li>
                <li>Decide where coaching support should focus</li>
                <li>Group learners for catch-up interventions</li>
                <li>Track progress over time and adjust instruction</li>
                <li>Run termly literacy review meetings with teachers</li>
              </ul>
              <p>
                Improvement becomes measurable and targeted instead of opinion-based.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Focus Areas</h3>
            <ul>
              <li>
                Observation and supervision checklists (what to look for and how
                to record it)
              </li>
              <li>
                Coaching conversations (how to give feedback and build teacher
                confidence)
              </li>
              <li>
                Data-informed decisions (how to use learner results for action)
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Outputs (What Schools Receive)</h3>
            <p>1) Leadership Toolkits:</p>
            <ul>
              <li>Reading lesson observation checklist</li>
              <li>Supervision schedule template</li>
              <li>Coaching conversation guide</li>
              <li>Literacy meeting agenda and action tracker</li>
              <li>Simple literacy data summary format</li>
            </ul>
            <p>2) Supervision Routines:</p>
            <ul>
              <li>Weekly or biweekly reading lesson checks</li>
              <li>Monthly implementation reviews</li>
              <li>Term literacy planning and reflection routines</li>
              <li>Documented follow-ups for teachers needing support</li>
            </ul>
            <p>3) Coaching Templates:</p>
            <ul>
              <li>Teacher improvement plan template</li>
              <li>Quick feedback form</li>
              <li>Next lesson focus coaching card</li>
              <li>Follow-up tracker</li>
            </ul>
          </article>

          <article className="card">
            <h3>Website Downloads</h3>
            <p>Observation &amp; Supervision</p>
            <ul>
              <li><a className="inline-download-link" href="/resources">Download Reading Lesson Supervision Checklist (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Supervision Schedule Template (Word/Excel)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Literacy Implementation Checklist (PDF)</a></li>
            </ul>
            <p>Coaching Conversations</p>
            <ul>
              <li><a className="inline-download-link" href="/resources">Download Coaching Conversation Guide (PDF)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Teacher Improvement Plan Template (Word)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Quick Feedback Form (PDF)</a></li>
            </ul>
            <p>Data-Informed Decisions</p>
            <ul>
              <li><a className="inline-download-link" href="/resources">Download Literacy Data Summary Template (Excel)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Termly Literacy Review Meeting Template (Word)</a></li>
              <li><a className="inline-download-link" href="/resources">Download Progress Tracking Dashboard (Simple Excel)</a></li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Primary CTA</h3>
            <p>
              Book coaching support for Headteachers and Directors of Studies to
              strengthen supervision and teacher support in your school.
            </p>
            <div className="action-row">
              <Link className="button" href="/book-visit">
                Book Leadership Coaching for Your School
              </Link>
            </div>
          </article>

          <article className="card">
            <h3>Outcome</h3>
            <p>
              Leaders drive consistent, high-quality reading instruction by
              supervising lessons effectively, coaching teachers with confidence,
              and using data to keep literacy implementation strong throughout the
              term.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
