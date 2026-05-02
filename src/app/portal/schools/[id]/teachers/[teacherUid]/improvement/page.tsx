import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import {
  getSchoolDirectoryRecord,
  getTeacherImprovementProfileAsync,
} from "@/services/dataService";
import { requirePortalStaffUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { getTeacherObservationTrajectoryPostgres } from "@/lib/server/postgres/repositories/coaching-qa";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
    teacherUid: string;
  }>;
}

export default async function TeacherImprovementPage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { id: schoolIdRaw, teacherUid: teacherUidRaw } = await params;
  const schoolId = Number(schoolIdRaw);
  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    notFound();
  }

  const school = await getSchoolDirectoryRecord(schoolId);
  if (!school) {
    notFound();
  }

  const teacherUid = decodeURIComponent(teacherUidRaw);
  const profile = await getTeacherImprovementProfileAsync({
    schoolId,
    teacherUid,
  });

  const comparison = profile?.teacherComparison;

  // Resolve teacher's display name so we can fetch observation trajectory
  const teacherLookup = await queryPostgres(
    `SELECT full_name FROM teacher_roster WHERE teacher_uid = $1 LIMIT 1`,
    [teacherUid],
  ).catch(() => ({ rows: [] as Array<{ full_name: string }> }));
  const teacherName = teacherLookup.rows[0]?.full_name
    ?? comparison?.teacherName
    ?? teacherUid;
  const observationTrajectory = await getTeacherObservationTrajectoryPostgres({
    teacherName,
    schoolId,
  });

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools"
      title="Teacher Improvement"
      description={`${school.name} • Baseline vs subsequent coaching visits`}
      actions={
        <div className="action-row">
          <Link href={`/portal/schools/${schoolId}`} className="button button-ghost">
            Back To School
          </Link>
        </div>
      }
    >
      <section className="card" style={{ display: "grid", gap: "1rem" }}>
        {!comparison ? (
          <p>
            Data not available. This teacher needs at least two lesson evaluations to compare
            baseline against follow-up visits.
          </p>
        ) : (
          <>
            <header style={{ display: "grid", gap: "0.4rem" }}>
              <h2 style={{ margin: 0 }}>{comparison.teacherName}</h2>
              <p style={{ margin: 0 }}>
                Baseline: {comparison.firstEvaluationDate} • Comparison:{" "}
                {comparison.comparisonEvaluationDate} • Latest: {comparison.latestEvaluationDate}
              </p>
            </header>

            <div className="portal-school-profile-kpis">
              <article>
                <span>Baseline Overall</span>
                <strong>{comparison.overallScoreBaseline.toFixed(2)}/4</strong>
              </article>
              <article>
                <span>Comparison Overall</span>
                <strong>{comparison.overallScoreComparison.toFixed(2)}/4</strong>
              </article>
              <article>
                <span>Delta Overall</span>
                <strong>
                  {comparison.deltaOverall > 0 ? "+" : ""}
                  {comparison.deltaOverall.toFixed(2)}
                </strong>
              </article>
              <article>
                <span>Status</span>
                <strong>{comparison.improvementStatus}</strong>
              </article>
            </div>

            <div className="table-wrap">
              <DashboardListHeader template="minmax(0,1.6fr) 160px">
                <span>Domain</span>
                <span>Delta</span>
              </DashboardListHeader>
              {(Object.entries(comparison.domainDeltas) as Array<[string, number | null]>).map(
                ([domain, delta]) => (
                  <DashboardListRow
                    key={domain}
                    template="minmax(0,1.6fr) 160px"
                  >
                    <span className="truncate">{domain}</span>
                    <span>
                      {typeof delta === "number"
                        ? `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`
                        : "Data not available"}
                    </span>
                  </DashboardListRow>
                ),
              )}
            </div>

            {observationTrajectory.points.length > 0 && (
              <article className="card" style={{ display: "grid", gap: "0.75rem" }}>
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <h3 style={{ margin: 0 }}>Observation Rubric Trajectory</h3>
                  <span className={`coaching-qa-pill coaching-qa-${observationTrajectory.trajectoryBand === "improving" ? "ok" : observationTrajectory.trajectoryBand === "declining" ? "critical" : observationTrajectory.trajectoryBand === "stable" ? "neutral" : "muted"}`}>
                    {observationTrajectory.trajectoryBand.replace("_", " ")}
                  </span>
                </header>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
                  {observationTrajectory.totalObservations} observations from {observationTrajectory.firstObservationDate} to {observationTrajectory.latestObservationDate}.
                  {observationTrajectory.overallDelta !== null ? ` Overall rubric score changed by ${observationTrajectory.overallDelta > 0 ? "+" : ""}${observationTrajectory.overallDelta} points.` : ""}
                </p>
                <div className="portal-school-profile-kpis">
                  <article>
                    <span>GPC Δ</span>
                    <strong>{observationTrajectory.gpcDelta !== null ? `${observationTrajectory.gpcDelta > 0 ? "+" : ""}${observationTrajectory.gpcDelta}` : "—"}</strong>
                  </article>
                  <article>
                    <span>Blending Δ</span>
                    <strong>{observationTrajectory.blendingDelta !== null ? `${observationTrajectory.blendingDelta > 0 ? "+" : ""}${observationTrajectory.blendingDelta}` : "—"}</strong>
                  </article>
                  <article>
                    <span>Engagement Δ</span>
                    <strong>{observationTrajectory.engagementDelta !== null ? `${observationTrajectory.engagementDelta > 0 ? "+" : ""}${observationTrajectory.engagementDelta}` : "—"}</strong>
                  </article>
                  <article>
                    <span>Overall Δ</span>
                    <strong>{observationTrajectory.overallDelta !== null ? `${observationTrajectory.overallDelta > 0 ? "+" : ""}${observationTrajectory.overallDelta}` : "—"}</strong>
                  </article>
                </div>
                <div className="table-wrap">
                  <DashboardListHeader template="120px minmax(0,1.2fr) minmax(0,1.4fr) 70px 80px 100px 80px 110px">
                    <span>Date</span>
                    <span>Observer</span>
                    <span>Focus</span>
                    <span>GPC</span>
                    <span>Blending</span>
                    <span>Engagement</span>
                    <span>Overall</span>
                    <span>Rating</span>
                  </DashboardListHeader>
                  {observationTrajectory.points.map((p) => (
                    <DashboardListRow
                      key={p.observationId}
                      template="120px minmax(0,1.2fr) minmax(0,1.4fr) 70px 80px 100px 80px 110px"
                    >
                      <span><Link href={`/portal/observations/${p.observationId}`}>{p.observationDate}</Link></span>
                      <span className="truncate">{p.observerName}</span>
                      <span className="truncate">{p.lessonFocus}</span>
                      <span>{p.gpcAvg ?? "—"}</span>
                      <span>{p.blendingAvg ?? "—"}</span>
                      <span>{p.engagementAvg ?? "—"}</span>
                      <span><strong>{p.overallAvg ?? "—"}</strong></span>
                      <span>
                        {p.overallRating ? (
                          <span className={`coaching-qa-pill coaching-qa-${p.overallRating === "fidelity" ? "ok" : p.overallRating === "partial" ? "warning" : "critical"}`}>
                            {p.overallRating}
                          </span>
                        ) : "—"}
                      </span>
                    </DashboardListRow>
                  ))}
                </div>
              </article>
            )}

            {profile && (
              <>
                <article className="card" style={{ display: "grid", gap: "0.5rem" }}>
                  <h3 style={{ margin: 0 }}>Recommended Next Support</h3>
                  <p style={{ margin: 0 }}>
                    Status: {profile.teacherSupportStatus ?? "Data not available"}
                  </p>
                  <p style={{ margin: 0 }}>
                    Action: {profile.teacherSupportAction ?? "No action recommendation yet."}
                  </p>
                </article>

                <article className="card" style={{ display: "grid", gap: "0.5rem" }}>
                  <h3 style={{ margin: 0 }}>Teaching → Learning Alignment</h3>
                  <p style={{ margin: 0 }}>
                    Teaching quality delta:{" "}
                    {profile.alignment.summary.teachingDelta ?? "Data not available"} • Non-reader
                    reduction: {profile.alignment.summary.nonReaderReductionPp ?? "Data not available"}{" "}
                    pp • 20+ CWPM delta:{" "}
                    {profile.alignment.summary.cwpm20PlusDeltaPp ?? "Data not available"} pp • 1001
                    story sessions (latest): {profile.alignment.summary.storySessionsLatest}
                  </p>
                  <p style={{ margin: 0 }}>{profile.alignment.caveat}</p>
                </article>
              </>
            )}
          </>
        )}
      </section>
    </PortalShell>
  );
}
