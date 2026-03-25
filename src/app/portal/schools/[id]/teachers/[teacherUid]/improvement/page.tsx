import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  getSchoolDirectoryRecord,
  getTeacherImprovementProfileAsync,
} from "@/services/dataService";
import { requirePortalStaffUser } from "@/lib/auth";

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
              <table>
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.entries(comparison.domainDeltas) as Array<[string, number | null]>).map(
                    ([domain, delta]) => (
                      <tr key={domain}>
                        <td>{domain}</td>
                        <td>
                          {typeof delta === "number"
                            ? `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`
                            : "Data not available"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

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
