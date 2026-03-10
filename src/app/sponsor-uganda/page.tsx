import Link from "next/link";
import { HomeSupportRequestModal } from "@/components/home/HomeSupportRequestModal";

export const metadata = {
  title: "Sponsor Literacy in Uganda",
  description:
    "Fund a national two-year literacy partnership in Uganda with NLIP-based implementation support, assessments, and accountability reporting.",
};

const IMPLEMENTATION_AREAS = [
  {
    title: "1) Structured teacher capacity building nationwide",
    points: [
      "Across regions, teachers receive practical, demonstration-based training on structured phonics and effective reading routines.",
      "Follow-up plans are built so implementation begins immediately in classrooms.",
    ],
  },
  {
    title: "2) Coaching and implementation follow-through",
    points: [
      "Schools receive repeated support through coaching cycles.",
      "Classroom observation and coaching using a standard lesson evaluation tool",
      "Demonstration lessons where implementation has not started",
      "Mentoring and improvement plans for teachers",
      "Leadership routines to protect reading time and supervise instruction",
    ],
  },
  {
    title: "3) Four national assessment rounds (proof of progress)",
    points: [
      "NLIP supports four assessment rounds across two years.",
      "Baseline -> Progress checks -> Endline",
      "National progress is measured consistently, gaps are identified early, and support is targeted where needed most.",
    ],
  },
  {
    title: "4) Priority targeting and catch-up support",
    points: [
      "NLIP flags priority areas and supports intensified actions.",
      "Remedial and catch-up interventions where non-readers remain high",
      "Targeted coaching where teaching quality is weak",
      "Leadership strengthening where supervision systems are missing",
    ],
  },
];

const NATIONAL_EVIDENCE = [
  "National assessment results and reading level movement (aggregated)",
  "National teaching quality summary (teacher evaluation results by domain, aggregated)",
  "Coverage and credibility indicators (n, completeness, tool version, last updated)",
  "Early warning flags identifying priority districts and sub-counties for intensified support",
  "REC-mapped recommendations showing what should happen next and where",
];

const PERFORMANCE_REPORT_COVERS = [
  "Regions, sub-regions, districts, and sub-counties",
  "Reading level movement and domain results over time",
  "Where improvement is strongest and where progress is slow",
  "Priority areas needing remediation, coaching, or leadership support",
];

const TEACHING_QUALITY_COVERS = [
  "Teaching quality by domain at national scale",
  "Improvement trends from baseline to follow-ups",
  "The balance of needs: coaching vs catch-up training (aggregated)",
];

export default function SponsorUgandaPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">National partnership package</p>
          <h1>Sponsor Literacy in Uganda (National 2-Year Partnership)</h1>
          <p>
            National literacy improvement measured, coached, and proven with NLIP.
          </p>
          <p>
            A national partnership supports Uganda&apos;s literacy improvement cycle over
            two years, using the National Literacy Intelligence Platform (NLIP) to deliver
            structured support, verify classroom implementation, and report results at
            scale.
          </p>
          <p>
            This option is designed for partners who want maximum reach and system-level
            impact while still maintaining clarity on what is improving and where priority
            support is needed.
          </p>
          <p>
            This is not a campaign. It is a national improvement system: train -&gt;
            coach -&gt; assess -&gt; act -&gt; verify, repeated consistently across
            regions and districts.
          </p>
          <div className="action-row">
            <HomeSupportRequestModal
              triggerLabel="Fund Uganda"
              title="Fund Uganda national partnership request form"
              description="Share your partnership timeline and we will follow up with implementation options."
              triggerClassName="button"
              presetMessage="I want to sponsor literacy in Uganda through a national 2-year partnership."
            />
            <HomeSupportRequestModal
              triggerLabel="Request a National Concept Note"
              title="National concept note request"
              description="Tell us your goals and we will prepare a national concept note."
              triggerClassName="button button-ghost"
              presetMessage="Please prepare a national concept note for a 2-year Uganda literacy partnership."
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container flow">
          <h2>What you fund</h2>
          <ul>
            <li>
              Targeted support for Uganda&apos;s national literacy improvement cycle over
              two years, strengthening teachers, instructional leaders, measurement
              systems, and follow-up support across the country.
            </li>
            <li>
              Your investment builds a national literacy operating system so improvement
              is coordinated, evidence-led, and transparent.
            </li>
          </ul>

          <hr />

          <h2>What happens (over 2 years)</h2>
          {IMPLEMENTATION_AREAS.map((item) => (
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

          <h2>What evidence you receive (national accountability)</h2>
          <p>National Evidence Pack (Dashboard + PDF Reports)</p>
          <ul>
            {NATIONAL_EVIDENCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <hr />

          <h2>Assessments, results, and reporting (what you will see)</h2>
          <p>National Performance Report covers:</p>
          <ul>
            {PERFORMANCE_REPORT_COVERS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>National Teaching Quality Report covers:</p>
          <ul>
            {TEACHING_QUALITY_COVERS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            Progress snapshots can be quarterly or termly. All reports include
            credibility markers: sample size (n), completeness, tool version, and last
            updated.
          </p>

          <hr />

          <h2>How costing works (kept simple)</h2>
          <ul>
            <li>$1,100 per school for the full 2-year support cycle</li>
          </ul>
          <p>
            National funding follows the same clear unit cost per school.
          </p>

          <h2>Ready to sponsor literacy in Uganda?</h2>
          <div className="action-row">
            <HomeSupportRequestModal
              triggerLabel="Fund Uganda"
              title="Fund Uganda national partnership request form"
              description="Share your partnership timeline and we will follow up with implementation options."
              triggerClassName="button"
              presetMessage="I want to sponsor literacy in Uganda through a national 2-year partnership."
            />
            <HomeSupportRequestModal
              triggerLabel="Request a National Concept Note"
              title="National concept note request"
              description="Tell us your goals and we will prepare a national concept note."
              triggerClassName="button button-ghost"
              presetMessage="Please prepare a national concept note for a 2-year Uganda literacy partnership."
            />
          </div>

          <div className="action-row">
            <Link className="button button-ghost" href="/impact/calculator">
              Open Funding Calculator
            </Link>
            <Link className="button button-ghost" href="/sponsor-a-region">
              Region Package
            </Link>
            <Link className="button button-ghost" href="/partner">
              All Partnership Options
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
