import Link from "next/link";
import { GraduationCap, ChevronRight, Eye, ClipboardCheck, ShieldCheck } from "lucide-react";
import { getTeacherRosterIntelPostgres } from "@/lib/server/postgres/repositories/school-intelligence";

type Props = {
  schoolId: number;
};

const TEAL = "#066a67";

/**
 * Teachers list card for the school profile dashboard. Server component —
 * pulls live roster + observation/training/assessment flags from
 * getTeacherRosterIntelPostgres so each row's badges (trained, observed,
 * has assessment data) reflect the production database.
 */
export async function SchoolTeachersCard({ schoolId }: Props) {
  const intel = await getTeacherRosterIntelPostgres(schoolId).catch(() => null);

  const teachers = intel?.teachers ?? [];
  const total = intel?.total ?? 0;
  const trained = intel?.trained ?? 0;
  const observed = intel?.observed ?? 0;

  return (
    <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-gray-900 leading-tight inline-flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-[#066a67]" strokeWidth={1.75} />
            Teachers at this school
          </h3>
          <p className="text-[11.5px] text-gray-500 mt-0.5">
            {total} on roster · {trained} trained · {observed} observed
          </p>
        </div>
        <Link
          href={`/portal/schools/${schoolId}/dossier`}
          className="text-[11.5px] font-semibold text-[#066a67] inline-flex items-center hover:underline shrink-0"
        >
          Manage <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
        </Link>
      </header>

      {teachers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-[12.5px] text-gray-600">No teachers on the roster yet.</p>
          <p className="text-[11px] text-gray-500 mt-1">Add a contact via the action bar above to start building this list.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {teachers.slice(0, 8).map((t) => {
            const initials = t.fullName.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
            const ratingTone =
              t.lastObservationRating === "fidelity" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                t.lastObservationRating === "partial" ? "bg-amber-50 text-amber-700 border-amber-100" :
                  t.lastObservationRating === "low" ? "bg-rose-50 text-rose-700 border-rose-100" :
                    "bg-gray-100 text-gray-600 border-gray-200";
            return (
              <li key={t.teacherUid} className="py-2.5 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-[#066a67] text-[11px] font-bold shrink-0">
                  {initials || <GraduationCap className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{t.fullName}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {t.classTaught ?? "Class —"}{t.gender ? ` · ${t.gender}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0" title="Trained / Observed / Has assessment data">
                  {t.isTrained ? (
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-emerald-50 text-emerald-700" title="Trained">
                      <ShieldCheck className="h-3 w-3" />
                    </span>
                  ) : null}
                  {t.isObserved ? (
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-blue-50 text-blue-700" title="Observed">
                      <Eye className="h-3 w-3" />
                    </span>
                  ) : null}
                  {t.hasAssessmentData ? (
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-violet-50 text-violet-700" title="Has assessment data">
                      <ClipboardCheck className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>
                {t.lastObservationRating ? (
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${ratingTone}`}>
                    {t.lastObservationRating}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {teachers.length > 8 ? (
        <Link
          href={`/portal/schools/${schoolId}/dossier`}
          className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold hover:underline"
          style={{ color: TEAL }}
        >
          See all {total} teachers <ChevronRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      ) : null}
    </section>
  );
}
