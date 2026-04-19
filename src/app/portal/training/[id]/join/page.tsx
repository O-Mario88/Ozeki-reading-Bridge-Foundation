import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePortalUser } from "@/lib/auth";
import {
  getTrainingSession,
  listTrainingResources,
} from "@/lib/training-db";
import { SessionJoinPanel } from "@/components/training/SessionJoinPanel";
import { PortalShell } from "@/components/portal/PortalShell";
import { Calendar, Clock, Users, FileText, ChevronLeft, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Join Training Session | Ozeki Portal",
};

type PageProps = { params: Promise<{ id: string }> };

function formatScheduledTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

function getDurationLabel(start: string, end: string): string {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins} min`;
}

export default async function ParticipantJoinPage({ params }: PageProps) {
  const user = await requirePortalUser();
  const { id } = await params;
  const sessionId = Number(id);

  const session = await getTrainingSession(sessionId);
  if (!session) notFound();

  // Only show to non-admin, non-host participants
  // (hosts/admins use the main /portal/training/[id] room page)
  const isHost =
    user.isAdmin ||
    user.isSuperAdmin ||
    session.hostUserId === user.id ||
    session.createdByUserId === user.id;

  const resources = await listTrainingResources(sessionId);

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    live: "Live Now",
    completed: "Ended",
    canceled: "Cancelled",
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-700 text-gray-300",
    scheduled: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    live: "bg-red-500/20 text-red-400 border border-red-500/30",
    completed: "bg-gray-700 text-gray-400",
    canceled: "bg-gray-800 text-gray-500",
  };

  return (
    <PortalShell
      user={user}
      activeHref="/portal/training"
      title={session.title}
      description={session.audience ?? "Online Training Session"}
    >
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Back link */}
        <Link
          href="/portal/training"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          All training sessions
        </Link>

        {/* Admin redirect hint */}
        {isHost && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-start gap-3">
            <span className="text-amber-600 text-sm font-medium">
              You are the host of this session.{" "}
              <Link href={`/portal/training/${sessionId}`} className="font-bold underline hover:no-underline">
                Open the host control room →
              </Link>
            </span>
          </div>
        )}

        {/* Session hero card */}
        <div className="bg-gray-950 rounded-2xl overflow-hidden shadow-xl">
          {/* Dark header with live panel */}
          <div className="p-6 md:p-10">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${statusColors[session.status] ?? statusColors.draft}`}>
                  {session.status === "live" && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  {statusLabels[session.status] ?? session.status}
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">{session.title}</h1>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-8">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatScheduledTime(session.startTime)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {getDurationLabel(session.startTime, session.endTime)}
              </span>
              {session.attendeeCount && session.attendeeCount > 0 ? (
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {session.attendeeCount} invited
                </span>
              ) : null}
            </div>

            {/* Join panel */}
            <div className="max-w-sm mx-auto md:mx-0">
              <SessionJoinPanel
                sessionId={sessionId}
                initialStatus={session.status}
                meetJoinUrl={session.meetJoinUrl ?? null}
                userId={user.id}
                scheduledStart={session.startTime}
              />
            </div>
          </div>
        </div>

        {/* Two-column below */}
        <div className="grid md:grid-cols-2 gap-5">

          {/* Agenda / objectives */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Session Agenda
            </h2>
            {session.agenda ? (
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">{session.agenda}</p>
            ) : (
              <p className="text-gray-400 text-sm italic">No agenda provided.</p>
            )}
            {session.objectives && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Objectives</p>
                <p className="text-gray-600 text-sm leading-relaxed">{session.objectives}</p>
              </div>
            )}
          </div>

          {/* Resources */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Session Materials
            </h2>
            {resources.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No resources uploaded yet.</p>
            ) : (
              <ul className="space-y-2">
                {resources.map((r) => (
                  <li key={r.id}>
                    {r.fileUrl || r.externalUrl ? (
                      <a
                        href={r.fileUrl ?? r.externalUrl ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 border border-transparent hover:border-gray-100 transition text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        {r.title}
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-500">
                        <FileText className="w-4 h-4 text-gray-300 shrink-0" />
                        {r.title}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-xs text-gray-400 text-center pb-4">
          Clicking &ldquo;Join Training Now&rdquo; opens Google Meet in a new tab and records your attendance.
          Keep this page open to access materials and agenda during the session.
        </p>
      </div>
    </PortalShell>
  );
}
