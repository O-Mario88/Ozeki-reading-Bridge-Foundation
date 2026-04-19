import Link from "next/link";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  getWorkQueuePostgres,
  getActivityFeedPostgres,
  getCoachDashboardPostgres,
} from "@/lib/server/postgres/repositories/command-center";
import { CommandCenterClient } from "@/components/portal/CommandCenterClient";

export const dynamic = "force-dynamic";

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const mins = Math.floor((now - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function CommandCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; mine?: string }>;
}) {
  const user = await requirePortalUser();
  const { view, mine } = await searchParams;

  // Resolve role → default view
  const isCoach = user.role?.toLowerCase().includes("coach") || false;
  const isFinance = user.role?.toLowerCase().includes("accountant") || user.role?.toLowerCase().includes("finance") || false;
  const isAdmin = Boolean(user.isAdmin || user.isSuperAdmin);
  const isME = Boolean(user.isME);
  const defaultView: "coach" | "me" | "finance" | "operations" =
    view === "coach" || view === "me" || view === "finance" || view === "operations"
      ? view
      : isCoach ? "coach" : isFinance ? "finance" : isME ? "me" : "operations";

  const filterMine = mine === "1";

  const [workQueue, activity, coachAgg] = await Promise.all([
    getWorkQueuePostgres({
      ownerUserId: filterMine ? user.id : undefined,
      limit: 60,
    }),
    getActivityFeedPostgres({ hours: 48, limit: 30 }),
    defaultView === "coach" ? getCoachDashboardPostgres(user.id) : Promise.resolve(null),
  ]);

  const criticalCount = workQueue.filter((i) => i.priority === "critical").length;
  const highCount = workQueue.filter((i) => i.priority === "high").length;
  const overdueCount = workQueue.filter((i) => (i.daysOverdue ?? 0) > 0).length;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/command-center"
      title="Command Center"
      description={`${defaultView === "coach" ? "Your coaching visits, observations, and follow-ups." : defaultView === "finance" ? "Finance exceptions, reconciliation queue, and donations." : defaultView === "me" ? "National M&E aggregates, assessment queue, and activity." : "Operations work queue, bulk tools, and live activity feed."}`}
    >
      <div className="cc-root">
        {/* Role switcher */}
        <nav className="cc-role-switcher">
          <Link href="/portal/command-center?view=operations" className={defaultView === "operations" ? "active" : ""}>🏭 Operations</Link>
          {(isCoach || isAdmin) && <Link href="/portal/command-center?view=coach" className={defaultView === "coach" ? "active" : ""}>🧭 Coach</Link>}
          {(isME || isAdmin) && <Link href="/portal/command-center?view=me" className={defaultView === "me" ? "active" : ""}>📊 M&amp;E</Link>}
          {(isFinance || isAdmin) && <Link href="/portal/command-center?view=finance" className={defaultView === "finance" ? "active" : ""}>💰 Finance</Link>}
          <div className="cc-switcher-sep" />
          <Link href={filterMine ? "/portal/command-center" : "/portal/command-center?mine=1"} className={filterMine ? "active" : ""}>
            {filterMine ? "✓ Mine only" : "Mine only"}
          </Link>
        </nav>

        {/* Coach-specific KPIs */}
        {defaultView === "coach" && coachAgg ? (
          <section className="cc-kpis">
            <article><span>Visits this term</span><strong>{coachAgg.visitsThisTerm}</strong></article>
            <article><span>Schools covered</span><strong>{coachAgg.schoolsAssigned}</strong></article>
            <article><span>Observations</span><strong>{coachAgg.observationsThisTerm}</strong></article>
            <article><span>Avg rubric score</span><strong>{coachAgg.avgRubricScoreGiven !== null ? `★${coachAgg.avgRubricScoreGiven}` : "—"}</strong></article>
            <article className={coachAgg.overdueFollowUps > 0 ? "is-alert" : ""}><span>Overdue follow-ups</span><strong>{coachAgg.overdueFollowUps}</strong></article>
            <article><span>Upcoming follow-ups</span><strong>{coachAgg.upcomingFollowUps}</strong></article>
          </section>
        ) : (
          <section className="cc-kpis">
            <article className={criticalCount > 0 ? "is-alert" : ""}><span>Critical items</span><strong>{criticalCount}</strong></article>
            <article className={highCount > 0 ? "is-warn" : ""}><span>High priority</span><strong>{highCount}</strong></article>
            <article className={overdueCount > 0 ? "is-alert" : ""}><span>Overdue</span><strong>{overdueCount}</strong></article>
            <article><span>Total items</span><strong>{workQueue.length}</strong></article>
            <article><span>Activity (48h)</span><strong>{activity.length}</strong></article>
          </section>
        )}

        <div className="cc-grid">
          {/* Left column: Work Queue */}
          <section className="cc-col-main">
            <header className="cc-section-header">
              <h2>Work queue</h2>
              <p>Every pending action that needs your attention, prioritised.</p>
            </header>
            <CommandCenterClient
              initialWorkQueue={workQueue}
              canBulk={Boolean(isAdmin)}
            />
          </section>

          {/* Right column: Activity Feed */}
          <section className="cc-col-side">
            <header className="cc-section-header">
              <h2>Live activity feed</h2>
              <p>Last 48 hours across the programme.</p>
            </header>
            {activity.length === 0 ? (
              <p className="text-gray-400">No recent activity.</p>
            ) : (
              <ul className="cc-activity">
                {activity.map((a) => (
                  <li key={a.id} className={`cc-activity-item cc-activity-${a.eventType}`}>
                    <span className="cc-activity-icon">
                      {a.eventType === "assessment" && "📝"}
                      {a.eventType === "observation" && "👁"}
                      {a.eventType === "coaching_visit" && "🚶"}
                      {a.eventType === "training" && "🎓"}
                      {a.eventType === "certificate" && "🏅"}
                      {a.eventType === "lesson_view" && "▶"}
                      {a.eventType === "donation" && "💚"}
                    </span>
                    <div className="cc-activity-body">
                      <Link href={a.href}><strong>{a.title}</strong></Link>
                      {a.subtitle ? <><br /><small>{a.subtitle}</small></> : null}
                      <div className="cc-activity-meta">
                        <small>{formatRelative(a.occurredAt)}</small>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </PortalShell>
  );
}
