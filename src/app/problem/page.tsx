import Link from "next/link";
import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "The Problem: Why Reading?",
  description:
    "Understand why foundational reading remains a critical challenge in Northern Uganda and how Ozeki Reading Bridge Foundation responds with practical, evidence-based literacy recovery.",
};

const causes = [
  {
    title: "1) Missing Foundations: Weak Letter-Sound Knowledge",
    detail:
      "Many learners know letter names but cannot consistently produce letter sounds. Others confuse similar sounds or take too long to recall sounds already taught. If sound knowledge is weak, blending and decoding cannot develop.",
  },
  {
    title: "2) The Decoding Engine Was Never Built: Poor Blending & Segmenting",
    detail:
      "Some learners can say sounds separately but cannot blend them into words, especially as words become longer. Reading then becomes slow and exhausting, and learners resort to guessing.",
  },
  {
    title: "3) Over-Reliance on Memorization and Guessing",
    detail:
      "When learners are pushed to memorize or guess from pictures and context, reading appears to improve briefly but collapses as text difficulty increases. Learners cannot read new words independently.",
  },
  {
    title: "4) Too Little Daily Practice",
    detail:
      "Reading grows through structured, frequent practice. In many classrooms, learner reading time is limited and dominated by teacher talk, copying, or choral repetition without individual feedback.",
  },
  {
    title: "5) Texts That Don’t Match Learner Level",
    detail:
      "Beginner readers are often given texts that are not aligned to the phonics skills they have already learned. The result is frustration, avoidance, and reduced confidence.",
  },
  {
    title: "6) Inconsistent Teaching Routines and Error Correction",
    detail:
      "Without a clear lesson sequence (review, teach, practice, check), instruction moves ahead before mastery. When errors are not corrected immediately, guessing habits become stronger.",
  },
  {
    title: "7) Language and Vocabulary Gaps",
    detail:
      "Some learners can decode some words but struggle to understand them. Limited vocabulary and oral language development reduce comprehension, even when decoding starts to improve.",
  },
  {
    title: "8) Interrupted Schooling and Poor Attendance",
    detail:
      "Phonics skills are sequential. Missing steps breaks the chain and learners fall behind quickly. As gaps widen, disengagement often increases.",
  },
  {
    title: "9) Large Classes and Limited Individual Feedback",
    detail:
      "Teachers in large classes cannot always listen to every learner read, correct mistakes, and support catch-up at the right pace. Uncorrected errors then accumulate.",
  },
  {
    title: "10) Unidentified Learning Needs",
    detail:
      "A smaller group of learners may need additional support due to vision, hearing, or processing challenges. Progress remains slow unless intervention pathways are identified and followed.",
  },
];

export default function ProblemPage() {
  return (
    <>
      <PageHero
        kicker="Northern Uganda literacy recovery"
        title="The Problem: Why Reading?"
        description="When children can’t read, they can’t learn, no matter how hard teachers try."
      />

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Northern Uganda context</h2>
            <p>
              Northern Uganda has worked hard to rebuild after years of disruption.
              But the long shadow of conflict remains visible in classrooms:
              interrupted early learning, overcrowded classes, teacher shortages,
              limited materials, and learning gaps that compound year after year.
            </p>
            <p>
              The biggest gap is often foundational reading. When learners miss
              letter sounds, blending, and decoding, many begin to guess words,
              struggle to understand text, and fall behind across every subject.
            </p>
          </article>

          <article className="card">
            <h2>Why reading matters</h2>
            <p>
              Reading is not just an English subject. It is the gateway skill that
              unlocks all learning.
            </p>
            <ul>
              <li>Understanding instructions in every subject</li>
              <li>Solving word problems in Mathematics</li>
              <li>Accessing Science and Social Studies content</li>
              <li>Participating confidently in class</li>
              <li>Building vocabulary, writing ability, and exam performance</li>
            </ul>
            <p className="meta-line">
              When reading is weak, learning becomes copying and memorizing rather
              than understanding.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>What we see in many classrooms</h2>
            <ul>
              <li>Learners recognize some letters but struggle with sounds</li>
              <li>Blending sounds into words is inconsistent</li>
              <li>Reading is slow and inaccurate, so meaning is lost</li>
              <li>Memorization, repetition, and guessing replace decoding</li>
              <li>Learners avoid reading because it feels difficult or embarrassing</li>
            </ul>
            <p>
              Teachers work hard. The issue is rarely effort. The issue is often
              method, materials, and support systems.
            </p>
          </article>

          <article className="card">
            <h2>What this means</h2>
            <p>
              The deeper challenge is not simply low performance. It is a system
              gap. Many schools need a practical, repeatable reading system that
              can be used every day in real classrooms.
            </p>
            <ul>
              <li>A clear step-by-step method for teaching reading</li>
              <li>Aligned materials matched to learner level</li>
              <li>Coaching support to sustain routine use</li>
              <li>Assessment data to guide catch-up and track progress</li>
              <li>Leadership supervision to maintain school-wide consistency</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>The Problem Behind Reading Struggle</h2>
            <p>
              Reading difficulties are rarely caused by laziness. In most cases,
              learners are missing one or more building blocks.
            </p>
          </div>
          <div className="cards-grid">
            {causes.map((cause) => (
              <article className="card" key={cause.title}>
                <h3>{cause.title}</h3>
                <p>{cause.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>Our response: rebuilding reading from the ground up</h2>
            <p>
              That is why our solution is practical and evidence-based. We equip
              teachers and schools with:
            </p>
            <ul>
              <li>Structured phonics teacher training</li>
              <li>Classroom coaching and observation cycles</li>
              <li>Learner assessments and progress tracking</li>
              <li>Catch-up routines for struggling readers</li>
              <li>Teaching aids and phonics-aligned reading materials</li>
              <li>Leadership mentoring for sustainability</li>
            </ul>
            <p className="meta-line">
              This is the bridge from disruption to recovery, from guessing to
              reading.
            </p>
            <div className="action-row">
              <Link className="button" href="/phonics-training">
                See signature program
              </Link>
              <Link className="button button-ghost" href="/book-visit">
                Book a school visit
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

