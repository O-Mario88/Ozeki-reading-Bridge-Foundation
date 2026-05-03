import Link from "next/link";
import type { Metadata } from "next";
import { getNationalBenchmarksPostgres } from "@/lib/server/postgres/repositories/national-intelligence";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { CTAStrip } from "@/components/public/CTAStrip";
import { BookOpen, Database, ChevronRight, BarChart3, Scale, Award } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "National Literacy Benchmarks | Ozeki Reading Bridge Foundation",
  description: "Uganda-wide primary reading benchmarks by grade and assessment cycle — baseline, progress, and endline norms. EGRA-comparable open data.",
  openGraph: {
    title: "National Literacy Benchmarks (Uganda)",
    description: "Open, research-grade reading norms by grade × term for Uganda primary schools.",
  },
};

function fmt(n: number | null): string {
  if (n === null) return "—";
  return n.toFixed(1);
}

function cycleLabel(cycle: string): string {
  if (cycle === "baseline") return "Baseline";
  if (cycle === "progress") return "Progress";
  if (cycle === "endline") return "Endline";
  return cycle;
}

function cycleColor(cycle: string): string {
  if (cycle === "baseline") return "bg-amber-50 text-amber-800 border-amber-200";
  if (cycle === "progress") return "bg-sky-50 text-sky-800 border-sky-200";
  if (cycle === "endline") return "bg-emerald-50 text-[#044f4d] border-emerald-200";
  return "bg-gray-50 text-gray-800 border-gray-200";
}

