import Image from "next/image";
import Link from "next/link";
import merPhoto from "../../../assets/photos/Literacy Training in Loro - Oyam District.jpg";
import { listPublicImpactReportsAsync } from "@/services/dataService";

export const metadata = {
  title: "Monitoring, Evaluation & Reporting",
  description:
    "NLIP evidence engine for delivery quality, outcomes tracking, and partner-ready accountability from school to national levels.",
};

export const dynamic = "force-dynamic";

export default async function MonitoringEvaluationReportingPage() {
  const publicReports = await listPublicImpactReportsAsync({ limit: 12 });

  return (
    <>
      <section
        className="section tpd-hero-section bg-surface-container"
        style={{ backgroundColor: "var(--md-sys-color-surface-container)" }}
      >
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program Spotlight</p>
            <h1 className="tpd-page-title">Monitoring, Evaluation &amp; Reporting</h1>
            <p className="tpd-subline">
              NLIP&apos;s evidence engine for delivery quality, outcomes, and accountability.
            </p>
            <h2>Overview</h2>
            <p>
              Monitoring, Evaluation &amp; Reporting (MER) is NLIP&apos;s evidence
              engine, built to ensure delivery quality, track outcomes, and
              provide partner-ready accountability at every level of the system.
            </p>
            <p>
              In national literacy work, what matters is not only what was done
              (trainings, visits, materials), but whether those inputs translated
              into better teaching and stronger reading outcomes.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> improvement becomes visible,
              credible, and actionable from school level to national reporting.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={merPhoto}
              alt="Field teams and school leaders reviewing literacy implementation and outcome evidence"
              priority
              sizes="(max-width: 900px) 100vw, 45vw"
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Full Implementation Chain Captured</h3>
            <p>Our platform captures data across the full delivery chain:</p>
            <ul>
              <li>
                Training delivery and attendance by role, gender, class/subject
                taught, and geography
              </li>
              <li>Coaching visits and follow-up actions</li>
              <li>
                Lesson evaluation scores that show fidelity to structured phonics
                routines
              </li>
              <li>
                Learner assessments across sounds, decoding, fluency/CWPM with
                accuracy, and comprehension
              </li>
              <li>1001 Story participation and publishing outputs</li>
            </ul>
          </article>

          <article className="card">
            <h3>Automatic Reading Level Movement Tracking</h3>
            <p>
              The platform automatically computes reading levels and movement over
              time, so schools and partners can see shifts from non-reader to
              fluent bands and identify which domains are improving versus which
              remain bottlenecks.
            </p>
            <p>
              This turns MER from static reporting into practical cycle-by-cycle
              improvement intelligence.
            </p>
          </article>

          <article className="card">
            <h3>MER as National Intelligence</h3>
            <p>
              What makes MER under Ozeki national intelligence is decision-use and
              credibility. Every dashboard and report includes quality indicators
              such as sample size (n), coverage/completeness, and tool/version
              information.
            </p>
            <p>
              This allows users to trust comparisons across schools and districts
              and understand limitations clearly.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Data Quality Controls for Defensible Results</h3>
            <p>
              MER includes data quality checks that reduce errors, prevent missing
              critical fields, and flag unusual patterns for review.
            </p>
            <p>
              The result is evidence that is not only compelling, but defensible
              for government and major funders.
            </p>
          </article>

          <article className="card">
            <h3>School-Level Reporting for Action</h3>
            <p>
              At school level, the platform generates coaching packs and
              headteacher summaries that translate findings into next steps:
            </p>
            <ul>
              <li>Which routines to strengthen</li>
              <li>Which learners need catch-up support</li>
              <li>What to verify in the next supervision/coaching cycle</li>
            </ul>
          </article>

          <article className="card">
            <h3>District and Regional Briefs</h3>
            <p>
              District and regional briefs highlight performance patterns, priority
              support zones, and implementation factors influencing outcomes:
            </p>
            <ul>
              <li>Training coverage</li>
              <li>Coaching intensity</li>
              <li>Teaching quality trends</li>
              <li>Story participation and publishing activity</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>National Quarterly and Annual Reporting</h3>
            <p>
              At national level, NLIP produces quarterly snapshots and annual
              reports showing reach, equity, and progress movement, with clear
              recommendations for scaling what works.
            </p>
          </article>

          <article className="card">
            <h3>Partner and Donor Accountability</h3>
            <p>
              MER connects investment to delivery and results, demonstrates
              progress over time rather than isolated success stories, and supports
              confident decisions about where support should go next.
            </p>
          </article>

          <article className="card">
            <h3>MER Promise</h3>
            <p>
              MER ensures the platform does not only collect data. It turns data
              into credible evidence, strategic action, and sustained literacy
              improvement nationwide.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid-two">
          <article className="card" id="impact-reports">
            <h3>Impact Reports Library</h3>
            <p>
              Public reports are generated from verified data with fact-locked
              narratives and downloadable evidence packs.
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
                    <p>
                      <Link
                        className="inline-download-link"
                        href={`/impact/reports/${report.reportCode}`}
                      >
                        View Report
                      </Link>
                    </p>
                    <p>
                      <a
                        className="inline-download-link"
                        href={`/api/impact-reports/${report.reportCode}/download`}
                      >
                        Download PDF
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card">
            <h3>Explore Related Evidence</h3>
            <p>
              <Link className="inline-download-link" href="/impact">
                Open Live Impact Dashboard
              </Link>
            </p>
            <p>
              <Link className="inline-download-link" href="/impact/reports">
                Open Full Reports Library
              </Link>
            </p>
            <p>
              <Link className="inline-download-link" href="/resources">
                Open Resources Library
              </Link>
            </p>
          </article>

          <article className="card full-width">
            <h3>Partner With MER</h3>
            <p>
              Request an impact report or partner with us to scale transparent,
              evidence-led literacy implementation across Uganda.
            </p>
            <div className="action-row">
              <Link className="button" href="/partner-with-us">
                Partner With Us
              </Link>
              <Link className="button button-ghost" href="/impact/reports">
                Open report library
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
