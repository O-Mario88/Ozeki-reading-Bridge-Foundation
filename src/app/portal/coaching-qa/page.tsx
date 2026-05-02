import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
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
            <div className="coaching-qa-table">
              <DashboardListHeader template="120px minmax(0,1.2fr) 110px 130px minmax(0,1.6fr) 110px 70px">
                <span>Review</span>
                <span>Teacher / School</span>
                <span>Observer</span>
                <span>Observation</span>
                <span>Action agreed</span>
                <span>Status</span>
                <span />
              </DashboardListHeader>
              {followUps.map((f) => (
                <DashboardListRow
                  key={f.observationId}
                  template="120px minmax(0,1.2fr) 110px 130px minmax(0,1.6fr) 110px 70px"
                  className={statusClass(f.status)}
                >
                  <span>
                    {f.reviewDate ? (
                      <>
                        <strong className="block">{f.reviewDate}</strong>
                        <small>
                          {f.daysUntilReview !== null
                            ? f.daysUntilReview < 0
                              ? `${Math.abs(f.daysUntilReview)}d overdue`
                              : `in ${f.daysUntilReview}d`
                            : ""}
                        </small>
                      </>
                    ) : <small className="text-gray-400">no date</small>}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate">{f.teacherName}</strong>
                    <small className="block truncate">{f.schoolName}</small>
                  </span>
                  <span className="truncate">{f.coachName ?? "—"}</span>
                  <span className="min-w-0">
                    <code className="block truncate">{f.observationCode}</code>
                    <small>{f.observationDate}</small>
                  </span>
                  <span className="coaching-qa-action-text truncate">{f.actionToTake || <small className="text-gray-400">—</small>}</span>
                  <span><span className={`coaching-qa-pill ${statusClass(f.status)}`}>{f.status.replace("_", " ")}</span></span>
                  <span><a href={`/portal/observations/${f.observationId}`}>Open →</a></span>
                </DashboardListRow>
              ))}
            </div>
          )}
        </section>

        {/* 2. Coaching Cycle Completion */}
        <section className="coaching-qa-section">
          <h2>Coaching Cycle Completion — Schools</h2>
          <p className="text-gray-500 text-sm">
            Target: 4 visits per term per school. Schools falling behind are at risk of losing programme fidelity.
          </p>
          <div className="coaching-qa-table">
            <DashboardListHeader template="minmax(0,1.4fr) minmax(0,1fr) 110px 140px 130px minmax(0,1fr) 110px">
              <span>School</span>
              <span>District</span>
              <span>Visits this term</span>
              <span>Progress</span>
              <span>Last visit</span>
              <span>Assigned coach</span>
              <span>Status</span>
            </DashboardListHeader>
            {cycleStatus.slice(0, 50).map((s) => (
              <DashboardListRow
                key={s.schoolId}
                template="minmax(0,1.4fr) minmax(0,1fr) 110px 140px 130px minmax(0,1fr) 110px"
                className={statusClass(s.status)}
              >
                <span className="min-w-0"><a href={`/portal/schools/${s.schoolId}`}><strong className="truncate inline-block max-w-full">{s.schoolName}</strong></a></span>
                <span className="truncate">{s.district}</span>
                <span>{s.visitsThisTerm} / {s.targetVisitsPerTerm}</span>
                <span>
                  <span className="coaching-qa-progress block">
                    <span className="coaching-qa-progress-bar block" style={{ width: `${s.completionPct}%` }} />
                  </span>
                  <small>{s.completionPct}%</small>
                </span>
                <span>
                  {s.lastVisitDate ?? <small className="text-gray-400">never</small>}
                  {s.daysSinceLastVisit !== null ? <small className="block">{s.daysSinceLastVisit}d ago</small> : null}
                </span>
                <span className="truncate">{s.assignedCoachName ?? <small className="text-gray-400">—</small>}</span>
                <span><span className={`coaching-qa-pill ${statusClass(s.status)}`}>{s.status.replace("_", " ")}</span></span>
              </DashboardListRow>
            ))}
          </div>
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
            <div className="coaching-qa-table">
              <DashboardListHeader template="minmax(0,1.4fr) minmax(0,2fr) 100px 120px 90px 130px">
                <span>School</span>
                <span>Observers</span>
                <span>Avg score</span>
                <span>Range</span>
                <span>Std dev</span>
                <span>Flag</span>
              </DashboardListHeader>
              {interRater.map((r) => (
                <DashboardListRow
                  key={r.schoolId}
                  template="minmax(0,1.4fr) minmax(0,2fr) 100px 120px 90px 130px"
                  className={statusClass(r.flag)}
                >
                  <span className="min-w-0">
                    <a href={`/portal/schools/${r.schoolId}`}><strong className="block truncate">{r.schoolName}</strong></a>
                    <small className="block truncate">{r.district}</small>
                  </span>
                  <span className="min-w-0">
                    <span className="block"><strong>{r.observersCount}</strong> across {r.observationsCount} observations</span>
                    <small className="block truncate">{r.observers.map((o) => `${o.observerName} (${o.observationsCount} obs · ★${o.avgScore})`).join(" · ")}</small>
                  </span>
                  <span>{r.avgRubricScore !== null ? `★${r.avgRubricScore}` : "—"}</span>
                  <span>{r.rangeLow !== null && r.rangeHigh !== null ? `${r.rangeLow} – ${r.rangeHigh}` : "—"}</span>
                  <span><strong>{r.stdDevScore ?? "—"}</strong></span>
                  <span><span className={`coaching-qa-pill ${statusClass(r.flag)}`}>{r.flag.replace("_", " ")}</span></span>
                </DashboardListRow>
              ))}
            </div>
          )}
        </section>

        {/* 4. Coach Workload */}
        <section className="coaching-qa-section">
          <h2>Coach Workload — Term-to-Date</h2>
          <p className="text-gray-500 text-sm">
            Target: 20 visits per coach per term. Rebalance overloaded coaches; activate those under-utilised.
          </p>
          <div className="coaching-qa-table">
            <DashboardListHeader template="minmax(0,1.4fr) 80px 110px 80px 90px 110px 130px 130px">
              <span>Coach</span>
              <span>Visits</span>
              <span>Observations</span>
              <span>Schools</span>
              <span>Districts</span>
              <span>Avg score given</span>
              <span>Last visit</span>
              <span>Utilisation</span>
            </DashboardListHeader>
            {workload.map((c) => (
              <DashboardListRow
                key={c.coachUserId}
                template="minmax(0,1.4fr) 80px 110px 80px 90px 110px 130px 130px"
                className={statusClass(c.utilizationStatus)}
              >
                <span className="min-w-0">
                  <strong className="block truncate">{c.coachName}</strong>
                  <small className="block truncate">{c.email ?? ""}</small>
                </span>
                <span>{c.visitsThisTerm}</span>
                <span>{c.observationsThisTerm}</span>
                <span>{c.schoolsCovered}</span>
                <span>{c.districtsCovered}</span>
                <span>{c.avgRubricScoreGiven !== null ? `★${c.avgRubricScoreGiven}` : "—"}</span>
                <span>{c.lastVisitDate ?? <small className="text-gray-400">—</small>}</span>
                <span><span className={`coaching-qa-pill ${statusClass(c.utilizationStatus)}`}>{c.utilizationStatus}</span></span>
              </DashboardListRow>
            ))}
          </div>
        </section>

        {/* 5. District Coverage */}
        <section className="coaching-qa-section">
          <h2>District Coverage Map</h2>
          <p className="text-gray-500 text-sm">
            Uncovered districts have zero coaching visits this term. Prioritise coach reassignment.
          </p>
          <div className="coaching-qa-table">
            <DashboardListHeader template="minmax(0,1.4fr) minmax(0,1fr) 90px 90px 140px minmax(0,1.4fr)">
              <span>District</span>
              <span>Region</span>
              <span>Schools</span>
              <span>Visited</span>
              <span>Coverage</span>
              <span>Coaches</span>
            </DashboardListHeader>
            {coverage.map((d) => (
              <DashboardListRow
                key={`${d.district}-${d.region}`}
                template="minmax(0,1.4fr) minmax(0,1fr) 90px 90px 140px minmax(0,1.4fr)"
                className={d.schoolsVisitedThisTerm === 0 ? "coaching-qa-critical" : d.coveragePct < 40 ? "coaching-qa-warning" : ""}
              >
                <span className="truncate"><strong>{d.district}</strong></span>
                <span className="truncate">{d.region}</span>
                <span>{d.schoolsTotal}</span>
                <span>{d.schoolsVisitedThisTerm}</span>
                <span>
                  <span className="coaching-qa-progress block">
                    <span className="coaching-qa-progress-bar block" style={{ width: `${d.coveragePct}%` }} />
                  </span>
                  <small>{d.coveragePct}%</small>
                </span>
                <span className="truncate">{d.coachNames.length > 0 ? d.coachNames.join(", ") : <small className="text-gray-400">none assigned</small>}</span>
              </DashboardListRow>
            ))}
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
