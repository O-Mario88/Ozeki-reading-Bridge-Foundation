import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  getProgrammePostgres,
  listProgrammeSessionsPostgres,
  listProgrammeEnrollmentsPostgres,
  recomputeProgrammeProgressPostgres,
} from "@/lib/server/postgres/repositories/training-programmes";
import {
  BookOpen, Users, Calendar, CheckCircle2, Clock, Target,
  ChevronLeft, ExternalLink, Award, PlayCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default async function ProgrammeDetailPage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { id } = await params;
  const programmeId = Number(id);
  if (!Number.isInteger(programmeId) || programmeId <= 0) notFound();

  await recomputeProgrammeProgressPostgres(programmeId).catch(() => {});

  const [programme, sessions, enrollments] = await Promise.all([
    getProgrammePostgres(programmeId),
    listProgrammeSessionsPostgres(programmeId),
    listProgrammeEnrollmentsPostgres(programmeId),
  ]);

  if (!programme) notFound();

  const enrolled = enrollments.length;
  const completed = enrollments.filter((e) => e.enrollmentStatus === "completed").length;
  const active = enrollments.filter((e) => e.enrollmentStatus === "active").length;
  const completionRate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/training/programmes"
      title={programme.title}
      description={programme.audience ?? "Training Programme"}
    >
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Link
          href="/portal/training/programmes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          All programmes
        </Link>

        {/* Overview card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#006b61] to-[#004d46] text-white p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              {programme.code && (
                <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">
                  {programme.code}
                </p>
              )}
              <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{programme.title}</h1>
              {programme.audience && <p className="text-white/80 text-sm mt-2">{programme.audience}</p>}
            </div>
            <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              programme.status === "active" ? "bg-emerald-400/20 text-emerald-100 border border-emerald-300/30" :
              programme.status === "completed" ? "bg-blue-400/20 text-blue-100 border border-blue-300/30" :
              "bg-amber-400/20 text-amber-100 border border-amber-300/30"
            }`}>
              {programme.status}
            </span>
          </div>

          {programme.description && (
            <p className="text-white/85 text-sm leading-relaxed mb-5">{programme.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-white/80">
            {programme.durationWeeks && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {programme.durationWeeks} weeks
              </span>
            )}
            {programme.startDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(programme.startDate)}
                {programme.endDate && ` – ${formatDate(programme.endDate)}`}
              </span>
            )}
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sessions</p>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{sessions.length}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Users className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Enrolled</p>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{enrolled}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Target className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active</p>
            </div>
            <p className="text-2xl font-extrabold text-amber-600">{active}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Award className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completed</p>
            </div>
            <p className="text-2xl font-extrabold text-emerald-700">
              {completed}
              <span className="text-sm text-gray-400 font-medium ml-1">({completionRate}%)</span>
            </p>
          </div>
        </div>

        {/* Sessions list */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-gray-400" />
            Session Sequence
          </h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">
              No sessions linked to this programme yet.
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s, idx) => (
                <Link
                  key={s.id}
                  href={`/portal/training/${s.sessionId}`}
                  className="group flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-700">
                      {s.sessionTitle}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(s.sessionStartTime)} · {s.sessionStatus}
                      {s.required && " · Required"}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-600" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Enrollments table */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            Enrolled Teachers ({enrolled})
          </h2>
          {enrollments.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">No teachers enrolled yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-2 px-2 font-semibold">Teacher</th>
                    <th className="py-2 px-2 font-semibold">School</th>
                    <th className="py-2 px-2 font-semibold">Progress</th>
                    <th className="py-2 px-2 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id} className="border-b border-gray-50">
                      <td className="py-2.5 px-2 font-medium text-gray-800">
                        {e.teacherName}
                        {e.teacherEmail && <p className="text-xs text-gray-400 font-normal">{e.teacherEmail}</p>}
                      </td>
                      <td className="py-2.5 px-2 text-gray-500">{e.schoolName ?? "—"}</td>
                      <td className="py-2.5 px-2 text-gray-600">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{ width: `${e.completionPct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-gray-500">
                            {e.sessionsAttended}/{e.sessionsRequired}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          e.enrollmentStatus === "completed" ? "bg-emerald-50 text-emerald-700" :
                          e.enrollmentStatus === "dropped" ? "bg-red-50 text-red-600" :
                          "bg-amber-50 text-amber-700"
                        }`}>
                          {e.enrollmentStatus === "completed" && <CheckCircle2 className="w-3 h-3" />}
                          {e.enrollmentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