export default async function NationalBenchmarksPage() {
  // Graceful degradation if the DB is unreachable (CI build without DB, or
  // Amplify cold start before RDS is online).
  let report: Awaited<ReturnType<typeof getNationalBenchmarksPostgres>> = {
    asOf: new Date().toISOString(),
    totalLearnersAssessed: 0,
    benchmarks: [],
  };
  try {
    report = await getNationalBenchmarksPostgres();
  } catch (err) {
    console.error("[national-benchmarks] DB unreachable at build/request time", err);
  }

  const grades = Array.from(new Set(report.benchmarks.map((b) => b.grade))).sort();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#006b61] pt-28 pb-24 md:pt-36 md:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08),_transparent_60%)] pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 font-semibold text-sm mb-8 border border-white/20">
            <Database className="w-4 h-4" /> Open Research Data
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
            National Literacy<br className="hidden md:block" /> Benchmarks
          </h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-8">
            Uganda-wide primary reading norms by grade and assessment cycle.
            Comparable to EGRA national datasets, updated live from programme data.
          </p>
          <p className="text-sm text-white/70">
            Based on{" "}
            <strong className="text-white">{report.totalLearnersAssessed.toLocaleString()}</strong>{" "}
            unique learners assessed across Uganda · As of{" "}
            {new Date(report.asOf).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
      </section>

      {/* Legend */}
      <SectionWrapper theme="off-white" className="!pb-0">
        <div className="max-w-4xl mx-auto text-center -mt-10 bg-white rounded-2xl border border-gray-100 shadow-md p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Assessment Cycles</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold border bg-amber-50 text-amber-800 border-amber-200 mb-2">Baseline</span>
              <p className="text-xs text-gray-500">Beginning of programme cycle</p>
            </div>
            <div>
              <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold border bg-sky-50 text-sky-800 border-sky-200 mb-2">Progress</span>
              <p className="text-xs text-gray-500">Mid-term checkpoint</p>
            </div>
            <div>
              <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold border bg-emerald-50 text-[#044f4d] border-emerald-200 mb-2">Endline</span>
              <p className="text-xs text-gray-500">End of programme cycle</p>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Benchmarks by grade */}
      <SectionWrapper theme="off-white">
        <div className="max-w-6xl mx-auto space-y-8">
          {grades.length === 0 ? (
            <div className="rounded-2xl bg-white border border-dashed border-gray-200 py-16 text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Benchmarks will appear here as more learners are assessed</p>
              <p className="text-sm text-gray-400 mt-1">Minimum 10 unique learners required per grade × cycle cell.</p>
            </div>
          ) : (
            grades.map((grade) => {
              const rows = report.benchmarks.filter((b) => b.grade === grade);
              return (
                <div key={grade} className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-[#006b61]/5 border-b border-[#006b61]/10 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-extrabold text-[#006b61] flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Grade {grade}
                    </h2>
                    <span className="text-xs text-gray-500 font-semibold">
                      {rows.length} cycle{rows.length === 1 ? "" : "s"} reported
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/30">
                          <th className="py-3 px-4 font-semibold">Cycle</th>
                          <th className="py-3 px-4 font-semibold text-center">Letter ID</th>
                          <th className="py-3 px-4 font-semibold text-center">Sound ID</th>
                          <th className="py-3 px-4 font-semibold text-center">Decoding</th>
                          <th className="py-3 px-4 font-semibold text-center">Fluency</th>
                          <th className="py-3 px-4 font-semibold text-center">Comprehension</th>
                          <th className="py-3 px-4 font-semibold text-center">Composite</th>
                          <th className="py-3 px-4 font-semibold text-center">At Benchmark</th>
                          <th className="py-3 px-4 font-semibold text-right">n</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={`${r.grade}-${r.cycleType}`} className="border-b border-gray-50">
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${cycleColor(r.cycleType)}`}>
                                {cycleLabel(r.cycleType)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700">{fmt(r.letterIdentification)}</td>
                            <td className="py-3 px-4 text-center text-gray-700">{fmt(r.soundIdentification)}</td>
                            <td className="py-3 px-4 text-center text-gray-700">{fmt(r.decodableWords)}</td>
                            <td className="py-3 px-4 text-center text-gray-700">{fmt(r.fluencyAccuracy)}</td>
                            <td className="py-3 px-4 text-center text-gray-700">{fmt(r.readingComprehension)}</td>
                            <td className="py-3 px-4 text-center font-bold text-[#006b61]">{fmt(r.compositeAvg)}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-sm font-bold ${r.atOrAboveBenchmarkPct >= 60 ? "text-[#066a67]" : r.atOrAboveBenchmarkPct >= 40 ? "text-amber-700" : "text-red-600"}`}>
                                {r.atOrAboveBenchmarkPct}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-xs text-gray-500">
                              {r.learnersAssessed.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="max-w-4xl mx-auto mt-10 text-center">
          <p className="text-sm text-gray-500 italic">
            Scores shown are averages on a 0–100 scale. &ldquo;At benchmark&rdquo; reflects the share of learners
            whose results meet or exceed grade-level expectations. Minimum cell size: 10 unique learners.
          </p>
        </div>
      </SectionWrapper>

      {/* Research access CTA */}
      <SectionWrapper theme="charius-beige">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white border border-gray-100 p-6">
            <Database className="w-8 h-8 text-[#006b61] mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Research API Access</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ministry, UNICEF, and university research partners can request an API key for programmatic access
              to these benchmarks and related literacy indicators.
            </p>
            <Link
              href="/api/v1"
              target="_blank"
              className="inline-flex items-center gap-1 text-sm text-[#006b61] font-semibold hover:underline"
            >
              Explore the API <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-6">
            <Scale className="w-8 h-8 text-[#ff7235] mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Citation</h3>
            <p className="text-sm text-gray-600 mb-2">
              These benchmarks are released under CC BY 4.0. Please cite as:
            </p>
            <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg p-3 font-mono">
              Ozeki Reading Bridge Foundation (2026). National Primary Reading Benchmarks — Uganda. Retrieved from ozeki.org/national-benchmarks.
            </p>
          </div>
        </div>
      </SectionWrapper>

      <CTAStrip
        heading="Use this data in your research or policy work?"
        subheading="Reach out to discuss data partnerships, extended API access, or custom extracts."
        primaryButtonText="Contact Research Partnerships"
        primaryButtonHref="/contact"
        secondaryButtonText="Explore Impact Dashboard"
        secondaryButtonHref="/impact/overview"
        theme="brand"
      />
    </div>
  );
}
