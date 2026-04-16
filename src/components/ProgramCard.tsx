import Link from "next/link";
import { Program } from "@/lib/types";

const fullPageLinks: Record<string, string> = {
  "Teaching Aids & Instructional Resources (Teachers)":
    "/teaching-aids-instructional-resources-teachers",
  "The 1001 Story Project (Learner Authors -> Published Books)": "/story-project",
  "Teacher Professional Development": "/teacher-professional-development",
  "In-School Coaching & Mentorship": "/in-school-coaching-mentorship",
  "Learner Reading Assessments & Progress Tracking":
    "/learner-reading-assessments-progress-tracking",
  "Remedial & Catch-Up Reading Interventions":
    "/remedial-catch-up-reading-interventions",
  "Reading Materials Development (Learners)": "/reading-materials-development",
  "School Systems & Routines": "/school-systems-routines",
  "Instructional Leadership Support": "/instructional-leadership-support",
  "Monitoring, Evaluation & Reporting": "/monitoring-evaluation-reporting",
  "Literacy Content Creation & Advocacy":
    "/literacy-content-creation-advocacy",
  "Teacher Training & School Support in Reading Using Phonics": "/phonics-training",
};

export function ProgramCard({
  program,
  sequence,
}: {
  program: Program;
  sequence: number;
}) {
  const detailHref = fullPageLinks[program.title];

  return (
    <article className="card program-card">
      <h3>
        {sequence}. {program.title}
      </h3>
      <p>{program.summary}</p>
      <h4>Focus areas</h4>
      <ul>
        {program.focusAreas.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h4>Outputs</h4>
      <ul>
        {program.outputs.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        <strong>Outcome:</strong> {program.outcome}
      </p>
      {detailHref ? (
        <div className="action-row">
          <Link className="button" href={detailHref}>
            View full page
          </Link>
        </div>
      ) : null}
    </article>
  );
}
