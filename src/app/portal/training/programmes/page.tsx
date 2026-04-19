import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { listProgrammesPostgres } from "@/lib/server/postgres/repositories/training-programmes";
import { BookOpen, Users, CheckCircle2, Calendar, Plus, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Training Programmes | Ozeki Portal",
};

function statusBadge(status: string) {
  switch (status) {
    case "active": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "completed": return "bg-blue-50 text-blue-700 border-blue-200";
    case "draft": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

export default async function ProgrammesListPage() {
  const user = await requirePortalStaffUser();
  const programmes = await listProgrammesPostgres();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/training/programmes"
      title="Training Programmes"
      description="Cohort-style courses that sequence multiple online sessions"
      actions={
        (user.isAdmin || user.isSuperAdmin) && (
          <Link href="/portal/training/programmes/new" className="button button-primary">
            <Plus className="w-4 h-4 inline mr-1.5" />
            New Programme
          </Link>
        )
      }
    >
      <div className="max-w-6xl mx-auto px-4 py-6">
        {programmes.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-gray-200 py-16 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No programmes yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Programmes group multiple online sessions into structured courses (e.g. &ldquo;8-Week Phonics Mastery&rdquo;).
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {programmes.map((p) => (
              <Link
                key={p.id}
                href={`/portal/training/programmes/${p.id}`}
                className="group rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusBadge(p.status)}`}>
                    {p.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">{p.title}</h3>
                {p.audience && <p className="text-xs text-gray-500 mb-3">{p.audience}</p>}
                {p.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">{p.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-50">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {p.sessionCount ?? 0} session{p.sessionCount === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {p.enrolledCount ?? 0} enrolled
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {p.completedCount ?? 0} completed
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
