import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import { getGenderParityPostgres } from "@/lib/server/postgres/repositories/assessment-intelligence";
import { Scale, Users, ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ district?: string; region?: string }>;
}

export const metadata = { title: "Gender Parity Index | Ozeki Portal" };

function parityLabel(idx: number | null): { label: string; color: string } {
  if (idx == null) return { label: "Insufficient data", color: "text-gray-400" };
  if (idx >= 0.97 && idx <= 1.03) return { label: "At parity", color: "text-[#066a67]" };
  if (idx > 1.03) return { label: "Female ahead", color: "text-purple-700" };
  return { label: "Female behind", color: "text-amber-700" };
}

export default async function GenderParityPage({ searchParams }: PageProps) {
  const user = await requirePortalStaffUser();
  const sp = await searchParams;
  const report = await getGenderParityPostgres({ district: sp.district, region: sp.region });
  const overall = parityLabel(report.overallParityIndex);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/assessments"
      title="Gender Parity Index"
      description="Female/male ratio of learner outcomes — a core metric for UNICEF, USAID, and government gender desks"
    >
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Link
          href="/portal/assessments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
          Assessments overview
        </Link>

        {/* Overall headline */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-700 to-purple-900 text-white p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">
                {report.scope} — Gender Parity Index
              </p>
              <p className="text-5xl font-extrabold mb-2">
                {report.overallParityIndex != null ? report.overallParityIndex.toFixed(2) : "—"}
              </p>
              <p className={`text-sm font-semibold ${overall.color === "text-[#066a67]" ? "text-emerald-200" : overall.color === "text-purple-700" ? "text-purple-200" : "text-amber-200"}`}>
                {overall.label}
              </p>
            </div>
            <Scale className="w-14 h-14 text-white/30" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/20">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">Male Learners</p>
              <p className="text-2xl font-bold mt-1 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-white/50" />
                {report.totalMale.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">Female Learners</p>
              <p className="text-2xl font-bold mt-1 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-white/50" />
                {report.totalFemale.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-xs text-white/60 mt-3 italic">
            1.00 = exact parity · &gt;1 female ahead · &lt;1 female behind · equity target range: 0.97–1.03
          </p>
        </div>

        {/* Domain parity */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">
            Parity by Literacy Domain
          </h2>
          <div className="space-y-3">
            {report.domains.map((d) => {
              const dLabel = parityLabel(d.parityIndex);
              return (
                <div key={d.domain} className="grid grid-cols-12 items-center gap-3 py-2 border-b border-gray-50 last:border-b-0">
                  <div className="col-span-3">
                    <p className="text-sm font-semibold text-gray-800">{d.domain}</p>
                    <p className="text-xs text-gray-400">
                      M={d.maleN.toLocaleString()} · F={d.femaleN.toLocaleString()}
                    </p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-lg font-bold text-gray-700">{d.maleAvg ?? "—"}</p>
                    <p className="text-xs text-gray-400">Male avg</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-lg font-bold text-gray-700">{d.femaleAvg ?? "—"}</p>
                    <p className="text-xs text-gray-400">Female avg</p>
                  </div>
                  <div className="col-span-3">
                    {d.parityIndex != null && (
                      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                        {/* Parity line in center */}
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-600" />
                        {/* Bar: anchored at 1.0 in middle */}
                        <div
                          className="absolute top-0 bottom-0 bg-purple-500"
                          style={{
                            left: d.parityIndex <= 1 ? `${d.parityIndex * 50}%` : "50%",
                            width: `${Math.min(Math.abs(d.parityIndex - 1) * 50, 50)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    <p className={`text-sm font-bold ${dLabel.color}`}>
                      {d.parityIndex != null ? d.parityIndex.toFixed(2) : "—"}
                    </p>
                    <p className="text-xs text-gray-400">{dLabel.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By grade */}
        {report.byGrade.length > 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">
              Parity by Grade Level
            </h2>
            <div>
              <DashboardListHeader template="minmax(0,1fr) 90px 90px 100px 100px 100px">
                <span>Grade</span>
                <span className="text-center">Male N</span>
                <span className="text-center">Female N</span>
                <span className="text-center">Male Avg</span>
                <span className="text-center">Female Avg</span>
                <span className="text-right">Parity</span>
              </DashboardListHeader>
              {report.byGrade.map((g) => {
                const gLabel = parityLabel(g.parityIndex);
                return (
                  <DashboardListRow
                    key={g.grade}
                    template="minmax(0,1fr) 90px 90px 100px 100px 100px"
                  >
                    <span className="font-bold text-gray-800">{g.grade}</span>
                    <span className="text-center text-gray-600">{g.maleN}</span>
                    <span className="text-center text-gray-600">{g.femaleN}</span>
                    <span className="text-center text-gray-700">{g.maleComposite ?? "—"}</span>
                    <span className="text-center text-gray-700">{g.femaleComposite ?? "—"}</span>
                    <span className={`text-right font-bold ${gLabel.color}`}>
                      {g.parityIndex != null ? g.parityIndex.toFixed(2) : "—"}
                    </span>
                  </DashboardListRow>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
