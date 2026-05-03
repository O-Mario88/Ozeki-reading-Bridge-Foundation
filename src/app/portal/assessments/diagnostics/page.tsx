import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import { getItemDiagnosticsPostgres } from "@/lib/server/postgres/repositories/assessment-intelligence";
import { Microscope, AlertTriangle, Clock, ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ domain?: string }>;
}

export const metadata = { title: "Item-Level Diagnostics | Ozeki Portal" };

function accuracyColor(pct: number): string {
  if (pct >= 75) return "text-[#066a67] bg-emerald-50";
  if (pct >= 50) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

export default async function DiagnosticsPage({ searchParams }: PageProps) {
  const user = await requirePortalStaffUser();
  const sp = await searchParams;
  const data = await getItemDiagnosticsPostgres({ domainKey: sp.domain, limit: 100 });

  const domains = ["gpc", "blending", "fluency", "comprehension", "phonemic_awareness", "sentence"];

  return (
    <PortalShell
      user={user}
      activeHref="/portal/assessments"
      title="Item-Level Diagnostics"
      description="Which specific phonics items are hardest nationally? Where is regional variation widest?"
    >
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Link
          href="/portal/assessments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
          Assessments overview
        </Link>

        {/* Domain filter */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/portal/assessments/diagnostics"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!sp.domain ? "bg-[#006b61] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            All Domains
          </Link>
          {domains.map((d) => (
            <Link
              key={d}
              href={`/portal/assessments/diagnostics?domain=${d}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${sp.domain === d ? "bg-[#006b61] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {d.replace("_", " ")}
            </Link>
          ))}
        </div>

        {/* Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Microscope className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Items Analysed</p>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{data.totalItems}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Responses</p>
            <p className="text-3xl font-extrabold text-gray-900">{data.totalResponses.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Hardest Item</p>
            <p className="text-sm font-bold text-red-700 truncate">
              {data.items[0]?.itemKey ?? "—"} ({data.items[0]?.nationalAccuracyPct ?? "—"}%)
            </p>
          </div>
        </div>

        {/* Items table */}
        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Items ranked by accuracy (hardest first)
            </p>
          </div>
          <div className="px-2">
            <DashboardListHeader template="minmax(0,1.2fr) 130px 90px 110px 100px 130px minmax(0,1.2fr)">
              <span>Item</span>
              <span>Domain</span>
              <span className="text-center">Accuracy</span>
              <span className="text-center">Avg Latency</span>
              <span className="text-center">Responses</span>
              <span className="text-right">Regional Variance</span>
              <span>Hardest Region</span>
            </DashboardListHeader>
            {data.items.map((item) => (
              <DashboardListRow
                key={item.itemKey}
                template="minmax(0,1.2fr) 130px 90px 110px 100px 130px minmax(0,1.2fr)"
              >
                <span className="font-mono font-semibold text-gray-800 truncate">{item.itemKey}</span>
                <span className="text-gray-500 capitalize truncate">{item.domainKey.replace("_", " ")}</span>
                <span className="text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${accuracyColor(item.nationalAccuracyPct)}`}>
                    {item.nationalAccuracyPct}%
                  </span>
                </span>
                <span className="text-center text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-300" />
                    {(item.avgLatencyMs / 1000).toFixed(1)}s
                  </span>
                </span>
                <span className="text-center text-gray-500">{item.responseCount.toLocaleString()}</span>
                <span className="text-right">
                  {item.regionalVariance > 10 && (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold mr-1">
                      <AlertTriangle className="w-3 h-3" />
                    </span>
                  )}
                  <span className="font-mono text-xs text-gray-600">±{item.regionalVariance} pp</span>
                </span>
                <span className="text-xs text-gray-500 truncate">
                  {item.hardestRegion ? (
                    <>
                      <strong className="text-red-700">{item.hardestRegion.region}</strong>
                      <span className="text-gray-400"> ({item.hardestRegion.accuracyPct}%)</span>
                    </>
                  ) : "—"}
                </span>
              </DashboardListRow>
            ))}
            {data.items.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-400 italic">
                No item-level responses recorded yet.
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 italic">
          Items require ≥5 responses to appear. Regional variance is computed as the standard deviation
          of accuracy across regions with ≥3 responses each.
        </p>
      </div>
    </PortalShell>
  );
}
