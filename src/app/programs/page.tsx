import { CtaBand } from "@/components/CtaBand";
import { PageHero } from "@/components/PageHero";
import Link from "next/link";

const programDirectory = [
  {
    title: "Signature Program: Phonics Training & School Support",
    description:
      "A structured, term-based implementation pathway that combines teacher training, classroom coaching, leadership support, and progress tracking—so phonics routines move from training rooms into daily lessons and translate into measurable gains in decoding, fluency, and comprehension.",
    href: "/phonics-training",
  },
  {
    title:
      "Teacher Professional Development (Structured Phonics & Reading Instruction)",
    description:
      "Practical, demonstration-based training that equips teachers with a clear lesson sequence (review → teach → practice → check), accurate sound instruction, blending/segmenting routines, and fluency/comprehension strategies. Teachers leave with ready-to-use routines, templates, and a classroom implementation plan.",
    href: "/teacher-professional-development",
  },
  {
    title: "In-School Teacher Evaluation, Coaching & Mentorship",
    description:
      "Classroom observation and coaching cycles that strengthen teaching quality where it matters most—inside real lessons. We use simple rubrics, immediate feedback, model lessons, and co-teaching to build consistent phonics delivery, improve pacing and error correction, and sustain routine adoption over time.",
    href: "/in-school-coaching-mentorship",
  },
  {
    title: "Learner Reading Assessments & Progress Tracking",
    description:
      "Simple, reliable baseline, progress, and endline tools that reveal what learners can do—and what they need next. Schools receive clear summaries by skill area (letter sounds, decoding, fluency, comprehension) and practical recommendations that guide targeted instruction and catch-up support.",
    href: "/learner-reading-assessments-progress-tracking",
  },
  {
    title: "Remedial & Catch-Up Reading Interventions",
    description:
      "Structured small-group support for non-readers and struggling readers, built on skill-gap diagnosis and short daily routines. We help schools group learners by need, teach missing foundations (sounds, blending, decoding), build fluency step-by-step, and track progress frequently to accelerate improvement.",
    href: "/remedial-catch-up-reading-interventions",
  },
  {
    title: "Reading Materials Development (Learners)",
    description:
      "Learner-friendly decodable and leveled texts aligned to phonics progression—so practice matches what is taught. We develop reading passages, practice sheets, and classroom text sets that increase successful reading time, reduce guessing, and build real fluency and comprehension.",
    href: "/reading-materials-development",
  },
  {
    title: "Teaching Aids & Instructional Resources (Teachers)",
    description:
      "Ready-to-use classroom tools that improve consistency and reduce teacher preparation burden. Includes sound charts, flashcards, blending supports, word lists, and lesson templates—designed to help teachers deliver structured reading lessons confidently every day.",
    href: "/teaching-aids-instructional-resources-teachers",
  },
  {
    title: "School Literacy Program Strengthening (Systems & Routines)",
    description:
      "School-wide structures that protect reading time and ensure implementation continues beyond one-off training. We support literacy timetables, daily/weekly routines, classroom organization for reading, and simple accountability tools that track both teacher implementation and learner progress.",
    href: "/school-systems-routines",
  },
  {
    title: "Instructional Leadership Support (Headteachers & Directors of Studies)",
    description:
      "Leadership coaching and supervision tools that help school leaders monitor reading instruction effectively. We train leaders to use observation checklists, conduct coaching conversations, review learner data, and build school-wide accountability—so teachers get practical support and reading routines are sustained.",
    href: "/instructional-leadership-support",
  },
  {
    title: "Monitoring, Evaluation & Reporting (MER)",
    description:
      "MER systems that track delivery quality, implementation strength, learner outcomes, and partner-ready evidence. We provide clean reporting, learning briefs, and actionable recommendations—supporting transparency, continuous improvement, and scalable program design.",
    href: "/monitoring-evaluation-reporting",
  },
  {
    title: "Literacy Content Creation & Advocacy",
    description:
      "Practical professional knowledge sharing that strengthens instruction beyond training days. We publish guides, toolkits, and implementation tips that reinforce best practices, support teachers and school leaders, and help schools maintain consistent literacy routines throughout the year.",
    href: "/literacy-content-creation-advocacy",
  },
  {
    title: "The 1001 Story Project",
    description:
      "A structured learner authorship model that improves writing while reinforcing reading. Schools guide learners through prompt-based drafting, revision, read-aloud practice, and editing—then stories are compiled into a school anthology (digital or print, funding dependent), creating locally relevant reading materials and boosting learner confidence.",
    href: "/story-project",
  },
];

export const metadata = {
  title: "Programs & Services",
  description:
    "Professional overview of all Ozeki Reading Bridge Foundation programs with direct links to each detailed service page.",
};

export default function ProgramsPage() {
  return (
    <>
      <PageHero
        title="Programs & Services"
        description="Our full implementation support stack for nursery and primary literacy improvement."
      />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Program Directory</h2>
            <p>
              Browse every program and service, then open the full page for
              implementation details, outcomes, and participation options.
            </p>
          </div>
          <div className="program-directory-list">
            {programDirectory.map((program) => (
              <article className="program-directory-item" key={program.href}>
                <h3>{program.title}</h3>
                <p>{program.description}</p>
                <div className="action-row">
                  <Link className="button" href={program.href}>
                    View program page
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Need a customized school or district package?"
        body="We can combine training, coaching, learner assessment, and reporting into a phased implementation plan."
        primaryHref="/book-visit"
        primaryLabel="Book a diagnostic visit"
        secondaryHref="/partner"
        secondaryLabel="Discuss partnership"
      />
    </>
  );
}
