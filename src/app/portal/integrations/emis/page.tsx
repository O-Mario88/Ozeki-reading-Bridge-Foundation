import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalSuperAdminUser } from "@/lib/auth";
import { getEmisStatus, listRecentEmisRuns } from "@/lib/server/emis-adapter";
import { EmisSyncControls } from "@/components/portal/integrations/EmisSyncControls";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Uganda EMIS · Integrations",
  description: "Bi-directional sync with the Uganda Ministry of Education EMIS.",
};

export default async function EmisIntegrationPage() {
  const user = await requirePortalSuperAdminUser();
  const [status, runs] = await Promise.all([getEmisStatus(), listRecentEmisRuns(20)]);

  return (
    <PortalShell user={user} activeHref="/portal/integrations/emis" title="Uganda EMIS sync" description="Pulls school + teacher roster from EMIS; pushes Ozeki learning outcomes back. Status below.">
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card label="Adapter status" value={status.configured ? "Configured" : "Mock mode"} ok={status.configured} hint={status.configured ? "EMIS credentials present" : "Set EMIS_API_BASE_URL and EMIS_API_TOKEN to enable real syncs."} />
        <Card label="Last pull" value={status.lastPullAt ? new Date(status.lastPullAt).toLocaleString() : "Never"} ok={Boolean(status.lastPullAt)} hint={`Frequency: every ${status.pullFrequencyMinutes} min`} />
        <Card label="Schools linked" value={String(status.schoolsLinked)} ok={status.schoolsLinked > 0} hint="Ozeki schools mapped to an EMIS school code" />
      </section>

      <EmisSyncControls />

      <section className="rounded-2xl bg-white border border-gray-100 overflow-hidden mt-6">
        <header className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Recent runs</h3>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5 text-left">Started</th>
              <th className="px-4 py-2.5 text-left">Direction</th>
              <th className="px-4 py-2.5 text-left">Trigger</th>
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-right">Schools</th>
              <th className="px-4 py-2.5 text-right">Teachers</th>
              <th className="px-4 py-2.5 text-right">Outcomes</th>
              <th className="px-4 py-2.5 text-left">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {runs.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-gray-500">No EMIS runs recorded yet.</td></tr>
            ) : runs.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(r.startedAt).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-xs font-semibold text-gray-700 inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {r.direction}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{r.trigger}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    r.status === "success" ? "bg-emerald-50 text-emerald-700"
                      : r.status === "mock" ? "bg-amber-50 text-amber-700"
                        : r.status === "partial" ? "bg-yellow-50 text-yellow-700"
                          : "bg-red-50 text-red-700"
                  }`}>{r.status}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-700 text-right">{r.schoolsIn}</td>
                <td className="px-4 py-2.5 text-xs text-gray-700 text-right">{r.teachersIn}</td>
                <td className="px-4 py-2.5 text-xs text-gray-700 text-right">{r.outcomesOut}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600 max-w-xl truncate" title={r.summary ?? ""}>{r.summary ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PortalShell>
  );
}

function Card({ label, value, ok, hint }: { label: string; value: string; ok: boolean; hint: string }) {
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-base font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-[10px] text-gray-500 mt-1">{hint}</p>
        </div>
        <Icon className={`w-5 h-5 mt-1 ${ok ? "text-emerald-600" : "text-amber-500"}`} />
      </div>
    </div>
  );
}
