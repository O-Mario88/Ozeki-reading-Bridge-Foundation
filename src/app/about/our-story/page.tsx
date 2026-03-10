import Link from "next/link";
import { AlertTriangle, ArrowRightCircle, Compass, Lightbulb, LineChart } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import styles from "./page.module.css";

export const metadata = {
  title: "Our Story",
  description:
    "Understand the literacy problem in Uganda and how Ozeki's National Literacy Intelligence Platform turns evidence into sustained classroom improvement.",
};

export default function OurStoryPage() {
  return (
    <>
      <PageHero
        kicker="About"
        title="Our Story"
        description="A clear national pathway from literacy challenge to measurable, school-level improvement."
      />

      <section className={`section ${styles.problemSection}`}>
        <div className="container">
          <article className={`card ${styles.problemSurface}`}>
            <div className={styles.sectionHeader}>
              <span className={styles.iconWrap} aria-hidden>
                <AlertTriangle size={18} />
              </span>
              <h2>The Problem We Are Solving</h2>
            </div>

            <p>
              Across Uganda, too many children are still moving through school without mastering
              the foundational skill that unlocks all other learning: reading. National evidence
              shows progress in access to education, but foundational literacy remains far too
              weak for many learners. The 2024 National Population and Housing Census reports a
              national literacy rate of about 74 percent, meaning a substantial share of Ugandans
              still lack basic literacy skills, even as Uganda remains a very young country with
              heavy pressure on the school system. Uwezo's national learning assessments also show
              that many children are not reaching expected reading levels early enough, and that
              foundational learning losses worsened around and after the COVID period. Their
              evidence has shown large proportions of children remaining at non-reader or very
              early reader levels, especially among younger age groups, which signals that too many
              learners are entering upper primary without strong reading foundations.
            </p>

            <p>
              This is not only a learner problem; it is a system problem. Many schools still lack
              the conditions needed for consistent early grade reading instruction: enough teaching
              and learning materials, sustained teacher support, and system-wide commitment to
              foundational literacy. When foundational reading is weak, children struggle in every
              subject because they cannot access written instruction, complete independent tasks, or
              understand grade-level texts. As a result, progression through school can mask deep
              learning gaps, creating a cycle where enrolment exists, but real learning remains
              fragile.
            </p>

            <p className={styles.pullQuote}>
              "Reading is the gateway skill&mdash;without it, every other subject becomes harder."
            </p>

            <p>
              The challenge is even sharper in communities that have faced long periods of
              disruption. Northern Uganda remains an important example of how conflict can reset
              education systems for a generation. Years of insecurity, displacement, and life in
              IDP camps disrupted attendance, weakened teacher availability, damaged learning
              environments, and reduced reliable access to schooling. Even after the conflict
              receded, the effects did not disappear automatically. Schools continued rebuilding
              with limited materials, large classes, and uneven instructional support, which meant
              that many children were returning to classrooms that could not consistently deliver
              strong early reading instruction. That history matters because foundational literacy
              depends on routine, repetition, and protected instructional time; when those are
              broken for long periods, recovery requires more than reopening schools. It requires
              structured teaching, follow-up, and measurement.
            </p>

            <p>
              Uganda's own early grade reading evidence shows why structured support matters.
              Practical fluency benchmarks such as 20, 40, and 60 correct words per minute have
              been used to track whether learners are moving from basic decoding into stronger
              reading fluency. Those findings show that when schools receive structured reading
              support, learners are much more likely to move into stronger fluency bands. This
              matters because it shows the problem is not permanent. Children can improve, teachers
              can improve, and systems can recover-but only when support is practical,
              classroom-focused, and sustained over time.
            </p>

            <p>
              The deeper problem, therefore, is not just low reading scores. It is the absence of a
              strong, connected literacy improvement system that can do five things well: identify
              where learners are struggling, support teachers with effective methods, follow up
              implementation in real classrooms, verify whether results are improving, and direct
              help where the need is greatest. Too often, literacy initiatives are judged by
              activities completed rather than learning changed. Trainings are counted, materials
              are distributed, and visits are made, but schools, districts, and partners are still
              left asking the most important questions: Are children reading better? Which schools
              are improving? Which teachers still need support? Which districts require
              remediation? What should happen next?
            </p>

            <p className={styles.transitionLine}>
              Uganda does not only need more literacy activities. It needs a connected system that
              turns evidence into action.
            </p>
          </article>
        </div>
      </section>

      <section className={`section ${styles.solutionSection}`}>
        <div className="container">
          <article className={`card ${styles.solutionSurface}`}>
            <div className={styles.sectionHeader}>
              <span className={styles.iconWrap} aria-hidden>
                <Lightbulb size={18} />
              </span>
              <h2>Our Solution</h2>
            </div>

            <p>
              Ozeki's solution is built on a simple but powerful conviction: Uganda's literacy
              challenge will not be solved by isolated activities alone. It will be solved by a
              connected system that helps schools teach reading better, measure progress
              accurately, identify where support is most needed, and sustain improvement over time.
              That is the purpose of the National Literacy Intelligence Platform (NLIP).
            </p>

            <p>
              NLIP is not just a dashboard, and it is not only a training program. It is an
              integrated literacy improvement system that connects teacher professional
              development, in-school coaching, learner assessments, instructional leadership
              support, remedial intervention, resource distribution, writing culture, and reporting
              into one evidence-driven cycle. The platform is designed to work at every level of
              the education system-school, district, sub-region, region, and national-so that
              literacy support is not random or one-size-fits-all, but targeted, measurable, and
              accountable.
            </p>

            <p className={styles.highlightLine}>
              NLIP turns literacy data into action&mdash;school by school, district by district.
            </p>

            <div className={styles.loopStrip}>
              <span><Compass size={15} aria-hidden /> Train teachers</span>
              <span><ArrowRightCircle size={15} aria-hidden /> Support implementation</span>
              <span><LineChart size={15} aria-hidden /> Assess and analyze</span>
              <span><ArrowRightCircle size={15} aria-hidden /> Target intervention</span>
              <span><Compass size={15} aria-hidden /> Track and sustain gains</span>
            </div>

            <p>
              At its core, the solution works through a clear improvement loop: train teachers -
              support implementation - assess learners - analyze results - target intervention -
              track progress - sustain gains. This means schools are not left with knowledge
              alone; they are supported until reading instruction improves and learner performance
              begins to move.
            </p>

            <p>
              The first part of the solution is practical, demonstration-based teacher training in
              structured phonics. Teachers are equipped to teach reading step by step, with clear
              routines for sound teaching, blending and segmenting, decoding, fluency, and
              comprehension. But the work does not stop at training. Ozeki coaches then visit
              schools to observe real lessons, provide immediate feedback, model routines where
              needed, and support teachers and leaders through structured coaching cycles and
              follow-up visits.
            </p>

            <p>
              At the same time, learner assessments and progress tracking ensure that schools can
              see what children can actually do. The platform automatically translates scores into
              clear reading levels and domain profiles, helping teachers identify where learners
              are stuck and what type of support is needed. Where results show weak performance,
              NLIP triggers remedial and catch-up support. Where schools are improving, the
              platform shifts recommendations toward sustaining routines and moving toward
              graduation readiness.
            </p>

            <p>
              Instructional leadership support strengthens headteachers and Directors of Studies to
              protect reading time, supervise implementation, and use learner data for decisions.
              Teaching aids and instructional resources make it easier for teachers to apply what
              they learn consistently. The 1001 Story Project reinforces literacy by helping
              learners write, revise, read aloud, and publish their own stories-building reading
              culture, learner confidence, and locally relevant materials.
            </p>

            <p>
              Finally, NLIP makes all of this visible and accountable. It produces school,
              district, regional, and national reports that combine training data, coaching
              evidence, learner outcomes, reading levels, and teaching quality into clear,
              partner-ready reporting. This allows schools, government stakeholders, and donors to
              move from broad intentions to precise action: where to coach more, where to
              remediate, where to strengthen leadership, and where schools are ready to sustain
              progress with less support.
            </p>

            <p>
              In short, Ozeki's solution is not a set of disconnected projects. It is a national
              literacy improvement system that trains, supports, measures, responds, and verifies
              until strong reading instruction becomes normal classroom practice and children read
              with confidence.
            </p>
          </article>

          <article className={`card ${styles.ctaBand}`}>
            <div>
              <h3>From evidence to national literacy progress</h3>
              <p>
                Explore verified outcomes, implementation trends, and program pathways across
                Uganda.
              </p>
            </div>
            <div className={`action-row ${styles.ctaRow}`}>
              <Link className="button button-compact" href="/impact">
                View Live Impact Dashboard
              </Link>
              <Link className="button button-ghost button-compact" href="/programs">
                Explore Our Programs
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
