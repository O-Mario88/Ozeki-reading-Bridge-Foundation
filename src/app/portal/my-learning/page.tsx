import Link from "next/link";
import { requirePortalUser } from "@/lib/auth";
import { getTeacherLearningJourneyPostgres } from "@/lib/server/postgres/repositories/lesson-lms";

export const dynamic = "force-dynamic";

function formatHours(mins: number): string {
  const hrs = mins / 60;
  return `${hrs.toFixed(1)}h`;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}m`;
}

export default async function MyLearningPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const user = await requirePortalUser();
  const { userId } = await searchParams;
  const targetUserId =
    userId && (user.isAdmin || user.isSuperAdmin) ? Number(userId) : user.id;

  const journey = await getTeacherLearningJourneyPostgres(targetUserId);

  return (
    <main className="lms-journey-root">
      <header className="lms-journey-header">
        <h1>My Learning Journey</h1>
        <p className="text-gray-500">
          Professional development — lessons you have watched, quizzes you have passed, certificates earned.
          {targetUserId !== user.id ? ` Viewing user #${targetUserId}.` : ""}
        </p>
      </header>

      <section className="lms-journey-summary">
        <article className="lms-journey-kpi">
          <span>Lessons started</span>
          <strong>{journey.totalLessonsStarted}</strong>
        </article>
        <article className="lms-journey-kpi">
          <span>Lessons completed</span>
          <strong>{journey.totalLessonsCompleted}</strong>
          <small>≥90% watched</small>
        </article>
        <article className="lms-journey-kpi">
          <span>Quizzes passed</span>
          <strong>{journey.totalQuizzesPassed}</strong>
          <small>Score ≥80%</small>
        </article>
        <article className="lms-journey-kpi">
          <span>Certificates earned</span>
          <strong>{journey.totalCertificatesEligible}</strong>
        </article>
        <article className="lms-journey-kpi">
          <span>Total PD time</span>
          <strong>{formatHours(journey.totalWatchMinutes)}</strong>
          <small>{journey.totalWatchMinutes} minutes</small>
        </article>
        <article className="lms-journey-kpi">
          <span>Avg rating given</span>
          <strong>{journey.avgRatingGiven !== null ? `★${journey.avgRatingGiven}` : "—"}</strong>
        </article>
      </section>

      <section className="lms-journey-lessons">
        <h2>All lessons</h2>
        {journey.lessons.length === 0 ? (
          <p className="text-gray-500">
            No lessons watched yet. <Link href="/recorded-lessons">Browse the library</Link> to get started.
          </p>
        ) : (
          <table className="lms-journey-table">
            <thead>
              <tr>
                <th>Lesson</th>
                <th>Progress</th>
                <th>Watched</th>
                <th>Rating</th>
                <th>Quiz</th>
                <th>Certificate</th>
                <th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {journey.lessons.map((l) => (
                <tr key={l.lessonId}>
                  <td>
                    <Link href={`/recorded-lessons/${l.slug}`}>
                      <strong>{l.title}</strong>
                    </Link>
                    <br />
                    <small className="text-gray-500">{l.classLevel ?? ""}</small>
                  </td>
                  <td>
                    <div className="lms-journey-progress">
                      <div className="lms-journey-progress-bar" style={{ width: `${l.percentWatched}%` }} />
                    </div>
                    <small>{l.percentWatched}%</small>
                  </td>
                  <td>{formatTime(l.watchedSeconds)}</td>
                  <td>{l.rating !== null ? `★${l.rating}` : "—"}</td>
                  <td>
                    {l.quizCompleted ? (
                      <span className={(l.quizScore ?? 0) >= 80 ? "lms-journey-pass" : "lms-journey-fail"}>
                        {l.quizScore}%
                      </span>
                    ) : (
                      <small className="text-gray-400">—</small>
                    )}
                  </td>
                  <td>
                    {l.certificateEligible ? (
                      <form action={`/api/portal/recorded-lessons/certificates/issue`} method="post">
                        <input type="hidden" name="lessonId" value={l.lessonId} />
                        <span className="lms-journey-cert-badge">🎓 Eligible</span>
                      </form>
                    ) : (
                      <small className="text-gray-400">—</small>
                    )}
                  </td>
                  <td>
                    <small>
                      {l.lastWatchedAt ? new Date(l.lastWatchedAt).toLocaleDateString("en-GB") : "—"}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
