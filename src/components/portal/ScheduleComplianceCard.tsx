"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Calendar, School as SchoolIcon } from "lucide-react";
import Link from "next/link";

interface Window {
  id: number;
  assessmentType: "baseline" | "progress" | "endline";
  academicYear: number;
  termNumber: number;
  windowOpen: string;
  windowClose: string;
  daysUntilClose: number | null;
}

interface Compliance {
  windowId: number;
  expectedSchools: number;
  submittedSchools: number;
  submissionPct: number;
  missingSchools: Array<{ schoolId: number; schoolName: string; district: string }>;
}

export function ScheduleComplianceCard({ window }: { window: Window }) {
  const [data, setData] = useState<Compliance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/portal/assessments/schedule/${window.id}/compliance`);
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [window.id]);

  const pctColor = !data ? "bg-gray-200" :
    data.submissionPct >= 80 ? "bg-emerald-500" :
    data.submissionPct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-2xl bg-white border border-emerald-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-[#066a67] border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Open Now
        </span>
        {window.daysUntilClose != null && (
          <span className="text-xs text-gray-500 font-semibold">
            Closes in {window.daysUntilClose} day{window.daysUntilClose === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <h3 className="text-lg font-bold text-gray-900 capitalize mb-1">{window.assessmentType} cycle</h3>
      <p className="text-sm text-gray-600 mb-4">
        <Calendar className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
        Term {window.termNumber} · {window.windowOpen} → {window.windowClose}
      </p>

      {loading ? (
        <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
      ) : data ? (
        <>
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-semibold text-gray-800">
                {data.submittedSchools} of {data.expectedSchools} submitted
              </span>
              <span className={`text-lg font-bold ${data.submissionPct >= 80 ? "text-[#066a67]" : data.submissionPct >= 50 ? "text-amber-700" : "text-red-600"}`}>
                {data.submissionPct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full transition-all ${pctColor}`} style={{ width: `${data.submissionPct}%` }} />
            </div>
          </div>

          {/* Missing schools */}
          {data.missingSchools.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {data.missingSchools.length} schools haven&apos;t submitted
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.missingSchools.slice(0, 5).map((s) => (
                  <Link
                    key={s.schoolId}
                    href={`/portal/schools/${s.schoolId}`}
                    className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 py-1 rounded-md transition"
                  >
                    <SchoolIcon className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{s.schoolName}</span>
                    <span className="ml-auto text-gray-400 shrink-0">{s.district}</span>
                  </Link>
                ))}
                {data.missingSchools.length > 5 && (
                  <p className="text-xs text-gray-400 px-2 pt-1">
                    + {data.missingSchools.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}

          {data.missingSchools.length === 0 && data.expectedSchools > 0 && (
            <p className="text-xs text-[#066a67] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All expected schools have submitted.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
