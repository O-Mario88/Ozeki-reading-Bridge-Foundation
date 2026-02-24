import Link from "next/link";
import type { Metadata } from "next";
import { getPublicImpactAggregate } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

type DomainCardProps = {
  title: string;
  baseline: number | null;
  latest: number | null;
  sampleSize: number;
  benchmarkPct: number | null;
};

function DomainCard({
  title,
  baseline,
  latest,
  sampleSize,
  benchmarkPct,
}: DomainCardProps) {
  return (
    <article className="impact-domain-mini-card">
      <h4>{title}</h4>
      <p>
        <strong>{latest ?? "Data not available"}</strong>
      </p>
      <p className="impact-domain-mini-meta">
        Baseline: {baseline ?? "Data not available"} → Latest: {latest ?? "Data not available"}
      </p>
      <p className="impact-domain-mini-meta">n = {sampleSize.toLocaleString()}</p>
      <p className="impact-domain-mini-meta">
        Benchmark: {benchmarkPct !== null ? `${benchmarkPct.toFixed(1)}%` : "Data not available"}
      </p>
    </article>
  );
}

function decodeSchoolId(value: string) {
  return decodeURIComponent(value);
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const scopeId = decodeSchoolId(id);
  const aggregate = getPublicImpactAggregate("school", scopeId, "FY");
  const schoolName = aggregate.scope.name;

  return {
    title: `${schoolName} — School Impact Profile | Ozeki Reading Bridge Foundation`,
    description: `Aggregated public literacy implementation data for ${schoolName}: enrollment reach, visits, assessments, and outcomes.`,
    openGraph: {
      title: `${schoolName} — School Impact Profile`,
      description: `Aggregated public literacy implementation data for ${schoolName}.`,
      type: "website",
    },
  };
}

export default async function SchoolPage({ params }: { params: Params }) {
  const { id } = await params;
  const scopeId = decodeSchoolId(id);
  const aggregate = getPublicImpactAggregate("school", scopeId, "FY");
  const kpis = aggregate.kpis;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="impact-dash-breadcrumb" aria-label="Drill-down">
            <Link href="/impact">Dashboard</Link>
            <span aria-hidden>›</span>
            <span>{aggregate.scope.name}</span>
          </nav>
          <p className="kicker">School Profile</p>
          <h1>{aggregate.scope.name}</h1>
          <p>Aggregated public implementation and outcomes only.</p>
        </div>
      </section>

      <section
        className="section"
        style={{ backgroundColor: "var(--md-sys-color-surface-container-low, #f6f6f6)" }}
      >
        <div className="container" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div className="headline-stats-grid">
            <article>
              <span>Enrollment (estimated reach)</span>
              <strong>{kpis.enrollmentEstimatedReach.toLocaleString()}</strong>
            </article>
            <article>
              <span>Learners assessed (n)</span>
              <strong>{kpis.learnersAssessedUnique.toLocaleString()}</strong>
            </article>
            <article>
              <span>Coaching visits</span>
              <strong>{kpis.coachingVisitsCompleted.toLocaleString()}</strong>
            </article>
            <article>
              <span>Assessments (B / P / E)</span>
              <strong>
                {kpis.assessmentsBaselineCount.toLocaleString()} /{" "}
                {kpis.assessmentsProgressCount.toLocaleString()} /{" "}
                {kpis.assessmentsEndlineCount.toLocaleString()}
              </strong>
            </article>
          </div>

          <article className="card" style={{ padding: "1.2rem" }}>
            <h3 style={{ marginTop: 0 }}>Learning Outcomes</h3>
            <div className="impact-domain-mini-grid">
              <DomainCard
                title="Letter sounds"
                baseline={aggregate.outcomes.letterSounds.baseline}
                latest={aggregate.outcomes.letterSounds.latest ?? aggregate.outcomes.letterSounds.endline}
                sampleSize={aggregate.outcomes.letterSounds.n}
                benchmarkPct={aggregate.outcomes.letterSounds.benchmarkPct}
              />
              <DomainCard
                title="Decoding"
                baseline={aggregate.outcomes.decoding.baseline}
                latest={aggregate.outcomes.decoding.latest ?? aggregate.outcomes.decoding.endline}
                sampleSize={aggregate.outcomes.decoding.n}
                benchmarkPct={aggregate.outcomes.decoding.benchmarkPct}
              />
              <DomainCard
                title="Fluency"
                baseline={aggregate.outcomes.fluency.baseline}
                latest={aggregate.outcomes.fluency.latest ?? aggregate.outcomes.fluency.endline}
                sampleSize={aggregate.outcomes.fluency.n}
                benchmarkPct={aggregate.outcomes.fluency.benchmarkPct}
              />
              <DomainCard
                title="Comprehension"
                baseline={aggregate.outcomes.comprehension.baseline}
                latest={
                  aggregate.outcomes.comprehension.latest ?? aggregate.outcomes.comprehension.endline
                }
                sampleSize={aggregate.outcomes.comprehension.n}
                benchmarkPct={aggregate.outcomes.comprehension.benchmarkPct}
              />
            </div>
          </article>

          <article className="card" style={{ padding: "1.2rem" }}>
            <h3 style={{ marginTop: 0 }}>Implementation Summary</h3>
            <div className="impact-funnel-mini">
              <div>
                <span>Trained</span>
                <strong>{aggregate.funnel.trained.toLocaleString()}</strong>
              </div>
              <div>
                <span>Coached / Visited</span>
                <strong>{aggregate.funnel.coached.toLocaleString()}</strong>
              </div>
              <div>
                <span>Baseline assessed</span>
                <strong>{aggregate.funnel.baselineAssessed.toLocaleString()}</strong>
              </div>
              <div>
                <span>Endline assessed</span>
                <strong>{aggregate.funnel.endlineAssessed.toLocaleString()}</strong>
              </div>
            </div>
            <p className="impact-map-sheet-meta">
              Data completeness: {aggregate.meta.dataCompleteness}
            </p>
            <p className="impact-map-sheet-meta">
              Last updated: {new Date(aggregate.meta.lastUpdated).toLocaleString()}
            </p>
          </article>

          <p className="note-box impact-compliance-note">
            School profiles display group-level aggregated data only. No individual learner
            information is shown. Learner-level views remain in secure staff tools with role-based
            access and audit logging.
          </p>
        </div>
      </section>
    </>
  );
}
