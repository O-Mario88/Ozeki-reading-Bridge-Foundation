import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { getBenchmarkGapAnalysisPostgres } from "@/lib/server/postgres/repositories/assessment-intelligence";
import { TrendingUp, TrendingDown, Target, ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ grade?: string }>;
}

export const metadata = { title: "Benchmark Gap Analysis | Ozeki Portal" };

export default async function BenchmarkGapsPage({ searchParams }: PageProps) {
  const user = await requirePortalStaffUser();
  const sp = await searchParams;
  const data = await getBenchmarkGapAnalysisPostgres(sp.grade);

  const grades = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"];

  const max = Math.max(...data.districts.map((d) => d.atOrAboveBenchmarkPct), data.nationalAveragePct, 10);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/assessments"
      title="Benchmark Gap Analysis"
      description="% of learners at or above national grade-level benchmark, by district"
    >
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Link
          href="/portal/assessments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
          Assessments overview
        </Link>

        {/* Grade filter */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/portal/assessments/benchmark-gaps"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!sp.grade ? "bg-[#006b61] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            All grades
          </Link>
          {grades.map((g) => (
            <Link
              key={g}
              href={`/portal/assessments/benchmark-gaps?grade=${g}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${sp.grade === g ? "bg-[#006b61] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {g}
            </Link>
          ))}
        </div>

        {/* National headline */}
        <div className="rounded-2xl bg-gradient-to-br from-[#006b61] to-[#004d46] text-white p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">
            National Benchmark Achievement
          </p>
          <p className="text-5xl font-extrabold mb-2">
            {data.nationalAveragePct}%
          </p>
          <p className="text-white/80">
            of {data.totalLearnersAssessed.toLocaleString()} assessed learners met or exceeded grade-level expectations
            {sp.grade && ` in ${sp.grade}`}
          </p>
        </div>

        {/* District gap bar chart */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-400" />
            District vs National Benchmark
          </h2>

          {data.districts.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-6">
              No districts meet the minimum sample size (5 learners).
            </p>
          ) : (
            <div className="space-y-2">
              {data.districts.map((d) => {
                const width = (d.atOrAboveBenchmarkPct / max) * 100;
                const above = d.gapPp > 0;
                return (
                  <div key={d.district} className="flex items-center gap-3">
                    <div className="w-40 shrink-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        #{d.rank} {d.district}
                      </p>
                      <p className="text-xs text-gray-400">{d.region}</p>
                    </div>
                    <div className="flex-1 relative h-7 bg-gray-50 rounded-lg overflow-hidden">
                      <div
                        className={`h-full transition-all ${above ? "bg-emerald-500" : "bg-amber-400"}`}
                        style={{ width: `${width}%` }}
                      />
                      {/* National avg marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-gray-700"
                        style={{ left: `${(data.nationalAveragePct / max) * 100}%` }}
                        title={`National avg: ${data.nationalAveragePct}%`}
                      />
                    </div>
                    <div className="w-24 shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-800">{d.atOrAboveBenchmarkPct}%</p>
                      <p className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${above ? "text-emerald-600" : "text-red-500"}`}>
                        {above ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {above ? "+" : ""}{d.gapPp} pp
                      </p>
                    </div>
                    <div className="w-20 text-right text-xs text-gray-400 shrink-0">
                      {d.learnersAssessed} learners
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 italic">
          Gray line shows the national average. Districts to the right of the line are above benchmark;
          districts to the left are below. &ldquo;At/above benchmark&rdquo; = `expected_vs_actual_status`
          indicates meeting/exceeding, OR composite score ≥ 60%.
        </p>
      </div>
    </PortalShell>
  );
}
