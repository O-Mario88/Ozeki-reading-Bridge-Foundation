import { requireAdmin } from "@/lib/auth";
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

      <table className="lms-analytics-table">
        <thead>
          <tr>
            <th>Lesson</th>
            <th>Level</th>
            <th>Views</th>
            <th>Completion</th>
            <th>Rewatch rate</th>
            <th>Overall ★</th>
            <th>Usefulness ★</th>
            <th>Clarity ★</th>
            <th>Pace ★</th>
            <th>Quiz pass</th>
            <th>Certs</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.lessonId} className={r.flags.length > 0 ? "is-flagged" : ""}>
              <td>
                <a href={`/recorded-lessons/${r.slug}`} target="_blank" rel="noopener">
                  <strong>{r.title}</strong>
                </a>
                <br />
                <small className="text-gray-500">{r.phonicsLevel ?? r.category ?? ""}</small>
              </td>
              <td>{r.classLevel ?? "—"}</td>
              <td>{r.totalViews}<br /><small>{r.uniqueViewers} unique</small></td>
              <td>{r.completionRate}%</td>
              <td className={r.rewatchRate > 40 ? "lms-warn" : ""}>{r.rewatchRate}%</td>
              <td>{r.avgOverall !== null ? `★${r.avgOverall}` : "—"}<br /><small>n={r.ratingsCount}</small></td>
              <td className={r.avgUsefulness !== null && r.avgUsefulness < 3 ? "lms-warn" : ""}>
                {r.avgUsefulness !== null ? `★${r.avgUsefulness}` : "—"}
              </td>
              <td>{r.avgClarity !== null ? `★${r.avgClarity}` : "—"}</td>
              <td>{r.avgPace !== null ? `★${r.avgPace}` : "—"}</td>
              <td className={r.quizPassRate !== null && r.quizPassRate < 50 ? "lms-warn" : ""}>
                {r.quizPassRate !== null ? `${r.quizPassRate}%` : "—"}<br />
                <small>n={r.quizAttempts}</small>
              </td>
              <td>{r.certificatesIssued}</td>
              <td>
                {r.flags.length === 0 ? <small className="text-gray-400">—</small> : (
                  <ul className="lms-flag-list">
                    {r.flags.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
