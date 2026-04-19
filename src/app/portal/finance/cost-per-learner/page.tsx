import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { getCostPerLearnerPostgres } from "@/lib/server/postgres/repositories/finance-intelligence";
import { DollarSign, Users, ChevronLeft, TrendingDown, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export const metadata = { title: "Cost per Learner | Ozeki Finance" };

function fmtUgx(n: number): string {
  return `UGX ${n.toLocaleString()}`;
}
function fmtUsd(n: number): string {
  return `$${n.toLocaleString()}`;
}

export default async function CostPerLearnerPage({ searchParams }: PageProps) {
  const user = await requirePortalStaffUser();
  const sp = await searchParams;
  const data = await getCostPerLearnerPostgres({
    periodStart: sp.from,
    periodEnd: sp.to,
  });

  // Highlight districts significantly more or less expensive than national
  const nationalCost = data.national.costPerLearnerUgx;
  const districts = data.districts.map((d) => ({
    ...d,
    deltaPct: nationalCost > 0 ? Math.round(((d.costPerLearnerUgx - nationalCost) / nationalCost) * 100) : 0,
  }));

  const maxCost = Math.max(nationalCost, ...districts.map((d) => d.costPerLearnerUgx), 1);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/finance"
      title="Cost per Learner"
      description="Total programme spend ÷ learners assessed — the core metric for government budget justification and donor reporting"
    >
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" />
          Finance overview
        </Link>

        {/* Headline */}
        <div className="rounded-2xl bg-gradient-to-br from-[#006b61] to-[#004d46] text-white p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">
            National Average Cost per Learner
          </p>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-5xl font-extrabold mb-1">{fmtUgx(data.national.costPerLearnerUgx)}</p>
              <p className="text-lg text-white/80">≈ {fmtUsd(data.national.costPerLearnerUsd)}</p>
            </div>
            <div className="text-sm text-white/70 border-l border-white/20 pl-5">
              <p>Total spend: <strong className="text-white">{fmtUgx(data.national.totalSpendUgx)}</strong></p>
              <p>Learners assessed: <strong className="text-white">{data.national.learnersAssessed.toLocaleString()}</strong></p>
              <p>USD rate: 1 USD = {data.usdRate.toLocaleString()} UGX</p>
            </div>
          </div>
        </div>

        {/* Period filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400 mr-2">Period:</span>
          {[
            { label: "All time", href: "/portal/finance/cost-per-learner" },
            { label: "This year", href: `/portal/finance/cost-per-learner?from=${new Date().getFullYear()}-01-01&to=${new Date().getFullYear()}-12-31` },
            { label: "Last year", href: `/portal/finance/cost-per-learner?from=${new Date().getFullYear() - 1}-01-01&to=${new Date().getFullYear() - 1}-12-31` },
          ].map((o) => {
            const active = (sp.from ?? "") + (sp.to ?? "") === o.href.split("?")[1]?.replace("from=", "").replace("&to=", "").replace(/\?/g, "") ||
              (o.href === "/portal/finance/cost-per-learner" && !sp.from && !sp.to);
            return (
              <Link
                key={o.label}
                href={o.href}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${active ? "bg-[#006b61] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {o.label}
              </Link>
            );
          })}
          {(sp.from || sp.to) && (
            <span className="text-xs text-gray-500 ml-2">
              {sp.from ?? "—"} → {sp.to ?? "—"}
            </span>
          )}
        </div>

        {/* District table */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            District Breakdown ({districts.length} districts)
          </h2>

          {districts.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-8">
              No district-level data yet. Districts appear once assessments + expenses are logged.
            </p>
          ) : (
            <div className="space-y-2">
              {districts.map((d) => {
                const width = (d.costPerLearnerUgx / maxCost) * 100;
                const above = d.deltaPct > 5;
                const below = d.deltaPct < -5;
                return (
                  <div key={d.scope} className="flex items-center gap-3">
                    <div className="w-44 shrink-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{d.scope}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {d.learnersAssessed.toLocaleString()} learners
                      </p>
                    </div>
                    <div className="flex-1 relative h-7 bg-gray-50 rounded-lg overflow-hidden">
                      <div
                        className={`h-full transition-all ${above ? "bg-amber-400" : below ? "bg-emerald-500" : "bg-blue-400"}`}
                        style={{ width: `${width}%` }}
                      />
                      {/* National line marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-gray-700"
                        style={{ left: `${(nationalCost / maxCost) * 100}%` }}
                        title={`National avg: ${fmtUgx(nationalCost)}`}
                      />
                    </div>
                    <div className="w-36 shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-800">{fmtUgx(d.costPerLearnerUgx)}</p>
                      <p className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${above ? "text-amber-700" : below ? "text-emerald-600" : "text-gray-400"}`}>
                        {above ? <TrendingUp className="w-3 h-3" /> : below ? <TrendingDown className="w-3 h-3" /> : null}
                        {d.deltaPct >= 0 ? "+" : ""}{d.deltaPct}% vs national
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 italic">
          District costs combine expenses restricted to that district with a pro-rata share of unrestricted
          programme spend (allocated by learner count). The gray line marks the national average.
          Districts significantly below are most efficient; districts far above may signal delivery challenges.
        </p>
      </div>
    </PortalShell>
  );
}
