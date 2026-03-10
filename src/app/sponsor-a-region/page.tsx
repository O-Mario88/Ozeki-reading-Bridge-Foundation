import Link from "next/link";
import { HomeSupportRequestModal } from "@/components/home/HomeSupportRequestModal";

export const metadata = {
  title: "Sponsor Literacy in a Region",
  description:
    "Fund a two-year regional literacy partnership with NLIP-based coaching, assessments, and accountability reporting.",
};

const REGION_IMPLEMENTATION = [
  {
    title: "1) Implementation support across schools",
    points: [
      "Schools receive repeated support through coaching visits and structured follow-up.",
      "Classroom observation and coaching",
      "Demonstration lessons where implementation has not started",
      "Teacher mentoring and improvement plans",
      "Leadership check-ins to protect reading time and sustain routines",
    ],
  },
  {
    title: "2) Four assessment rounds (proof of change)",
    points: [
      "Across the region, NLIP supports four assessment rounds in two years.",
      "Baseline -> Progress checks -> Endline",
      "This builds a reliable picture of improvement and supports targeted adjustments as schools progress.",
    ],
  },
  {
    title: "3) Leadership strengthening at scale",
    points: [
      "Headteachers and Directors of Studies receive practical tools and routines.",
      "Leaders supervise literacy instruction.",
      "Leaders support teachers consistently.",
      "Leaders use reading data to guide school-level decisions.",
    ],
  },
  {
    title: "4) Priority targeting and catch-up activation",
    points: [
      "NLIP flags underperforming districts and sub-regions early and supports targeted actions.",
      "Remedial and catch-up interventions where non-readers remain high",
      "Coaching focus shifts based on teaching quality gaps",
      "Intensified follow-up where results are stagnating",
    ],
  },
];

const REGIONAL_EVIDENCE = [
  "Assessment results and reading level movement for the region (aggregated)",
  "Teacher evaluation results (teaching quality by domain and trend over time, aggregated)",
  "Coverage and credibility indicators (n, completeness, tool version, last updated)",
  "Early warning priority flags for districts and sub-regions needing intensified support",
  "REC-mapped recommendations showing what should happen next and where",
];

const REGIONAL_PERFORMANCE = [
  "Sub-region and district comparisons",
  "Improvement trends across reading levels and domains",
  "Priority areas needing intensified remediation or coaching",
  "Where implementation is strong vs where support is still needed",
];

const TEACHING_QUALITY = [
  "Teaching quality averages by domain across the region",
  "Improvement from baseline to follow-ups",
  "Proportion of teachers needing coaching vs refresher catch-up training (aggregated)",
];

export default function SponsorRegionPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Regional partnership package</p>
          <h1>Sponsor Literacy in a Region (2-Year Partnership)</h1>
          <p>
            Region-wide literacy improvement measured, coached, and sustained through
            NLIP.
          </p>
          <p>
            A regional partnership supports literacy improvement across an entire region
            for two years, using NLIP to ensure structured implementation, measurable
            follow-through, and credible evidence. It is ideal for partners who want broad
            reach while maintaining clarity on performance differences within the region.
          </p>
          <p>
            This partnership is built around one principle: support must translate into
            classroom practice and measurable reading gains, not just activities.
          </p>
          <div className="action-row">
            <HomeSupportRequestModal
              triggerLabel="Fund a Region"
              title="Fund a region request form"
              description="Share your region focus and timeline, and our partnerships team will follow up."
              triggerClassName="button"
              presetMessage="I want to fund a region under the 2-year literacy partnership package."
            />
            <HomeSupportRequestModal
              triggerLabel="Request a Regional Concept Note"
              title="Regional concept note request"
              description="Tell us your region focus and we will prepare a concept note."
              triggerClassName="button button-ghost"
              presetMessage="Please prepare a regional concept note for a 2-year literacy partnership."
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container flow">
          <h2>What you fund</h2>
          <ul>
            <li>
              Targeted support for one region&apos;s literacy improvement cycle over two
              years covering all sub-regions and districts within the region, using a
              consistent evidence-based approach.
            </li>
            <li>
              Your funding strengthens the region as a system: teacher capacity,
              leadership supervision, measurement, and targeted support where gaps remain.
            </li>
          </ul>

          <hr />

          <h2>What happens (over 2 years)</h2>
          {REGION_IMPLEMENTATION.map((item) => (
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

          <h2>What evidence you receive (regional accountability)</h2>
          <p>Regional Evidence Pack (Dashboard + PDF Reports)</p>
          <ul>
            {REGIONAL_EVIDENCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <hr />

          <h2>Assessments, results, and reporting (what you will see)</h2>
          <p>Regional Performance Report shows:</p>
          <ul>
            {REGIONAL_PERFORMANCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>Teaching Quality (Regional Summary) shows:</p>
          <ul>
            {TEACHING_QUALITY.map((item) => (
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
            When you select a region in the funding calculator, NLIP automatically
            calculates the total based on the number of schools in that region. No manual
            calculations are required.
          </p>

          <h2>Ready to sponsor a region?</h2>
          <div className="action-row">
            <HomeSupportRequestModal
              triggerLabel="Fund a Region"
              title="Fund a region request form"
              description="Share your region focus and timeline, and our partnerships team will follow up."
              triggerClassName="button"
              presetMessage="I want to fund a region under the 2-year literacy partnership package."
            />
            <HomeSupportRequestModal
              triggerLabel="Request a Regional Concept Note"
              title="Regional concept note request"
              description="Tell us your region focus and we will prepare a concept note."
              triggerClassName="button button-ghost"
              presetMessage="Please prepare a regional concept note for a 2-year literacy partnership."
            />
          </div>

          <div className="action-row">
            <Link className="button button-ghost" href="/impact/calculator">
              Open Funding Calculator
            </Link>
            <Link className="button button-ghost" href="/sponsor-a-sub-region">
              Sub-Region Package
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
