import { requireAdmin } from "@/lib/auth";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import { getLessonContentAnalyticsPostgres } from "@/lib/server/postgres/repositories/lesson-lms";

export const dynamic = "force-dynamic";

export default async function LessonAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ flaggedOnly?: string }>;
}) {
  await requireAdmin();
  const { flaggedOnly } = await searchParams;
  const rows = await getLessonContentAnalyticsPostgres({ limit: 200, flaggedOnly: flaggedOnly === "1" });

  const totalLessons = rows.length;
  const flaggedCount = rows.filter((r) => r.flags.length > 0).length;
  const avgCompletion = totalLessons > 0
    ? (rows.reduce((a, b) => a + b.completionRate, 0) / totalLessons).toFixed(1)
    : "0";
  const withQuiz = rows.filter((r) => r.quizPassRate !== null);
  const avgPassRate = withQuiz.length > 0
    ? (withQuiz.reduce((a, b) => a + (b.quizPassRate ?? 0), 0) / withQuiz.length).toFixed(1)
    : "—";

  return (
    <main className="lms-analytics-root">
      <header className="lms-analytics-header">
        <h1>Recorded Lesson — Content Analytics</h1>
        <p className="text-gray-500">
          For programme designers: which lessons work, which need revision, and where teachers are struggling.
        </p>
      </header>

      <section className="lms-analytics-kpis">
        <article><span>Lessons analysed</span><strong>{totalLessons}</strong></article>
        <article className={flaggedCount > 0 ? "is-alert" : ""}>
          <span>Flagged for review</span><strong>{flaggedCount}</strong>
        </article>
        <article><span>Avg completion</span><strong>{avgCompletion}%</strong></article>
        <article><span>Avg quiz pass rate</span><strong>{avgPassRate}%</strong></article>
      </section>

      <nav className="lms-analytics-filters">
        <a href="/portal/recorded-lessons/analytics" className={!flaggedOnly ? "active" : ""}>All</a>
        <a href="/portal/recorded-lessons/analytics?flaggedOnly=1" className={flaggedOnly === "1" ? "active" : ""}>
          Flagged only ({flaggedCount})
        </a>
      </nav>

      <div className="lms-analytics-table">
        <DashboardListHeader template="minmax(0,1.6fr) 80px 90px 100px 110px 100px 110px 90px 80px 110px 70px minmax(0,1.2fr)">
          <span>Lesson</span>
          <span>Level</span>
          <span>Views</span>
          <span>Completion</span>
          <span>Rewatch rate</span>
          <span>Overall ★</span>
          <span>Usefulness ★</span>
          <span>Clarity ★</span>
          <span>Pace ★</span>
          <span>Quiz pass</span>
          <span>Certs</span>
          <span>Flags</span>
        </DashboardListHeader>
        {rows.map((r) => (
          <DashboardListRow
            key={r.lessonId}
            template="minmax(0,1.6fr) 80px 90px 100px 110px 100px 110px 90px 80px 110px 70px minmax(0,1.2fr)"
            className={r.flags.length > 0 ? "is-flagged" : ""}
          >
            <span className="min-w-0">
              <a href={`/recorded-lessons/${r.slug}`} target="_blank" rel="noopener">
                <strong className="truncate inline-block max-w-full">{r.title}</strong>
              </a>
              <small className="block text-gray-500 truncate">{r.phonicsLevel ?? r.category ?? ""}</small>
            </span>
            <span>{r.classLevel ?? "—"}</span>
            <span>{r.totalViews} <small className="block">{r.uniqueViewers} unique</small></span>
            <span>{r.completionRate}%</span>
            <span className={r.rewatchRate > 40 ? "lms-warn" : ""}>{r.rewatchRate}%</span>
            <span>{r.avgOverall !== null ? `★${r.avgOverall}` : "—"} <small className="block">n={r.ratingsCount}</small></span>
            <span className={r.avgUsefulness !== null && r.avgUsefulness < 3 ? "lms-warn" : ""}>
              {r.avgUsefulness !== null ? `★${r.avgUsefulness}` : "—"}
            </span>
            <span>{r.avgClarity !== null ? `★${r.avgClarity}` : "—"}</span>
            <span>{r.avgPace !== null ? `★${r.avgPace}` : "—"}</span>
            <span className={r.quizPassRate !== null && r.quizPassRate < 50 ? "lms-warn" : ""}>
              {r.quizPassRate !== null ? `${r.quizPassRate}%` : "—"}
              <small className="block">n={r.quizAttempts}</small>
            </span>
            <span>{r.certificatesIssued}</span>
            <span className="min-w-0">
              {r.flags.length === 0 ? <small className="text-gray-400">—</small> : (
                <ul className="lms-flag-list m-0 p-0">
                  {r.flags.map((f) => <li key={f}>{f}</li>)}
                </ul>
              )}
            </span>
          </DashboardListRow>
        ))}
      </div>
    </main>
  );
}
