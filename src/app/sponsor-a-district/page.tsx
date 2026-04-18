import Link from "next/link";
import { SponsorshipWizard } from "@/components/public/SponsorshipWizard";

export const metadata = {
  title: "Sponsor Literacy in a District",
  description:
    "Fund a two-year district literacy improvement cycle with coaching, assessments, teacher support, and partner-ready evidence through NLIP.",
};

const PARTNERSHIP_DELIVERABLES = [
  {
    title: "1) Eight School Support Visits",
    points: [
      "Each school receives 4 coaching visits per year (8 total).",
      "Classroom observation and coaching",
      "Demonstration lessons where implementation has not started",
      "Teacher mentoring and follow-up support",
      "Headteacher/DoS check-ins to protect reading time and sustain routines",
      "Clear action plans after every visit",
    ],
  },
  {
    title: "2) Four Assessment Rounds",
    points: [
      "Each school completes 4 assessment rounds across the 2 years.",
      "Baseline (where learners start)",
      "Progress checks (mid-course corrections)",
      "Endline (what changed)",
      "Assessment evidence tracks reading movement from non-reader to fluent.",
    ],
  },
  {
    title: "3) Training Materials and Teaching Tools",
    points: [
      "Sound charts, flashcards, and blending tools",
      "Word lists, lesson routines, and teacher guides",
      "Practice resources for learners",
      "Materials usage is tracked in NLIP for partner visibility.",
    ],
  },
  {
    title: "4) NLIP Evidence, Reporting, and Accountability",
    points: [
      "District dashboards (aggregated and privacy-protected)",
      "Teaching quality tracking (lesson evaluation by domain)",
      "Reading level movement and learning outcomes by domain",
      "Partner-ready reports (annual and end-of-cycle)",
    ],
  },
];

const DISTRICT_OUTCOMES = [
  "Stronger and more consistent phonics teaching in classrooms",
  "Reduced numbers of non-readers, especially in lower primary",
  "Improved decoding, fluency, and comprehension outcomes",
  "School leadership routines that sustain reading improvement beyond external support",
  "A clear pathway for schools to progress toward graduation readiness",
];

const PARTNER_EVIDENCE_PACK = [
  "Training Report (schools reached, participants by gender and role)",
  "Coaching Visit Report (schools visited, teachers observed, findings, recommendations)",
  "Assessment Report (learning outcomes and reading levels movement over time)",
  "Teaching Quality Report (lesson evaluation improvement by domain)",
  "Implementation Coverage Report (trained -> coached -> assessed -> improved)",
  "District Summary Brief (2-4 pages for quick decision-making)",
];

export default function SponsorDistrictPage() {
  return (
    <>
      <section className="page-hero" style={{ backgroundImage: "url('/photos/16.jpeg')" }}>
        <div className="container">
          <p className="kicker">District partnership package</p>
          <h1>Sponsor Literacy in a District (2-Year Partnership)</h1>
          <p>
            A district-wide literacy program measured, coached, and sustained for two
            years.
          </p>
          <p>
            When you fund a district, you are not funding a one-off training. You are
            funding a two-year literacy improvement cycle that strengthens teachers,
            supports school leadership, measures learner progress, and proves results with
            credible evidence through the National Literacy Intelligence Platform (NLIP).
          </p>
          <p>
            This partnership is designed for scale and accountability: every activity is
            tracked, every outcome is measured, and every school receives structured
            support until strong reading becomes normal classroom practice.
          </p>
          <div className="action-row">
            <a href="#sponsorship-checkout" className="button">
              Fund a District
            </a>
            <Link className="button button-ghost" href="/partner">
              All Partnership Options
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container flow">
          <h2>What your partnership delivers (per school, over 2 years)</h2>
          {PARTNERSHIP_DELIVERABLES.map((item) => (
            <div key={item.title}>
              <h3>{item.title}</h3>
              <ul>
                {item.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}

          <hr />

          <h2>What the district achieves (expected outcomes)</h2>
          <ul>
            {DISTRICT_OUTCOMES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <hr />

          <h2>What you receive as a partner (evidence you can trust)</h2>
          <p>District Partner Evidence Pack (PDF + dashboard access)</p>
          <ul>
            {PARTNER_EVIDENCE_PACK.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            All reports include credibility indicators: sample size (n), completeness,
            tool version, and last updated.
          </p>

          <hr />

          <h2>How costing works (kept simple)</h2>
          <ul>
            <li>$1,100 per school for the full 2-year support cycle</li>
          </ul>
          <p>
            When you select a district in the funding calculator, NLIP automatically
            calculates the total based on the number of schools in that district. Manual
            calculations are not required.
          </p>

          <h2>Choose where to fund</h2>
          <ul>
            <li>Country-wide</li>
            <li>Region</li>
            <li>District (this package)</li>
            <li>Sponsor one school</li>
          </ul>

          <div className="action-row">
            <a href="#sponsorship-checkout" className="button">
              Proceed to Secure Payment
            </a>
            <Link className="button button-ghost" href="/impact/calculator">
              Open Funding Calculator
            </Link>
            <Link className="button button-ghost" href="/partner">
              All Partnership Options
            </Link>
          </div>
        </div>
      </section>

      <section className="section bg-gray-50" id="sponsorship-checkout">
        <div className="container" style={{ maxWidth: '800px' }}>
           <h2 className="text-center mb-8">Secure Gateway</h2>
           <SponsorshipWizard level="district" />
        </div>
      </section>
    </>
  );
}
