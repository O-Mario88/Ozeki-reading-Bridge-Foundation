import type { PublicTeachingQualitySummary } from "@/lib/types";

type TeacherEvaluationPerformanceCardsProps = {
  scopeLabel: string;
  teachingQuality: PublicTeachingQualitySummary;
};

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Data not available";
  }
  return `${value.toFixed(1)}%`;
}

export function TeacherEvaluationPerformanceCards({
  scopeLabel,
  teachingQuality,
}: TeacherEvaluationPerformanceCardsProps) {
  return (
    <article className="card" style={{ padding: "1.5rem" }}>
      <h3 style={{ marginTop: 0 }}>Teacher Evaluation Performance</h3>
      <p className="impact-mini-footer" style={{ marginTop: "-0.2rem" }}>
        Scope: {scopeLabel}
      </p>

      {teachingQuality.evaluationsCount > 0 ? (
        <div className="impact-teaching-quality-grid">
          <article className="impact-domain-mini-card">
            <h4>Evaluation Volume</h4>
            <p>
              <strong>{teachingQuality.evaluationsCount.toLocaleString()}</strong>
            </p>
            <p className="impact-domain-mini-meta">
              Avg score:{" "}
              {teachingQuality.avgOverallScore !== null
                ? `${teachingQuality.avgOverallScore.toFixed(2)}/4`
                : "Data not available"}
            </p>
            <p className="impact-domain-mini-meta">
              Updated: {new Date(teachingQuality.lastUpdated).toLocaleDateString("en-GB")}
            </p>
          </article>

          <article className="impact-domain-mini-card">
            <h4>Overall Levels</h4>
            <p className="impact-domain-mini-meta">
              Strong: <strong>{teachingQuality.levelDistribution.strong.percent}%</strong>
            </p>
            <p className="impact-domain-mini-meta">
              Good: <strong>{teachingQuality.levelDistribution.good.percent}%</strong>
            </p>
            <p className="impact-domain-mini-meta">
              Developing:{" "}
              <strong>{teachingQuality.levelDistribution.developing.percent}%</strong>
            </p>
            <p className="impact-domain-mini-meta">
              Needs support:{" "}
              <strong>{teachingQuality.levelDistribution.needsSupport.percent}%</strong>
            </p>
          </article>

          <article className="impact-domain-mini-card">
            <h4>Improvement Snapshot</h4>
            <p className="impact-domain-mini-meta">
              Teachers improved: <strong>{formatPercent(teachingQuality.improvedTeachersPercent)}</strong>
            </p>
            <p className="impact-domain-mini-meta">
              Schools improving: <strong>{formatPercent(teachingQuality.schoolsImprovedPercent)}</strong>
            </p>
            <p className="impact-domain-mini-meta">
              Avg delta:{" "}
              <strong>
                {teachingQuality.deltaOverall !== null
                  ? `${teachingQuality.deltaOverall > 0 ? "+" : ""}${teachingQuality.deltaOverall.toFixed(2)}`
                  : "Data not available"}
              </strong>
            </p>
          </article>

          <article className="impact-domain-mini-card">
            <h4>Domain Averages (/4)</h4>
            <p className="impact-domain-mini-meta">
              Setup & Review:{" "}
              <strong>{teachingQuality.domainAverages.setup?.toFixed(2) ?? "N/A"}</strong>
            </p>
            <p className="impact-domain-mini-meta">
              New Sound/Skill:{" "}
              <strong>{teachingQuality.domainAverages.newSound?.toFixed(2) ?? "N/A"}</strong>
            </p>
            <p className="impact-domain-mini-meta">
              Decoding: <strong>{teachingQuality.domainAverages.decoding?.toFixed(2) ?? "N/A"}</strong>
            </p>
            <p className="impact-domain-mini-meta">
              Reading Practice:{" "}
              <strong>{teachingQuality.domainAverages.readingPractice?.toFixed(2) ?? "N/A"}</strong>
            </p>
          </article>

          <article className="impact-domain-mini-card">
            <h4>Top Coaching Focus</h4>
            {teachingQuality.topCoachingFocusAreas.length > 0 ? (
              teachingQuality.topCoachingFocusAreas.map((item) => (
                <p className="impact-domain-mini-meta" key={item}>
                  • {item}
                </p>
              ))
            ) : (
              <p className="impact-domain-mini-meta">Data not available</p>
            )}
          </article>
        </div>
      ) : (
        <p>Data not available for lesson evaluations in this scope/period.</p>
      )}
    </article>
  );
}
