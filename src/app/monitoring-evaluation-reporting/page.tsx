import Image from "next/image";
import Link from "next/link";
import merPhoto from "../../../assets/photos/Phonics training in Alebtong.jpg";
import { listPublicImpactReports } from "@/lib/db";

export const metadata = {
  title: "Monitoring, Evaluation & Reporting",
  description:
    "Data systems that prove impact, strengthen delivery, and build partner confidence.",
};

export const dynamic = "force-dynamic";

export default function MonitoringEvaluationReportingPage() {
  const publicReports = listPublicImpactReports({ limit: 12 });

  return (
    <>
      <section className="section tpd-hero-section">
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program spotlight</p>
            <h1 className="tpd-page-title">Monitoring, Evaluation &amp; Reporting</h1>
            <p className="tpd-subline">
              Data systems that prove impact, strengthen delivery, and build
              partner confidence.
            </p>
            <h2>Overview</h2>
            <p>
              Good intentions are not enough; partners need evidence. Our
              Monitoring, Evaluation &amp; Reporting (MER) system tracks what was
              delivered, what changed, and what needs improvement.
            </p>
            <p>
              We combine classroom monitoring, assessment data, and implementation
              evidence to produce partner-ready reports that are clear, credible,
              and decision-focused.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> Partners get accountability,
              transparency, and credible evidence of results.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={merPhoto}
              alt="Literacy facilitators and school staff reviewing implementation and outcome data"
              priority
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>What We Monitor (Focus Areas)</h2>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>1) Program Monitoring (Did the work happen as planned?)</h3>
              <p>
                We track implementation across training, coaching, assessments, and
                materials distribution to ensure delivery quality and consistency.
              </p>
              <p>What we monitor:</p>
              <ul>
                <li>Schools reached and sessions delivered</li>
                <li>Teacher participation and completion</li>
                <li>Coaching visit schedules and follow-through</li>
                <li>Availability and use of teaching aids/materials</li>
                <li>Fidelity to classroom phonics routines</li>
              </ul>
              <p>
                <strong>Why it matters:</strong> Programs move from planned
                activities to verifiable delivery.
              </p>
            </article>

            <article className="card">
              <h3>2) Data Quality (Is the information trustworthy?)</h3>
              <p>
                We strengthen reliability through simple, disciplined data quality
                processes.
              </p>
              <p>How we ensure quality:</p>
              <ul>
                <li>Standardized tools (same rubrics and formats)</li>
                <li>Enumerator and assessor calibration</li>
                <li>Spot-check and verification visits</li>
                <li>Clean data capture templates</li>
                <li>Data review rules for outliers and consistency</li>
              </ul>
              <p>
                <strong>Why it matters:</strong> Partners trust results when data
                quality is clear and controlled.
              </p>
            </article>

            <article className="card">
              <h3>3) Evidence Synthesis (What does it mean?)</h3>
              <p>
                We do not just collect numbers; we turn data into insights and
                actions.
              </p>
              <p>What we synthesize:</p>
              <ul>
                <li>Teacher practice change trends</li>
                <li>Learner reading progress and fluency/comprehension shifts</li>
                <li>Implementation strengths and bottlenecks</li>
                <li>Next-cycle recommendations</li>
              </ul>
              <p>
                <strong>Why it matters:</strong> Evidence becomes a tool for
                improvement, not paperwork.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Outputs (What Partners Receive)</h3>
            <p>1) Partner-Ready Reports:</p>
            <ul>
              <li>Coverage and completeness of activities delivered</li>
              <li>Teaching practice quality indicators</li>
              <li>Learner outcomes from baseline to endline (where applicable)</li>
              <li>Lessons learned, risks, and mitigation actions</li>
              <li>Next-cycle plan and recommendations</li>
            </ul>
            <p>Formats can include PDF reports, slide summaries, and dashboards.</p>
          </article>

          <article className="card">
            <h3>Learning Briefs + Action Recommendations</h3>
            <p>Learning briefs (1 to 3 pages):</p>
            <ul>
              <li>What worked and why</li>
              <li>What did not work and why</li>
              <li>Recommended adjustments</li>
              <li>Success stories and implementation examples</li>
            </ul>
            <p>Decision-ready recommendations:</p>
            <ul>
              <li>Grades/skills needing intensified coaching</li>
              <li>Routines to standardize across schools</li>
              <li>Material deployment priorities</li>
              <li>Schools requiring additional support</li>
              <li>Indicators for next cycle measurement</li>
            </ul>
          </article>

          <article className="card">
            <h3>What We Measure (Example Indicators)</h3>
            <p>Delivery indicators:</p>
            <ul>
              <li>Schools supported, teachers trained, coaching visits completed</li>
              <li>Percent of planned activities delivered on time</li>
              <li>Percent of schools implementing reading timetable/routines</li>
            </ul>
            <p>Quality indicators:</p>
            <ul>
              <li>Percent teachers meeting minimum lesson-rubric quality</li>
              <li>Teacher practice score improvement across coaching cycles</li>
            </ul>
            <p>Learning outcome indicators:</p>
            <ul>
              <li>Percent learners mastering letter-sound knowledge</li>
              <li>Decoding accuracy improvement</li>
              <li>Fluency improvement (words correct per minute)</li>
              <li>Comprehension improvement (grade-appropriate)</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card" id="impact-reports">
            <h3>Impact Reports Library</h3>
            <p>
              All donor and partner reports are now accessed through this M&amp;E
              page. Each report is generated from verified data with a
              facts-locked narrative.
            </p>
            <p className="meta-line">
              FY reporting follows Uganda school-calendar sessions (Term I-III): 01 February to 30 November.
            </p>
            {publicReports.length === 0 ? (
              <p className="meta-line">No public reports available yet.</p>
            ) : (
              <ul>
                {publicReports.map((report) => (
                  <li key={report.reportCode}>
                    <strong>{report.title}</strong>
                    <br />
                    <span className="meta-line">
                      {report.reportType} | {report.scopeType}: {report.scopeValue}
                    </span>
                    <div className="action-row">
                      <Link className="button button-ghost" href={`/impact/reports/${report.reportCode}`}>
                        View
                      </Link>
                      <a className="button" href={`/api/impact-reports/${report.reportCode}/download`}>
                        Download PDF
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card">
            <h3>Website Downloads (Buttons)</h3>
            <ul>
              <li>Download Sample Partner Report (PDF)</li>
              <li>Download Learning Brief Template (PDF/Word)</li>
              <li>Download Classroom Observation Rubric (PDF)</li>
              <li>Download Assessment Summary Template (Excel)</li>
              <li>Download MER Indicator Menu (PDF)</li>
              <li>Download Action Plan Template (Word)</li>
            </ul>
          </article>

          <article className="card">
            <h3>Primary CTA</h3>
            <p>
              Request an impact report or partner with us to scale evidence-led
              literacy implementation.
            </p>
            <div className="action-row">
              <Link className="button" href="/partner">
                Request an Impact Report / Partner With Us
              </Link>
              <Link className="button button-ghost" href="/impact/reports">
                Open report library
              </Link>
            </div>
          </article>

          <article className="card">
            <h3>Outcome</h3>
            <p>
              Partners get accountability, transparency, and credible evidence of
              results, and programs continuously improve because decisions are
              guided by real classroom and learner data.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
