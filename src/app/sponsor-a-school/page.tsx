import Link from "next/link";
import { HomeSupportRequestModal } from "@/components/home/HomeSupportRequestModal";

export const metadata = {
  title: "Sponsor a School",
  description:
    "Sponsor one school with a full literacy support package: structured phonics training, coaching visits, assessment evidence, and clear progress reporting.",
};

const COST_BREAKDOWN = [
  {
    item: "School Support Visits (8 total)",
    cost: "$632.00",
    covers:
      "Classroom observation, coaching, model lessons/co-teaching, teacher mentoring, follow-up action plans, and leadership check-ins over two years.",
  },
  {
    item: "Training, Reading & 1001 Story Materials (2-year cycle)",
    cost: "$394.98",
    covers:
      "Teacher guides, lesson templates, sound charts, flashcards, blending tools, decodable practice sheets/sets, 1001 Story Project activity resources, and structured routines aligned to the phonics sequence for the full support period.",
  },
  {
    item: "Meal Costs (3 people)",
    cost: "$59.26",
    covers:
      "Basic facilitation logistics for training/coaching days in both years so sessions run on time and teachers remain engaged.",
  },
  {
    item: "Facilitation Fee (Shared)",
    cost: "$13.76",
    covers: "Coordination, session delivery support, reporting, and documentation for accountability.",
  },
];

const IMPLEMENTATION_PATHWAY = [
  {
    title: "School onboarding + readiness check",
    body: "We confirm grade coverage, teacher roster, and the school's literacy routines and timetable.",
  },
  {
    title: "Teacher training on structured phonics (practical, demonstration-based)",
    body: "Teachers learn sound teaching, blending/segmenting routines, decoding, fluency practice, and comprehension routines appropriate to grade level.",
  },
  {
    title: "Eight school support visits (coaching cycle)",
    body: "Each visit includes classroom observation, feedback, modeling/co-teaching where needed, and a clear action plan for the next weeks.",
  },
  {
    title: "Progress tracking (evidence-based)",
    body: "Learner outcomes and reading levels are tracked to show movement from non-reader to fluent, and to inform next support steps (remedial or graduation-prep).",
  },
];

const SCHOOL_OUTPUTS = [
  "Teacher training sessions and lesson routines",
  "Classroom teaching aids and reading practice resources",
  "1001 Story Project activation support (learner writing, read-aloud, and anthology preparation)",
  "Structured coaching visits (8) with observation notes and improvement plans",
  "Leadership supervision support (Headteacher/DoS) to sustain routines",
  "A school-level literacy action plan (next steps, responsibilities, follow-up date)",
];

const PARTNER_EVIDENCE = [
  "School Support Summary Report (PDF) with what was delivered, when, and by whom",
  "Teaching Quality Evidence (aggregated lesson evaluation results)",
  "Learner Progress Evidence (reading level distribution and movement)",
  "1001 Story participation and publishing progress evidence (where available)",
  "Photo documentation (where consent is available)",
  "A clear next-steps plan for sustaining progress",
];

export default function SponsorSchoolPage() {
  return (
    <>
      <section className="page-hero" style={{ backgroundImage: "url('/photos/Literacy%20Training%20in%20Loro%20-%20Oyam%20District.jpg')" }}>
        <div className="container">
          <p className="kicker">Sponsor package</p>
          <h1>Sponsor a School - $1,100 (2-Year Full Literacy Support Package)</h1>
          <p>
            <strong>Goal:</strong> Help one school implement structured phonics, strengthen
            teacher practice through coaching, and track learner progress with evidence
            until reading improves.
          </p>
          <div className="action-row">
            <HomeSupportRequestModal
              triggerLabel="Sponsor This Package"
              title="Sponsor a school request form"
              description="Share your interest and our partnerships team will contact you with next steps."
              triggerClassName="button"
              presetMessage="I would like to sponsor one school under the $1,100 two-year full literacy support package."
            />
            <Link className="button button-ghost" href="/partner">
              Back to Partner With Us
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container flow">
          <h2>Cost breakdown (USD) - Total: $1,100 per school (2 years)</h2>
          <div className="cost-table-wrap">
            <table className="cost-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Cost (USD)</th>
                  <th>What it covers</th>
                </tr>
              </thead>
              <tbody>
                {COST_BREAKDOWN.map((row) => (
                  <tr key={row.item}>
                    <td>{row.item}</td>
                    <td>{row.cost}</td>
                    <td>{row.covers}</td>
                  </tr>
                ))}
                <tr className="cost-table-total">
                  <td>Total Cost Per School</td>
                  <td>$1,100.00</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          <hr />

          <h2>What happens in the school (implementation pathway)</h2>
          <ol>
            {IMPLEMENTATION_PATHWAY.map((step) => (
              <li key={step.title}>
                <strong>{step.title}:</strong> {step.body}
              </li>
            ))}
          </ol>

          <hr />

          <h2>What the school receives (outputs)</h2>
          <ul>
            {SCHOOL_OUTPUTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <hr />

          <h2>What you receive (evidence and accountability)</h2>
          <ul>
            {PARTNER_EVIDENCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <hr />

          <h2>What you fund</h2>
          <ul>
            <li>Targeted support for one school&apos;s literacy improvement cycle.</li>
            <li>
              Teachers and leaders receive structured support with measurable classroom
              follow-through.
            </li>
            <li>
              General assessment results and teacher evaluation results for the sponsored
              school.
            </li>
            <li>
              1001 Story Project activation as part of the 2-year package to reinforce
              reading through structured learner writing and publishing practice.
            </li>
            <li>
              We assess the school for as long as you support, compare improvements per
              learner and per teacher, and provide a clear progress report on reading
              levels achieved.
            </li>
          </ul>

          <hr />

          <h2>Why $1,100 is high-impact</h2>
          <ul>
            <li>
              This package goes beyond training. It funds the full cycle (2 years) that
              produces results.
            </li>
            <li>
              <strong>
                Train -&gt; Coach (Intensive) -&gt; Measure -&gt; Improve -&gt; Sustain
              </strong>
            </li>
            <li>
              That is how schools build confident readers and maintain progress long after
              the initial training.
            </li>
          </ul>

          <div className="action-row">
            <HomeSupportRequestModal
              triggerLabel="Request this package"
              title="Sponsor a school request form"
              description="Tell us your timeline and geography preference, and we will send next steps."
              triggerClassName="button"
              presetMessage="I am requesting the Sponsor a School - $1,100 two-year full literacy support package."
            />
            <Link className="button button-ghost" href="/donor-pack">
              Download Donor Pack
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
