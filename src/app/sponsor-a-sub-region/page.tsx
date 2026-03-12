import Link from "next/link";
import { HomeSupportRequestModal } from "@/components/home/HomeSupportRequestModal";

export const metadata = {
  title: "Sponsor Literacy in a Sub-Region",
  description:
    "Fund a two-year sub-region literacy partnership with coaching, assessments, leadership support, and NLIP evidence reporting.",
};

const SUPPORT_AREAS = [
  {
    title: "1) School support visits (implementation follow-through)",
    points: [
      "Schools receive repeated coaching support through structured visits each year.",
      "Phonics lesson observation and coaching",
      "Demonstration lessons where implementation has not started",
      "Teacher mentoring, feedback, and improvement plans",
      "Leadership support to protect reading time and supervise teaching routines",
    ],
  },
  {
    title: "2) Four assessment rounds (evidence of progress)",
    points: [
      "The sub-region completes four assessment rounds across two years.",
      "Baseline -> Progress checks -> Endline",
      "Improvement is tracked, gaps are identified early, and support is targeted.",
    ],
  },
  {
    title: "3) Leadership strengthening at scale",
    points: [
      "Headteachers and Directors of Studies are supported to monitor reading instruction regularly.",
      "Leaders use learner data to make decisions.",
      "Schools sustain routines beyond external support.",
    ],
  },
  {
    title: "4) Targeted remedial and catch-up activation",
    points: [
      "Where results show high proportions of non-readers or weak decoding, NLIP triggers structured remedial and catch-up support.",
      "This ensures the weakest schools improve, not only the strongest.",
    ],
  },
];

const ACCOUNTABILITY_EVIDENCE = [
  "Assessment results and reading level movement (by district and sub-county)",
  "Teacher evaluation results (teaching quality by domain, improvement over time, aggregated)",
  "Coverage and completeness indicators (n assessed, % coverage, tool version, last updated)",
  "Early warning flags for districts and sub-counties needing intensified support",
  "Priority recommendations (REC-mapped) for next actions by geography",
];

const REPORTING_VIEWS = [
  "District and sub-county performance comparisons",
  "Areas improving (what is working and where)",
  "Areas needing support (where non-readers remain high or teaching quality is weak)",
  "Recommended interventions and follow-up priorities",
];

const TEACHING_QUALITY_VIEWS = [
  "Teaching quality averages by domain",
  "Improvement from baseline to follow-ups",
  "Proportion of teachers needing coaching vs refresher catch-up training (aggregated)",
];

export default function SponsorSubRegionPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Sub-region partnership package</p>
          <h1>Sponsor Literacy in a Sub-Region (2-Year Partnership)</h1>
          <p>
            Targeted, measurable literacy improvement across one sub-region powered by
            NLIP.
          </p>
          <p>
            A sub-region partnership funds a complete two-year literacy improvement cycle
            across every school in the selected sub-region. It is ideal for partners who
            want focus and depth while generating credible evidence that can guide
            district leaders and attract further investment.
          </p>
          <p>
            This is structured support with follow-through: train -&gt; coach -&gt;
            assess -&gt; improve -&gt; verify, repeated consistently until strong
            reading instruction becomes routine in classrooms.
          </p>
          <div className="action-row">
            <HomeSupportRequestModal
              triggerLabel="Fund a Sub-Region"
              title="Fund a sub-region request form"
              description="Share your sub-region focus and timeline, and our partnerships team will follow up."
              triggerClassName="button"
              presetMessage="I want to fund a sub-region under the 2-year literacy partnership package."
            />
            <HomeSupportRequestModal
              triggerLabel="Request a Sub-Region Concept Note"
              title="Sub-region concept note request"
              description="Tell us your sub-region focus and we will prepare a concept note."
              triggerClassName="button button-ghost"
              presetMessage="Please prepare a sub-region concept note for a 2-year literacy partnership."
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container flow">
          <h2>What you fund</h2>
          <ul>
            <li>
              Targeted support for one sub-region&apos;s literacy improvement cycle over
              two years, including implementation support across its districts and
              sub-counties.
            </li>
            <li>
              Your funding strengthens the entire literacy system in that sub-region so
              improvement is coordinated, measurable, and sustainable.
            </li>
          </ul>

          <hr />

          <h2>What happens (over 2 years)</h2>
          {SUPPORT_AREAS.map((area) => (
            <div key={area.title}>
              <h3>{area.title}</h3>
              <ul>
                {area.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}

          <hr />

          <h2>What evidence you receive (sub-region accountability)</h2>
          <p>Sub-Region Evidence Pack (Dashboard + PDF Reports)</p>
          <ul>
            {ACCOUNTABILITY_EVIDENCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <hr />

          <h2>Assessments, results, and reporting (what you will see)</h2>
          <p>Sub-Region Performance Report shows:</p>
          <ul>
            {REPORTING_VIEWS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>Teaching Quality Summary (Sub-Region) shows:</p>
          <ul>
            {TEACHING_QUALITY_VIEWS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            Progress snapshots are available quarterly or termly. All reports include
            credibility markers: sample size (n), completeness, tool version, and last
            updated.
          </p>

          <hr />

          <h2>How costing works (kept simple)</h2>
          <ul>
            <li>$1,100 per school for the full 2-year support cycle</li>
          </ul>
          <p>
            When you select a sub-region in the funding calculator, NLIP automatically
            calculates the total based on the number of schools in that sub-region. No
            manual calculations are required.
          </p>

          <h2>Ready to sponsor a sub-region?</h2>
          <div className="action-row">
            <HomeSupportRequestModal
              triggerLabel="Fund a Sub-Region"
              title="Fund a sub-region request form"
              description="Share your sub-region focus and timeline, and our partnerships team will follow up."
              triggerClassName="button"
              presetMessage="I want to fund a sub-region under the 2-year literacy partnership package."
            />
            <HomeSupportRequestModal
              triggerLabel="Request a Sub-Region Concept Note"
              title="Sub-region concept note request"
              description="Tell us your sub-region focus and we will prepare a concept note."
              triggerClassName="button button-ghost"
              presetMessage="Please prepare a sub-region concept note for a 2-year literacy partnership."
            />
          </div>

          <div className="action-row">
            <Link className="button button-ghost" href="/impact/calculator">
              Open Funding Calculator
            </Link>
            <Link className="button button-ghost" href="/sponsor-a-district">
              District Package
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
