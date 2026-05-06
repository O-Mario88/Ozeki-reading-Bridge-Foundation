import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import {
  listPublicDistrictLearningOutcomes,
  getPublicReadingStageShift,
  getPublicReadingStageDistribution,
  type DistrictLearningOutcomeRow,
} from "@/lib/server/postgres/repositories/public-metrics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Learning Outcomes — Ozeki Reading Bridge Foundation",
  description:
    "District-by-district baseline-to-endline reading progression across schools we serve. Learners with both a baseline and an endline assessment, paired and compared.",
  openGraph: {
    title: "Learning Outcomes",
    description: "Reading progression by district, refreshed from our database.",
  },
};

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function deltaTone(delta: number | null): string {
  if (delta == null) return "text-gray-400";
  if (delta >= 4) return "text-[#066a67]";
  if (delta >= 1) return "text-emerald-600";
  if (delta >= 0) return "text-gray-700";
  return "text-red-600";
}

export default async function LearningOutcomesPage() {
  const [districts, shift, distribution] = await Promise.all([
    listPublicDistrictLearningOutcomes().catch(() => [] as DistrictLearningOutcomeRow[]),
    getPublicReadingStageShift().catch(() => null),
    getPublicReadingStageDistribution().catch(() => null),
  ]);

  const totalDistricts = districts.length;
  const totalLearnersPaired = districts.reduce((a, b) => a + b.learnersPaired, 0);
  const totalSchools = districts.reduce((a, b) => a + b.schoolsAssessed, 0);
  const districtsWithImprovement = districts.filter((d) => (d.deltaPoints ?? 0) > 0).length;

  return (
    <>
      {/* Hero */}
      <SectionWrapper theme="brand" className="py-20">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-charius-orange font-semibold tracking-wider text-sm uppercase block mb-3">
            Live Learning-Outcomes Dashboard
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            Where reading is moving, district by district
          </h1>
          <p className="text-lg text-white/85 leading-relaxed">
            Every learner counted here has both a baseline and an endline assessment on file. We pair them, average the
            district, and publish only when at least 5 learners are paired — so the numbers are honest about what they
            represent.
          </p>
        </div>
      </SectionWrapper>

      {/* Top-line summary */}
      {(totalDistricts > 0 || shift) && (
        <SectionWrapper theme="light" className="py-14 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-[#111] tabular-nums">{formatNumber(totalDistricts)}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">
                Districts with paired data
              </p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-extrabold text-[#111] tabular-nums">{formatNumber(totalSchools)}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">
                Schools represented
              </p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-extrabold text-[#111] tabular-nums">{formatNumber(totalLearnersPaired)}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">
                Learners paired baseline → endline
              </p>
            </div>
            <div className="text-center">
              {shift && shift.deltaPoints != null ? (
                <>
                  <p className="text-4xl font-extrabold text-[#066a67] tabular-nums">
                    {shift.deltaPoints > 0 ? "+" : ""}{shift.deltaPoints} pts
                  </p>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">
                    Network avg composite shift
                  </p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-extrabold text-[#111] tabular-nums">{districtsWithImprovement}</p>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">
                    Districts showing positive movement
                  </p>
                </>
              )}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* Table */}
      <SectionWrapper theme="off-white" className="py-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#111] tracking-tight">
                District ranking by baseline → endline movement
              </h2>
              <p className="text-gray-600 mt-2 text-sm md:text-base">
                Sorted by composite-score delta. Districts with fewer than 5 paired learners are excluded.
              </p>
            </div>
          </div>

          {districts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <p className="text-lg font-semibold text-[#111] mb-2">No paired cohorts to publish yet</p>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Districts appear here once at least 5 learners in a district have completed both a baseline and an
                endline assessment. Until then, this dashboard stays empty.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Header row */}
              <div
                className="hidden md:grid items-center px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-100 gap-3"
                style={{ gridTemplateColumns: "minmax(0,1.6fr) 110px 100px 110px 110px 110px 130px" }}
              >
                <span>District / Region</span>
                <span className="text-center">Schools</span>
                <span className="text-center">Learners</span>
                <span className="text-center">Baseline</span>
                <span className="text-center">Endline</span>
                <span className="text-center">Δ pts</span>
                <span className="text-center">Moved up ≥1</span>
              </div>
              {districts.map((d) => (
                <div
                  key={`${d.district}-${d.region ?? "x"}`}
                  className="grid items-center px-5 py-4 text-[13px] border-b border-gray-50 last:border-b-0 gap-3
                    md:grid-cols-[minmax(0,1.6fr)_110px_100px_110px_110px_110px_130px]
                    grid-cols-2"
                >
                  <div className="col-span-2 md:col-span-1 min-w-0">
                    <p className="font-bold text-[#111] truncate">{d.district}</p>
                    {d.region && <p className="text-xs text-gray-500 truncate">{d.region}</p>}
                  </div>
                  <span className="text-center text-gray-700 tabular-nums">
                    <span className="md:hidden text-[10px] uppercase font-bold text-gray-400 mr-1">Schools</span>
                    {d.schoolsAssessed}
                  </span>
                  <span className="text-center text-gray-700 tabular-nums">
                    <span className="md:hidden text-[10px] uppercase font-bold text-gray-400 mr-1">Learners</span>
                    {formatNumber(d.learnersPaired)}
                  </span>
                  <span className="text-center text-gray-700 tabular-nums">
                    <span className="md:hidden text-[10px] uppercase font-bold text-gray-400 mr-1">Baseline</span>
                    {d.baselineAvgComposite ?? "—"}
                  </span>
                  <span className="text-center text-gray-700 tabular-nums">
                    <span className="md:hidden text-[10px] uppercase font-bold text-gray-400 mr-1">Endline</span>
                    {d.endlineAvgComposite ?? "—"}
                  </span>
                  <span className={`text-center font-bold tabular-nums ${deltaTone(d.deltaPoints)}`}>
                    <span className="md:hidden text-[10px] uppercase font-bold text-gray-400 mr-1">Δ</span>
                    {d.deltaPoints != null ? `${d.deltaPoints > 0 ? "+" : ""}${d.deltaPoints}` : "—"}
                  </span>
                  <span className="text-center text-gray-700 tabular-nums">
                    <span className="md:hidden text-[10px] uppercase font-bold text-gray-400 mr-1">Moved up</span>
                    {d.movedUpSharePct != null ? `${d.movedUpSharePct}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionWrapper>

      {/* Network-wide reading-stage distribution */}
      {distribution && (
        <SectionWrapper theme="light" className="py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-[#111] tracking-tight">
                Where {formatNumber(distribution.totalLearners)} learners stand right now
              </h2>
              <p className="text-gray-600 mt-2 text-sm md:text-base">
                Each learner counted once at their most-recent assessment.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
              {distribution.bands.map((band) => (
                <div key={band.key} className="grid grid-cols-[160px_1fr_auto] items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">{band.label}</span>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-charius-orange rounded-full"
                      style={{ width: `${Math.max(band.sharePct, band.count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[#111] tabular-nums whitespace-nowrap">
                    {band.sharePct}% <span className="text-gray-400 font-normal">({formatNumber(band.count)})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* Methodology footer */}
      <SectionWrapper theme="charius-beige" className="py-14">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-xl font-bold text-[#111] mb-3">How this is computed</h3>
          <p className="text-gray-700 leading-relaxed text-sm md:text-base mb-4">
            We join each learner&rsquo;s baseline and endline assessment records by their unique learner UID, then
            average composite scores within each district. We exclude any district with fewer than 5 paired learners.
            Reading-stage movement is computed from the same paired records using a 5-stage rank
            (pre-reader → emergent → minimum → competent → strong).
          </p>
          <Link href="/transparency" className="text-charius-orange font-semibold hover:underline">
            Read the full transparency methodology →
          </Link>
        </div>
      </SectionWrapper>
    </>
  );
}
