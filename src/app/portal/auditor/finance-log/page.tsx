import { listFinancePostingLogForAuditor } from "@/lib/server/postgres/repositories/auditor-views";

export const dynamic = "force-dynamic";

export const metadata = { title: "Finance Posting Log · Audit Portal" };

export default async function AuditorFinanceLogPage() {
  const entries = await listFinancePostingLogForAuditor(300);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-gray-900">Finance Posting Log</h2>
        <p className="text-sm text-gray-600 mt-1">
          Every audit-log entry that touches a finance-related table — donations,
          expenses, receipts, audited statements, and the finance audit chain.
          Capped at 300 entries, newest first.
        </p>
      </header>

      <section className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5 text-left">When</th>
              <th className="px-4 py-2.5 text-left">User</th>
              <th className="px-4 py-2.5 text-left">Action</th>
              <th className="px-4 py-2.5 text-left">Table</th>
              <th className="px-4 py-2.5 text-left">Detail</th>
              <th className="px-4 py-2.5 text-left">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-500">No finance-related audit entries on file yet.</td></tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-800">{entry.userName}{entry.userId !== null ? <span className="text-gray-400"> #{entry.userId}</span> : null}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 uppercase tracking-wider">{entry.action}</span>
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
