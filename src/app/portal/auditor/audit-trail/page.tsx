import { listAuditLogsForAuditor } from "@/lib/server/postgres/repositories/auditor-views";

export const dynamic = "force-dynamic";

export const metadata = { title: "Audit Trail · Audit Portal" };

interface PageProps {
  searchParams: Promise<{
    action?: string;
    targetTable?: string;
    user?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function AuditorAuditTrailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = {
    action: params.action || undefined,
    targetTable: params.targetTable || undefined,
    userQuery: params.user || undefined,
    fromDate: params.from || undefined,
    toDate: params.to || undefined,
    limit: 300,
  };
  const entries = await listAuditLogsForAuditor(filters);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-gray-900">Audit Trail</h2>
        <p className="text-sm text-gray-600 mt-1">
          Every privileged action across the portal. Read-only, ordered newest first, capped at 300 rows.
        </p>
      </header>

      <form className="rounded-2xl bg-white border border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div>
          <label htmlFor="action" className="font-semibold text-gray-500 uppercase tracking-wider">Action</label>
          <input id="action" name="action" defaultValue={params.action ?? ""} placeholder="create, update, delete…" className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200" />
        </div>
        <div>
          <label htmlFor="targetTable" className="font-semibold text-gray-500 uppercase tracking-wider">Table</label>
          <input id="targetTable" name="targetTable" defaultValue={params.targetTable ?? ""} placeholder="e.g. coaching_visits" className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200" />
        </div>
        <div>
          <label htmlFor="user" className="font-semibold text-gray-500 uppercase tracking-wider">User contains</label>
          <input id="user" name="user" defaultValue={params.user ?? ""} placeholder="name…" className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200" />
        </div>
        <div>
          <label htmlFor="from" className="font-semibold text-gray-500 uppercase tracking-wider">From</label>
          <input id="from" name="from" type="datetime-local" defaultValue={params.from ?? ""} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200" />
        </div>
        <div>
          <label htmlFor="to" className="font-semibold text-gray-500 uppercase tracking-wider">To</label>
          <input id="to" name="to" type="datetime-local" defaultValue={params.to ?? ""} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200" />
        </div>
        <div className="lg:col-span-5 flex items-center justify-end gap-2">
          <a href="/portal/auditor/audit-trail" className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900">Reset</a>
          <button type="submit" className="px-4 py-2 rounded-xl bg-[#066a67] text-white text-xs font-bold">Apply filters</button>
        </div>
      </form>

      <section className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5 text-left">When</th>
              <th className="px-4 py-2.5 text-left">User</th>
              <th className="px-4 py-2.5 text-left">Action</th>
              <th className="px-4 py-2.5 text-left">Target</th>
              <th className="px-4 py-2.5 text-left">Detail</th>
              <th className="px-4 py-2.5 text-left">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-500">No entries match these filters.</td></tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-800">{entry.userName} {entry.userId !== null ? <span className="text-gray-400">#{entry.userId}</span> : null}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#066a67]/10 text-[#066a67] uppercase tracking-wider">{entry.action}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    {entry.targetTable ?? "—"}
                    {entry.targetId ? <span className="text-gray-400"> · #{entry.targetId}</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 max-w-md truncate" title={entry.detail ?? ""}>{entry.detail ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{entry.ipAddress ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
