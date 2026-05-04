import { notFound } from "next/navigation";
import Link from "next/link";
import { FileDown, Repeat, Sparkles } from "lucide-react";
import { requireExternalUser } from "@/lib/external-auth";
import { ExternalShell } from "@/components/external/ExternalShell";
import { findExternalUserByRefCodePostgres } from "@/lib/server/postgres/repositories/external-users";
import {
  getDonorPortfolioTotals,
  listDonorAllocations,
  listDonorImpactSnapshots,
  listDonorSubscriptions,
} from "@/lib/server/postgres/repositories/donor-portfolio";
import { DonorRecurringManager } from "@/components/external/DonorRecurringManager";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ ref: string }>;
}

const NUMBER = new Intl.NumberFormat("en-US");
const UGX = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});

export default async function DonorPortfolioPage({ params }: PageProps) {
  const session = await requireExternalUser("donor");
  const { ref } = await params;
  const target = await findExternalUserByRefCodePostgres(ref);
  if (!target || target.role !== "donor" || target.id !== session.id) notFound();

  const [allocations, snapshots, subscriptions, totals] = await Promise.all([
    listDonorAllocations(session.id),
    listDonorImpactSnapshots(session.id, 12),
    listDonorSubscriptions(session.id),
    getDonorPortfolioTotals(session.id),
  ]);

  const fy = new Date().getUTCFullYear();
  const taxPdfUrl = `/api/portal/donors/${ref}/tax-summary?fy=${fy}`;

  return (
    <ExternalShell
      user={session}
      roleLabel="Donor"
      title={`Hi ${session.fullName.split(" ")[0]}, here is your portfolio`}
      description="Live view of your allocations, attributed impact, and recurring giving."
      navItems={[
        { href: "/portal/donors/dashboard", label: "Overview" },
        { href: `/portal/donors/${ref}/portfolio`, label: "Portfolio" },
      ]}
    >
      {/* Top totals */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Tile label="Total contributed" primary={UGX.format(totals.totalUgx)} secondary={`${totals.allocations} allocation${totals.allocations === 1 ? "" : "s"}`} />
        <Tile label="Learners reached" primary={NUMBER.format(totals.learnersReached)} />
        <Tile label="Learners improved" primary={NUMBER.format(totals.learnersImproved)} />
        <Tile label="Teachers trained" primary={NUMBER.format(totals.teachersTrained)} />
      </section>

      {/* Tax summary callout */}
      <section className="rounded-2xl bg-gradient-to-r from-[#066a67]/10 to-transparent border border-[#066a67]/20 p-5 mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#066a67] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Year-end tax summary
          </p>
          <p className="text-sm text-gray-800 mt-1">Download a printable PDF of your {fy} contributions for tax-deduction purposes.</p>
        </div>
        <Link href={taxPdfUrl} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#066a67] text-white text-sm font-bold hover:bg-[#066a67]/90">
          <FileDown className="w-4 h-4" /> Download {fy} PDF
        </Link>
      </section>

      {/* Allocations */}
      <section className="rounded-2xl bg-white border border-gray-100 overflow-hidden mb-6">
        <header className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Your allocations</h3>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5 text-left">Reference</th>
              <th className="px-4 py-2.5 text-left">Programme</th>
              <th className="px-4 py-2.5 text-left">Region</th>
              <th className="px-4 py-2.5 text-left">Period</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
              <th className="px-4 py-2.5 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allocations.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-500">No allocations on file yet. Once your gift is recorded, it will appear here.</td></tr>
            ) : (
              allocations.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-700">{a.referenceCode}</td>
                  <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{a.programme}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{a.region ?? "Country-wide"}{a.district ? ` · ${a.district}` : ""}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{a.startDate}{a.endDate ? ` → ${a.endDate}` : ""}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right">{UGX.format(a.amountUgx)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      a.status === "active" ? "bg-emerald-50 text-emerald-700"
                        : a.status === "completed" ? "bg-gray-100 text-gray-700"
                          : "bg-red-50 text-red-700"
                    }`}>{a.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Recurring */}
      <section className="rounded-2xl bg-white border border-gray-100 p-5 mb-6">
        <header className="flex items-center gap-2 mb-3">
          <Repeat className="w-4 h-4 text-[#066a67]" />
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Recurring giving</h3>
        </header>
        <DonorRecurringManager refCode={ref} initialSubscriptions={subscriptions} />
      </section>

      {/* Impact snapshots */}
      <section className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Monthly impact digest</h3>
          <p className="text-xs text-gray-500 mt-1">Live attribution of your funded delivery. Last 12 months.</p>
        </header>
        {snapshots.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-gray-500">No snapshots generated yet. Your first monthly digest will appear here.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {snapshots.map((s) => (
              <li key={s.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.periodStart} → {s.periodEnd}</p>
                    {s.highlightText ? (
                      <p className="text-sm text-gray-800 mt-1">{s.highlightText}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#066a67]">{UGX.format(s.amountAttributedUgx)}</p>
                    <p className="text-[10px] text-gray-500">attributed</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-700">
                  <span><strong>{NUMBER.format(s.learnersReached)}</strong> learners reached</span>
                  <span><strong>{NUMBER.format(s.learnersImproved)}</strong> improved</span>
                  <span><strong>{NUMBER.format(s.teachersTrained)}</strong> teachers trained</span>
                  <span><strong>{NUMBER.format(s.evidencePhotos)}</strong> photos on file</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ExternalShell>
  );
}

function Tile({ label, primary, secondary }: { label: string; primary: string; secondary?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-4">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{primary}</p>
      {secondary ? <p className="text-[10px] text-gray-500 mt-0.5">{secondary}</p> : null}
    </div>
  );
}
