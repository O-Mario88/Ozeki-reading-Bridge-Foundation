import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { format } from "date-fns";
import { FileText, Download, ShieldCheck, PieChart, TrendingUp, AlertCircle } from "lucide-react";
import type { FinanceCurrency, FinancePublicSnapshotRecord, FinanceAuditedStatementRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Financial Transparency | Ozeki Reading Bridge Foundation",
  description: "Public summaries of our ledger financials and independently audited statements.",
};

async function getTransparencyData() {
  const host = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${host}/api/transparency/financials`, { cache: "no-store" });
  if (!res.ok) {
    return { snapshots: [], audited: [] };
  }
  return res.json() as Promise<{
    snapshots: FinancePublicSnapshotRecord[];
    audited: FinanceAuditedStatementRecord[];
  }>;
}

export default async function PublicFinancialsPage() {
  const { snapshots, audited } = await getTransparencyData();

  const fnSnapshots = snapshots.filter(s => s.snapshotType === "fy");
  const qSnapshots = snapshots.filter(s => s.snapshotType === "quarterly");

  const formatMoney = (curr: FinanceCurrency, amt: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(amt);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-4">
              <ShieldCheck className="w-10 h-10 text-[#FA7D15]" />
              <h1 className="text-4xl font-extrabold text-[#00155F] tracking-tight">Financial Transparency</h1>
            </div>
            <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">
              As part of our commitment to donor trust and operational integrity, we publish aggregated summaries directly from our live ledger, alongside our official independently audited financial statements.
            </p>
            <div className="mt-4 inline-flex items-center text-sm font-medium text-amber-800 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 mr-2" />
              For safeguarding, personal information and individual vendor details are strictly excluded from public reports.
            </div>
          </div>

          <div className="space-y-16">
            {/* Annual Snapshots */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <PieChart className="w-6 h-6 mr-3 text-gray-400" />
                Annual Ledger Snapshots
              </h2>
              {fnSnapshots.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500 shadow-sm">
                  No annual snapshots published yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {fnSnapshots.map(s => (
                    <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                      <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-bold text-[#00155F]">FY {s.fy}</h3>
                            <p className="text-sm text-gray-500">Generated {format(new Date(s.publishedAt!), "MMM yyyy")}</p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                            {s.currency}
                          </span>
                        </div>
                      </div>
                      <div className="px-6 py-5 flex-grow space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 mb-1">Total Income</p>
                            <p className="font-semibold text-gray-900">{formatMoney(s.currency, s.totalIncome)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Total Expr.</p>
                            <p className="font-semibold text-gray-900">{formatMoney(s.currency, s.totalExpenditure)}</p>
                          </div>
                        </div>
                        {s.programPct !== null && s.adminPct !== null && (
                          <div className="pt-4 border-t border-gray-100">
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="font-medium text-[#FA7D15]">Program: {s.programPct}%</span>
                              <span className="text-gray-500">Core: {s.adminPct}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className="bg-[#FA7D15] h-2 rounded-full" style={{ width: `${s.programPct}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 mt-auto">
                        <a
                          href={`/api/transparency/financials/${s.id}/download?type=snapshot`}
                          download
                          className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-[#00155F] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00155F] transition-colors"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF Report
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Audited Statements */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <FileText className="w-6 h-6 mr-3 text-gray-400" />
                Audited Financial Statements
              </h2>
              {audited.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500 shadow-sm">
                  No audited statements published yet.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <ul className="divide-y divide-gray-100">
                    {audited.map(a => (
                      <li key={a.id} className="p-6 sm:px-8 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">FY {a.fy} Audited Financials</h3>
                          <div className="mt-1 flex items-center text-sm text-gray-500 space-x-4">
                            {a.auditorName && (
                              <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1 text-gray-400" /> Auditor: {a.auditorName}</span>
                            )}
                            <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-gray-300 mr-2" /> Published: {format(new Date(a.publishedAt!), "MMM yyyy")}</span>
                          </div>
                          {a.notes && <p className="mt-2 text-sm text-gray-600 line-clamp-2">{a.notes}</p>}
                        </div>
                        <a
                          href={`/api/transparency/financials/${a.id}/download?type=audited`}
                          download
                          className="shrink-0 inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00155F]"
                        >
                          <Download className="w-4 h-4 mr-2 text-gray-400" />
                          Download Audit
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Quarterly Snapshots (Optional Section if they exist) */}
            {qSnapshots.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <TrendingUp className="w-6 h-6 mr-3 text-gray-400" />
                  Quarterly Check-ins
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {qSnapshots.map(s => (
                    <a
                      key={s.id}
                      href={`/api/transparency/financials/${s.id}/download?type=snapshot`}
                      download
                      className="group p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-[#FA7D15] hover:shadow-md transition-all flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-gray-900">FY {s.fy} {s.quarter}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{s.currency}</p>
                        </div>
                        <Download className="w-5 h-5 text-gray-300 group-hover:text-[#FA7D15] transition-colors" />
                      </div>
                      <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center text-sm">
                        <span className="text-gray-500 text-xs">Net</span>
                        <span className={`font-medium ${s.net >= 0 ? "text-orange-600" : "text-red-500"}`}>
                          {formatMoney(s.currency, s.net)}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
