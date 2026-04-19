import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { getAnnualReportDataPostgres } from "@/lib/server/postgres/repositories/finance-intelligence";
import { FileText, Download, ChevronLeft, BarChart3, BookOpen, Users, Award, School as SchoolIcon } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export const metadata = { title: "Annual Report | Ozeki Finance" };

function fmtUgx(n: number): string {
  return `UGX ${n.toLocaleString()}`;
}

export default async function AnnualReportPage({ searchParams }: PageProps) {
  const user = await requirePortalStaffUser();
  const sp = await searchParams;
  const year = Number(sp.year) || new Date().getFullYear();
  const data = await getAnnualReportDataPostgres(year);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/finance"
      title={`Annual Report Preview — ${year}`}
      description="Auto-generated from live programme and finance data"
      actions={
        <a
          href={`/api/portal/finance/annual-report/${year}/pdf`}
          download
          className="button button-primary inline-flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </a>
      }
    >
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" />
          Finance overview
        </Link>

        {/* Year selector */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400 mr-2">Reporting year:</span>
          {years.map((y) => (
            <Link
              key={y}
              href={`/portal/finance/annual-report?year=${y}`}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${y === year ? "bg-[#006b61] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {y}
            </Link>
          ))}
        </div>

        {/* Headline banner */}
        <div className="rounded-2xl bg-gradient-to-br from-[#006b61] to-[#004d46] text-white p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Headline — {year}</p>
          <p className="text-lg md:text-xl font-semibold leading-tight mb-4">
            {data.headlines.schoolsSupported.toLocaleString()} schools supported ·{" "}
            {data.headlines.teachersTrained.toLocaleString()} teachers trained ·{" "}
            {data.headlines.learnersAssessed.toLocaleString()} learners assessed
          </p>
          {data.outcomes.improvementPp != null && (
            <p className="text-sm text-white/90">
              Learner comprehension improved by{" "}
              <strong className="text-white">
                {data.outcomes.improvementPp >= 0 ? "+" : ""}{data.outcomes.improvementPp} pp
              </strong>{" "}
              from baseline to endline. {data.headlines.programmeDeliveryPct}% of expenditure went to programme delivery.
            </p>
          )}
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><SchoolIcon className="w-3.5 h-3.5 text-gray-400" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Schools</p></div>
            <p className="text-2xl font-extrabold text-gray-900">{data.headlines.schoolsSupported}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Users className="w-3.5 h-3.5 text-gray-400" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Teachers</p></div>
            <p className="text-2xl font-extrabold text-gray-900">{data.headlines.teachersTrained}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><BookOpen className="w-3.5 h-3.5 text-gray-400" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Learners</p></div>
            <p className="text-2xl font-extrabold text-gray-900">{data.headlines.learnersAssessed}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Award className="w-3.5 h-3.5 text-gray-400" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fidelity</p></div>
            <p className="text-2xl font-extrabold text-gray-900">{data.outcomes.fidelityPct}%</p>
          </div>
        </div>

        {/* Outcomes */}
        {(data.outcomes.baselineComprehension != null || data.outcomes.endlineComprehension != null) && (
          <div className="rounded-2xl bg-white border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              Learner Reading Outcomes
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Baseline</p>
                <p className="text-3xl font-extrabold text-gray-800 mt-1">{data.outcomes.baselineComprehension ?? "—"}%</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Endline</p>
                <p className="text-3xl font-extrabold text-gray-800 mt-1">{data.outcomes.endlineComprehension ?? "—"}%</p>
              </div>
              <div className="rounded-lg bg-[#006b61] p-4 text-center">
                <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">Improvement</p>
                <p className="text-3xl font-extrabold text-white mt-1">
                  {data.outcomes.improvementPp != null
                    ? `${data.outcomes.improvementPp >= 0 ? "+" : ""}${data.outcomes.improvementPp} pp`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expenditure breakdown */}
        {data.finance.categoryBreakdown.length > 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Expenditure by Category</h2>
            <div className="space-y-2">
              {data.finance.categoryBreakdown.map((c) => (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="w-40 text-sm font-semibold text-gray-700 truncate">{c.category}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#006b61]" style={{ width: `${c.pctOfSpend}%` }} />
                  </div>
                  <span className="w-24 text-sm text-gray-700 font-bold text-right">{fmtUgx(c.totalUgx)}</span>
                  <span className="w-14 text-xs text-gray-400 font-mono text-right">{c.pctOfSpend}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">This preview reflects the same data used by the PDF exporter.</p>
            <p className="text-xs text-blue-700 mt-1">
              The PDF includes geographic reach, top districts, and a clean formatted narrative suitable
              for partners, board reports, and funder submissions.
            </p>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
