import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import { getLearnerProfilePostgres } from "@/lib/server/postgres/repositories/assessment-intelligence";
import {
  User, TrendingUp, TrendingDown, Minus, BookOpen, Target,
  School as SchoolIcon, Calendar, ChevronLeft, AlertCircle, CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ uid: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { uid } = await params;
  const profile = await getLearnerProfilePostgres(decodeURIComponent(uid));
  return { title: profile ? `${profile.learnerName} — Learner Profile` : "Learner Not Found" };
}

function statusColor(status: string) {
  if (status === "on_track") return "bg-emerald-50 text-[#066a67] border-emerald-200";
  if (status === "developing") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "needs_support") return "bg-red-50 text-red-700 border-red-200";
  return "bg-gray-50 text-gray-500 border-gray-200";
}

function statusLabel(status: string) {
  if (status === "on_track") return "On Track";
  if (status === "developing") return "Developing";
  if (status === "needs_support") return "Needs Support";
  return "Not Assessed";
}

function statusDot(status: string) {
  if (status === "on_track") return "bg-emerald-500";
  if (status === "developing") return "bg-amber-500";
  if (status === "needs_support") return "bg-red-500";
  return "bg-gray-300";
}

export default async function LearnerProfilePage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { uid } = await params;
  const profile = await getLearnerProfilePostgres(decodeURIComponent(uid));
  if (!profile) notFound();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools"
      title={profile.learnerName}
      description={`Learner ${profile.learnerUid} · ${profile.classGrade ?? "—"}`}
    >
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          {profile.schoolId && (
            <Link
              href={`/portal/schools/${profile.schoolId}`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to {profile.schoolName ?? "school"}
            </Link>
          )}
        </div>

        {/* Header card */}
        <div className="bg-gradient-to-br from-[#006b61] to-[#004d46] rounded-2xl p-6 md:p-8 text-white">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-white/80" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">
                Learner Profile
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{profile.learnerName}</h1>
              <div className="flex flex-wrap gap-3 text-sm text-white/80 mt-3">
                {profile.classGrade && <span><strong>{profile.classGrade}</strong></span>}
                {profile.gender && <span>{profile.gender}</span>}
                {profile.age != null && <span>Age {profile.age}</span>}
                {profile.schoolName && (
                  <Link href={`/portal/schools/${profile.schoolId}`} className="underline hover:no-underline flex items-center gap-1">
                    <SchoolIcon className="w-3.5 h-3.5" />
                    {profile.schoolName}
                  </Link>
                )}
              </div>
            </div>
            {profile.readingStageToday && (
              <div className="hidden md:block text-right shrink-0">
                <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Reading Stage</p>
                <p className="text-xl font-bold">{profile.readingStageToday}</p>
                {profile.expectedGrade && (
                  <p className="text-xs text-white/70 mt-0.5">Expected: {profile.expectedGrade}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Trajectory strip */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Assessments Completed</p>
            <p className="text-3xl font-extrabold text-gray-900">{profile.cycles.length}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Trajectory</p>
            {profile.trajectoryDelta != null ? (
              <p className={`text-3xl font-extrabold flex items-center gap-1.5 ${
                profile.trajectoryDelta > 0 ? "text-[#066a67]" :
                profile.trajectoryDelta < 0 ? "text-red-600" : "text-gray-500"
              }`}>
                {profile.trajectoryDelta > 0 ? <TrendingUp className="w-6 h-6" /> :
                 profile.trajectoryDelta < 0 ? <TrendingDown className="w-6 h-6" /> :
                 <Minus className="w-6 h-6" />}
                {profile.trajectoryDelta > 0 ? "+" : ""}{profile.trajectoryDelta} pp
              </p>
            ) : (
              <p className="text-3xl font-extrabold text-gray-400">—</p>
            )}
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Recommended Focus</p>
            {profile.recommendedFocus.length > 0 ? (
              <p className="text-sm font-bold text-red-700">{profile.recommendedFocus.length} priority domains</p>
            ) : (
              <p className="text-sm font-bold text-[#066a67] flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                All on track
              </p>
            )}
          </div>
        </div>

        {/* Recommended focus card */}
        {profile.recommendedFocus.length > 0 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5">
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Recommended Next Focus
            </h2>
            <ul className="space-y-1.5">
              {profile.recommendedFocus.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                  <span className="text-amber-600 font-bold">{i + 1}.</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Domain status grid */}
        <div className="rounded-2xl bg-white border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            Domain Status
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {profile.domains.map((d) => (
              <div key={d.key} className={`rounded-xl border p-4 ${statusColor(d.status)}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${statusDot(d.status)}`} />
                  <p className="text-xs font-bold uppercase tracking-wider">{statusLabel(d.status)}</p>
                </div>
                <p className="font-semibold text-gray-800 text-sm mb-3">{d.label}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Latest: <strong className="text-gray-800">{d.latestScore != null ? `${d.latestScore}%` : "—"}</strong>
                  </span>
                  {d.delta != null && (
                    <span className={`font-semibold ${d.delta > 0 ? "text-[#066a67]" : d.delta < 0 ? "text-red-600" : "text-gray-400"}`}>
                      {d.delta > 0 ? "+" : ""}{d.delta} pp
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assessment cycles */}
        <div className="rounded-2xl bg-white border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Assessment Cycles
          </h2>
          {profile.cycles.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-6">No assessments recorded yet.</p>
          ) : (
            <div>
              <DashboardListHeader template="100px 100px minmax(0,1.2fr) 70px 70px 80px 70px 70px 100px">
                <span>Cycle</span>
                <span>Date</span>
                <span>Stage</span>
                <span className="text-center">Letters</span>
                <span className="text-center">Sounds</span>
                <span className="text-center">Decoding</span>
                <span className="text-center">Fluency</span>
                <span className="text-center">Comp</span>
                <span className="text-right">Composite</span>
              </DashboardListHeader>
              {profile.cycles.map((c) => (
                <DashboardListRow
                  key={c.assessmentId}
                  template="100px 100px minmax(0,1.2fr) 70px 70px 80px 70px 70px 100px"
                >
                  <span>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                      {c.cycleType}
                    </span>
                  </span>
                  <span className="text-gray-600">{c.assessmentDate}</span>
                  <span className="text-gray-700 font-medium truncate">{c.readingStageLabel ?? "—"}</span>
                  <span className="text-center text-gray-600">{c.letterIdentificationScore ?? "—"}</span>
                  <span className="text-center text-gray-600">{c.soundIdentificationScore ?? "—"}</span>
                  <span className="text-center text-gray-600">{c.decodableWordsScore ?? "—"}</span>
                  <span className="text-center text-gray-600">{c.fluencyAccuracyScore ?? "—"}</span>
                  <span className="text-center text-gray-600">{c.readingComprehensionScore ?? "—"}</span>
                  <span className="text-right">
                    <strong className="text-gray-900">{c.compositeScore ?? "—"}</strong>
                  </span>
                </DashboardListRow>
              ))}
            </div>
          )}
        </div>

        {profile.cycles.length === 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              This learner is registered but has no assessments yet. Their reading stage and domain bands
              will populate once baseline data is recorded.
            </p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
