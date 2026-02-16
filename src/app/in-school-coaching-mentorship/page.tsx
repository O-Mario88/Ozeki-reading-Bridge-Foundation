import Image from "next/image";
import Link from "next/link";
import coachingPhoto from "../../../assets/photos/Training In Agago Lukole Sub-County.jpg";

export const metadata = {
  title: "In-School Teacher Evaluation, Coaching & Mentorship",
  description:
    "Classroom coaching model that turns training into daily reading instruction practice.",
};

export default function InSchoolCoachingMentorshipPage() {
  return (
    <>
      <section className="section tpd-hero-section">
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program spotlight</p>
            <h1 className="tpd-page-title">
              In-School Teacher Evaluation, Coaching &amp; Mentorship
            </h1>
            <p className="tpd-subline">
              Classroom coaching that turns training into daily practice.
            </p>
            <h2>Overview</h2>
            <p>
              Training only creates change when it shows up in the classroom. Our
              In-School Teacher Evaluation, Coaching &amp; Mentorship program is the
              bridge between &quot;I attended training&quot; and &quot;I can teach
              reading well every day.&quot;
            </p>
            <p>
              We visit schools, observe real lessons, identify the exact gaps
              holding teachers back, and provide targeted coaching cycles until
              phonics routines become consistent, confident, and sustainable.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> Instruction quality improves and
              adoption of phonics routines is sustained.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={coachingPhoto}
              alt="In-school reading lesson coaching session"
              priority
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How We Do It (Our Coaching Model)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>1) Pre-Visit Planning</h3>
              <p>
                We set the coaching target before we arrive by working with school
                leadership to identify:
              </p>
              <ul>
                <li>Priority classes and teachers to observe</li>
                <li>The day&apos;s reading timetable and schedule</li>
                <li>Available materials (charts, readers, lesson notes)</li>
                <li>
                  Known challenges such as non-readers, large classes, low teacher
                  confidence, and time constraints
                </li>
              </ul>
              <p>
                This helps us arrive with a clear purpose and maximize classroom
                time.
              </p>
            </article>

            <article className="card">
              <h3>2) Classroom Observation Using Practical Rubrics</h3>
              <p>
                We observe lessons as they happen and use a simple rubric focused
                on the core actions that determine reading success.
              </p>
              <ul>
                <li>
                  Lesson structure: review, teach, guided practice, independent
                  practice, quick check
                </li>
                <li>Phonics accuracy and sound-letter mapping</li>
                <li>Blending and decoding routines</li>
                <li>Error correction quality and speed</li>
                <li>Active learner reading practice time</li>
                <li>Use of materials and classroom pacing</li>
                <li>Fluency and grade-appropriate comprehension routines</li>
              </ul>
              <p>
                Output: clear observation notes with strengths and gaps, not
                general comments.
              </p>
            </article>

            <article className="card">
              <h3>3) Immediate Feedback (Same Day, Same Teacher)</h3>
              <p>
                Feedback is specific, actionable, and practical. Teachers leave
                knowing exactly what to change in the next lesson.
              </p>
              <ul>
                <li>
                  <strong>Keep doing:</strong> what worked and why
                </li>
                <li>
                  <strong>Adjust:</strong> top 1-3 changes with the biggest impact
                </li>
                <li>
                  <strong>Next steps:</strong> what the teacher practices before the
                  next visit
                </li>
              </ul>
            </article>

            <article className="card">
              <h3>4) Coaching Cycles (Habit Building)</h3>
              <p>We coach in cycles so improvement is sustained.</p>
              <ul>
                <li>Observe baseline lesson performance</li>
                <li>Coach on 1-3 high-impact skills</li>
                <li>Practice immediately through micro-teaching rehearsal</li>
                <li>Follow up to check routine consistency</li>
                <li>Strengthen fluency and comprehension after phonics stabilizes</li>
              </ul>
              <p>
                This prevents coaching overload and helps teachers improve fast.
              </p>
            </article>

            <article className="card">
              <h3>5) Model Lessons and Co-Teaching</h3>
              <p>
                When teachers struggle, we model in the same classroom with the
                same learners and materials so expectations are clear.
              </p>
              <ul>
                <li>Correct sound teaching and blending routines</li>
                <li>Fast, supportive error correction</li>
                <li>Efficient transition from phonics to fluency</li>
                <li>Inclusion of weaker learners without slowing the class</li>
                <li>Co-teaching to transfer confidence and skills immediately</li>
              </ul>
            </article>

            <article className="card">
              <h3>6) Teacher Improvement Plans</h3>
              <p>
                Each coached teacher receives a short, measurable plan with:
              </p>
              <ul>
                <li>1-3 priority skills to improve</li>
                <li>Daily or weekly practice actions</li>
                <li>Clear progress evidence for the next observation</li>
              </ul>
              <p>
                Plans are realistic and aligned to school constraints and teacher
                workload.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Focus Areas (What Coaching Targets)</h3>
            <ul>
              <li>Lesson observation using simple rubrics</li>
              <li>Immediate feedback and coaching cycles</li>
              <li>Model lessons and co-teaching</li>
              <li>Correction techniques and routine consistency</li>
              <li>Increasing learner reading practice time</li>
              <li>
                Strengthening fluency routines and grade-appropriate comprehension
                questions
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Outputs (What Schools Receive)</h3>
            <ul>
              <li>Observation notes (teacher-by-teacher, lesson-by-lesson)</li>
              <li>Teacher improvement plans</li>
              <li>Follow-up coaching visits and progress tracking</li>
              <li>Model lessons and co-teaching sessions where needed</li>
              <li>
                Summary feedback for school leadership to strengthen supervision
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>What Changes We Expect to See</h3>
            <ul>
              <li>Reading lessons become more structured and faster-paced</li>
              <li>
                Teachers pronounce and teach sounds correctly and consistently
              </li>
              <li>
                Learners spend more time actively practicing blending and reading
              </li>
              <li>Teachers correct mistakes immediately with a clear method</li>
              <li>Phonics routines become habitual, not occasional</li>
              <li>
                School leadership supervises reading lessons using the same rubric
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Outcome</h3>
            <p>
              Instruction quality improves and adoption of phonics routines is
              sustained, because teachers are supported in the real classroom until
              consistent practice becomes the norm.
            </p>
          </article>

          <article className="card">
            <h3>Book Coaching Support</h3>
            <p>
              Schedule a school coaching visit for lesson observation, targeted
              feedback, and follow-up implementation support.
            </p>
            <div className="action-row">
              <Link className="button" href="/book-visit">
                Book a coaching visit
              </Link>
              <Link className="button button-ghost" href="/partner">
                Partner with us
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
