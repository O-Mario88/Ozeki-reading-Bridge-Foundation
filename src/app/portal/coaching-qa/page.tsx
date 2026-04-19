import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  listActionPlanFollowUpsPostgres,
  getCoachingCycleStatusPostgres,
  getInterRaterReliabilityPostgres,
  getCoachWorkloadPostgres,
  getDistrictCoverageMapPostgres,
} from "@/lib/server/postgres/repositories/coaching-qa";

export const dynamic = "force-dynamic";

function statusClass(s: string): string {
  switch (s) {
    case "overdue":
    case "critical":
    case "high_variance":
    case "overloaded":
    case "no_activity":
      return "coaching-qa-critical";
    case "due_soon":
    case "behind":
    case "moderate_variance":
    case "inactive":
      return "coaching-qa-warning";
    case "upcoming":
    case "on_track":
    case "balanced":
    case "aligned":
      return "coaching-qa-ok";
    case "ahead":
    case "underutilized":
      return "coaching-qa-neutral";
    default:
      return "coaching-qa-muted";
  }
}

export default async function CoachingQaDashboardPage() {
  const user = await requirePortalUser();

  const [followUps, cycleStatus, interRater, workload, coverage] = await Promise.all([
    listActionPlanFollowUpsPostgres({ limit: 30 }),
    getCoachingCycleStatusPostgres({ targetVisitsPerTerm: 4 }),
    getInterRaterReliabilityPostgres({ daysWindow: 90, minObservers: 2 }),
    getCoachWorkloadPostgres({ targetPerCoach: 20 }),
    getDistrictCoverageMapPostgres({}),
  ]);

  const overdueCount = followUps.filter((f) => f.status === "overdue").length;
  const dueSoonCount = followUps.filter((f) => f.status === "due_soon").length;
  const criticalSchools = cycleStatus.filter((s) => s.status === "critical" || s.status === "no_activity").length;
  const flaggedReliability = interRater.filter((r) => r.flag === "high_variance").length;
  const overloadedCoaches = workload.filter((c) => c.utilizationStatus === "overloaded").length;
  const uncoveredDistricts = coverage.filter((d) => d.schoolsVisitedThisTerm === 0).length;

  return (
    <PortalShell user={user} activeHref="/portal/coaching-qa" title="Coaching Quality Assurance" description="Action follow-ups, cycle completion, inter-rater reliability, coach workload, and district coverage.">
      <div className="coaching-qa-root">
        {/* Summary KPIs */}
        <section className="coaching-qa-kpis">
          <article className={overdueCount > 0 ? "is-alert" : ""}>
            <span>Overdue action reviews</span><strong>{overdueCount}</strong>
            <small>{dueSoonCount} due within 7 days</small>
          </article>
          <article className={criticalSchools > 0 ? "is-alert" : ""}>
            <span>Schools behind on coaching</span><strong>{criticalSchools}</strong>
            <small>of {cycleStatus.length} active schools</small>
          </article>
          <article className={flaggedReliability > 0 ? "is-alert" : ""}>
            <span>Inter-rater variance flags</span><strong>{flaggedReliability}</strong>
            <small>{interRater.length} schools with ≥2 observers</small>
          </article>
          <article className={overloadedCoaches > 0 ? "is-alert" : ""}>
            <span>Overloaded coaches</span><strong>{overloadedCoaches}</strong>
            <small>{workload.length} coaches active</small>
          </article>
          <article className={uncoveredDistricts > 0 ? "is-alert" : ""}>
            <span>Uncovered districts</span><strong>{uncoveredDistricts}</strong>
            <small>of {coverage.length} active districts</small>
          </article>
        </section>

        {/* 1. Action Plan Follow-Up Queue */}
        <section className="coaching-qa-section">
          <h2>Action Plan Follow-Ups</h2>
          <p className="text-gray-500 text-sm">
            Observations where the coach agreed an action plan with a review date. Overdue items need immediate attention.
          </p>
          {followUps.length === 0 ? (
            <p className="text-gray-400">No action plans with review dates yet.</p>
          ) : (
            <table className="coaching-qa-table">
              <thead>
                <tr>
                  <th>Review</th>
                  <th>Teacher / School</th>
                  <th>Observer</th>
                  <th>Observation</th>
                  <th>Action agreed</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((f) => (
                  <tr key={f.observationId} className={statusClass(f.status)}>
                    <td>
                      {f.reviewDate ? (
                        <>
                          <strong>{f.reviewDate}</strong><br />
                          <small>
                            {f.daysUntilReview !== null
                              ? f.daysUntilReview < 0
                                ? `${Math.abs(f.daysUntilReview)}d overdue`
                                : `in ${f.daysUntilReview}d`
                              : ""}
                          </small>
                        </>
                      ) : <small className="text-gray-400">no date</small>}
                    </td>
                    <td><strong>{f.teacherName}</strong><br /><small>{f.schoolName}</small></td>
                    <td>{f.coachName ?? "—"}</td>
                    <td><code>{f.observationCode}</code><br /><small>{f.observationDate}</small></td>
                    <td className="coaching-qa-action-text">{f.actionToTake || <small className="text-gray-400">—</small>}</td>
                    <td><span className={`coaching-qa-pill ${statusClass(f.status)}`}>{f.status.replace("_", " ")}</span></td>
                    <td><a href={`/portal/observations/${f.observationId}`}>Open →</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 2. Coaching Cycle Completion */}
        <section className="coaching-qa-section">
          <h2>Coaching Cycle Completion — Schools</h2>
          <p className="text-gray-500 text-sm">
            Target: 4 visits per term per school. Schools falling behind are at risk of losing programme fidelity.
          </p>
          <table className="coaching-qa-table">
            <thead>
              <tr>
                <th>School</th>
                <th>District</th>
                <th>Visits this term</th>
                <th>Progress</th>
                <th>Last visit</th>
                <th>Assigned coach</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cycleStatus.slice(0, 50).map((s) => (
                <tr key={s.schoolId} className={statusClass(s.status)}>
                  <td><a href={`/portal/schools/${s.schoolId}`}><strong>{s.schoolName}</strong></a></td>
                  <td>{s.district}</td>
                  <td>{s.visitsThisTerm} / {s.targetVisitsPerTerm}</td>
                  <td>
                    <div className="coaching-qa-progress">
                      <div className="coaching-qa-progress-bar" style={{ width: `${s.completionPct}%` }} />
                    </div>
                    <small>{s.completionPct}%</small>
                  </td>
                  <td>
                    {s.lastVisitDate ?? <small className="text-gray-400">never</small>}
                    {s.daysSinceLastVisit !== null ? <><br /><small>{s.daysSinceLastVisit}d ago</small></> : null}
                  </td>
                  <td>{s.assignedCoachName ?? <small className="text-gray-400">—</small>}</td>
                  <td><span className={`coaching-qa-pill ${statusClass(s.status)}`}>{s.status.replace("_", " ")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {cycleStatus.length > 50 ? <small className="text-gray-400">Showing first 50 of {cycleStatus.length} schools.</small> : null}
        </section>

        {/* 3. Inter-Rater Reliability */}
        <section className="coaching-qa-section">
          <h2>Inter-Rater Reliability</h2>
          <p className="text-gray-500 text-sm">
            Schools where 2+ observers have visited in the last 90 days. High variance between observers&apos; average scores suggests the team needs calibration.
          </p>
          {interRater.length === 0 ? (
            <p className="text-gray-400">Not enough data yet. Once 2+ observers visit the same school, variance will be computed here.</p>
          ) : (
            <table className="coaching-qa-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Observers</th>
                  <th>Avg score</th>
                  <th>Range</th>
                  <th>Std dev</th>
                  <th>Flag</th>
                </tr>
              </thead>
              <tbody>
                {interRater.map((r) => (
                  <tr key={r.schoolId} className={statusClass(r.flag)}>
                    <td><a href={`/portal/schools/${r.schoolId}`}><strong>{r.schoolName}</strong></a><br /><small>{r.district}</small></td>
                    <td>
                      <strong>{r.observersCount}</strong> across {r.observationsCount} observations<br />
                      <small>{r.observers.map((o) => `${o.observerName} (${o.observationsCount} obs · ★${o.avgScore})`).join(" · ")}</small>
                    </td>
                    <td>{r.avgRubricScore !== null ? `★${r.avgRubricScore}` : "—"}</td>
                    <td>{r.rangeLow !== null && r.rangeHigh !== null ? `${r.rangeLow} – ${r.rangeHigh}` : "—"}</td>
                    <td><strong>{r.stdDevScore ?? "—"}</strong></td>
                    <td><span className={`coaching-qa-pill ${statusClass(r.flag)}`}>{r.flag.replace("_", " ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 4. Coach Workload */}
        <section className="coaching-qa-section">
          <h2>Coach Workload — Term-to-Date</h2>
          <p className="text-gray-500 text-sm">
            Target: 20 visits per coach per term. Rebalance overloaded coaches; activate those under-utilised.
          </p>
          <table className="coaching-qa-table">
            <thead>
              <tr>
                <th>Coach</th>
                <th>Visits</th>
                <th>Observations</th>
                <th>Schools</th>
                <th>Districts</th>
                <th>Avg score given</th>
                <th>Last visit</th>
                <th>Utilisation</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((c) => (
                <tr key={c.coachUserId} className={statusClass(c.utilizationStatus)}>
                  <td><strong>{c.coachName}</strong><br /><small>{c.email ?? ""}</small></td>
                  <td>{c.visitsThisTerm}</td>
                  <td>{c.observationsThisTerm}</td>
                  <td>{c.schoolsCovered}</td>
                  <td>{c.districtsCovered}</td>
                  <td>{c.avgRubricScoreGiven !== null ? `★${c.avgRubricScoreGiven}` : "—"}</td>
                  <td>{c.lastVisitDate ?? <small className="text-gray-400">—</small>}</td>
                  <td><span className={`coaching-qa-pill ${statusClass(c.utilizationStatus)}`}>{c.utilizationStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 5. District Coverage */}
        <section className="coaching-qa-section">
          <h2>District Coverage Map</h2>
          <p className="text-gray-500 text-sm">
            Uncovered districts have zero coaching visits this term. Prioritise coach reassignment.
          </p>
          <table className="coaching-qa-table">
            <thead>
              <tr>
                <th>District</th>
                <th>Region</th>
                <th>Schools</th>
                <th>Visited</th>
                <th>Coverage</th>
                <th>Coaches</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((d) => (
                <tr key={`${d.district}-${d.region}`} className={d.schoolsVisitedThisTerm === 0 ? "coaching-qa-critical" : d.coveragePct < 40 ? "coaching-qa-warning" : ""}>
                  <td><strong>{d.district}</strong></td>
                  <td>{d.region}</td>
                  <td>{d.schoolsTotal}</td>
                  <td>{d.schoolsVisitedThisTerm}</td>
                  <td>
                    <div className="coaching-qa-progress">
                      <div className="coaching-qa-progress-bar" style={{ width: `${d.coveragePct}%` }} />
                    </div>
                    <small>{d.coveragePct}%</small>
                  </td>
                  <td>{d.coachNames.length > 0 ? d.coachNames.join(", ") : <small className="text-gray-400">none assigned</small>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </PortalShell>
  );
}
