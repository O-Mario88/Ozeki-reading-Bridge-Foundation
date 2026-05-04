import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink, ShieldCheck, ArrowLeft } from "lucide-react";
import {
  getCostPerBeneficiarySummary,
  listPeerBenchmarksByMetric,
  type CostPerBeneficiaryFigure,
  type MetricKey,
  type PeerBenchmarkRow,
} from "@/lib/server/postgres/repositories/cost-per-beneficiary";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Cost per Beneficiary · Ozeki Reading Bridge Foundation",
  description:
    "Live cost-per-beneficiary metrics: every Uganda shilling spent traced to learners reached, learners improved, and teachers trained — with peer benchmarks.",
};

const NUMBER = new Intl.NumberFormat("en-US");
const UGX = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

type MetricCardProps = {
  metricKey: MetricKey;
  title: string;
  subtitle: string;
  figure: CostPerBeneficiaryFigure;
  benchmarks: PeerBenchmarkRow[];
};

function MetricCard({ title, subtitle, figure, benchmarks }: MetricCardProps) {
  return (
    <article className="rounded-2xl bg-white border border-gray-100 p-6">
      <header className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Programme spend</p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {figure.totalProgrammeSpendUgx > 0 ? UGX.format(figure.totalProgrammeSpendUgx) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Beneficiaries</p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {figure.beneficiaryCount > 0 ? NUMBER.format(figure.beneficiaryCount) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Cost per unit</p>
          <p className="text-sm font-bold text-[#066a67] mt-1">
            {figure.costPerUnitUsd !== null ? USD.format(figure.costPerUnitUsd) : "—"}
          </p>
          {figure.costPerUnitUgx !== null ? (
            <p className="text-[10px] text-gray-500 mt-0.5">{UGX.format(figure.costPerUnitUgx)} UGX</p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Peer benchmarks</h4>
        {benchmarks.length === 0 ? (
          <p className="text-xs text-gray-500">No peer benchmarks on file for this metric.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {benchmarks.map((bench) => {
              const ratio =
                figure.costPerUnitUsd !== null && figure.costPerUnitUsd > 0
                  ? figure.costPerUnitUsd / bench.costPerUnitUsd
                  : null;
              return (
                <li key={bench.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800">{bench.peerOrgName}</p>
                    <p className="text-[10px] text-gray-500">
                      {bench.region ? `${bench.region} · ` : ""}{bench.sourceYear}
                      {" · "}
                      <a href={bench.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#066a67] hover:underline inline-flex items-center gap-0.5">
                        source <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </p>
                    {bench.notes ? (
                      <p className="text-[10px] text-gray-500 mt-0.5 italic">{bench.notes}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-700">{USD.format(bench.costPerUnitUsd)}</p>
                    {ratio !== null ? (
                      <p className={`text-[10px] font-semibold ${ratio < 1 ? "text-emerald-600" : ratio > 1 ? "text-amber-600" : "text-gray-500"}`}>
                        {ratio < 1 ? `Ozeki is ${((1 - ratio) * 100).toFixed(0)}% lower` :
                          ratio > 1 ? `Ozeki is ${((ratio - 1) * 100).toFixed(0)}% higher` : "match"}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}

export default async function PublicFinanceTransparencyPage() {
  const summary = await getCostPerBeneficiarySummary();
  const [reachedBenchmarks, improvedBenchmarks, trainedBenchmarks] = await Promise.all([
    listPeerBenchmarksByMetric("cost_per_learner_reached"),
    listPeerBenchmarksByMetric("cost_per_learner_improved"),
    listPeerBenchmarksByMetric("cost_per_teacher_trained"),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link href="/transparency" className="text-xs font-semibold text-[#066a67] hover:underline inline-flex items-center gap-1 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Transparency hub
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">Cost per Beneficiary</h1>
          <p className="text-base text-gray-700 mt-3 max-w-3xl">
            Every Uganda shilling we deploy on programme delivery, traced to the children
            and teachers it actually reaches. Live from the production database. Compare
            us to widely-cited peer organisations side-by-side.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 text-[#066a67]" />
            Generated {new Date(summary.generatedAt).toLocaleString()} · {summary.ugxPerUsd.toLocaleString()} UGX/USD heuristic
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MetricCard
          metricKey="cost_per_learner_reached"
          title="Cost per learner reached"
          subtitle="Programme spend ÷ distinct learners with at least one assessment on file."
          figure={summary.figures.learnersReached}
          benchmarks={reachedBenchmarks}
        />
        <MetricCard
          metricKey="cost_per_learner_improved"
          title="Cost per learner improved"
          subtitle="Programme spend ÷ learners whose endline reading-stage exceeded their baseline."
          figure={summary.figures.learnersImproved}
          benchmarks={improvedBenchmarks}
        />
        <MetricCard
          metricKey="cost_per_teacher_trained"
          title="Cost per teacher trained"
          subtitle="Programme spend ÷ distinct teachers with at least one training participation recorded."
          figure={summary.figures.teachersTrained}
          benchmarks={trainedBenchmarks}
        />
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <article className="rounded-2xl bg-white border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">How these numbers are computed</h2>
          <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
            <li><strong>Programme spend</strong> = sum of posted debits to programme-delivery expense accounts (chart-of-accounts code starting with <code>5</code>) in the live general ledger.</li>
            <li><strong>Learners reached</strong> = distinct <code>learner_uid</code> with at least one <code>assessment_records</code> entry — every child the team has actually met and assessed.</li>
            <li><strong>Learners improved</strong> = learners whose latest <em>endline</em> assessment lands at a higher reading-stage band than their earliest <em>baseline</em>. When stage data is missing on either side, we fall back to the comprehension-score delta.</li>
            <li><strong>Teachers trained</strong> = distinct <code>teacher_uid</code> with at least one recorded participation across our in-person training register and the portal training-attendance log.</li>
            <li><strong>UGX → USD</strong> uses a stable 3,800 UGX/USD heuristic so the figure stays comparable quarter-over-quarter; for live FX, see <Link href="/transparency/financials" className="text-[#066a67] hover:underline">/transparency/financials</Link>.</li>
            <li><strong>Peer benchmarks</strong> are stored in the <code>cost_peer_benchmarks</code> table and each row links back to a primary public source.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
