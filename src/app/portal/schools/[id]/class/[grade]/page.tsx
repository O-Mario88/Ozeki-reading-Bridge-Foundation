import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { getClassRosterPostgres } from "@/lib/server/postgres/repositories/assessment-intelligence";
import { ClassRosterTable } from "@/components/portal/ClassRosterTable";
import { Users, AlertTriangle, Download, ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string; grade: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { id, grade } = await params;
  const roster = await getClassRosterPostgres(Number(id), decodeURIComponent(grade));
  return { title: roster ? `${roster.classGrade} — ${roster.schoolName}` : "Class Not Found" };
}

export default async function ClassRosterPage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { id, grade } = await params;
  const schoolId = Number(id);
  const classGrade = decodeURIComponent(grade);

  const roster = await getClassRosterPostgres(schoolId, classGrade);
  if (!roster) notFound();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools"
      title={`${roster.classGrade} Class Roster`}
      description={roster.schoolName}
      actions={
        <a
          href={`/api/portal/schools/${schoolId}/class/${encodeURIComponent(classGrade)}/export`}
          download
          className="button button-primary inline-flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </a>
      }
    >
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Link
          href={`/portal/schools/${schoolId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to school profile
        </Link>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Learners</p>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{roster.totalLearners}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Flagged</p>
            </div>
            <p className="text-3xl font-extrabold text-red-600">{roster.flaggedCount}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Flagging Rate</p>
            <p className="text-3xl font-extrabold text-gray-900">
              {roster.totalLearners > 0 ? Math.round((roster.flaggedCount / roster.totalLearners) * 100) : 0}%
            </p>
          </div>
        </div>

        <ClassRosterTable learners={roster.learners} schoolId={schoolId} />
      </div>
    </PortalShell>
  );
}
