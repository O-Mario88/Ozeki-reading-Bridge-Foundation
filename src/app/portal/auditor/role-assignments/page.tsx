import { listRoleAssignmentsForAuditor } from "@/lib/server/postgres/repositories/auditor-views";

export const dynamic = "force-dynamic";

export const metadata = { title: "Role Assignments · Audit Portal" };

function flagPills(row: {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isME: boolean;
  isSupervisor: boolean;
}) {
  const pills: { label: string; tone: "danger" | "warn" | "info" }[] = [];
  if (row.isSuperAdmin) pills.push({ label: "SuperAdmin", tone: "danger" });
  if (row.isAdmin) pills.push({ label: "Admin", tone: "danger" });
  if (row.isME) pills.push({ label: "M&E", tone: "warn" });
  if (row.isSupervisor) pills.push({ label: "Supervisor", tone: "warn" });
  return pills;
}

export default async function AuditorRoleAssignmentsPage() {
  const rows = await listRoleAssignmentsForAuditor();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-gray-900">Role Assignments</h2>
        <p className="text-sm text-gray-600 mt-1">
          Every portal user, their role, status, and elevated-permission flags.
          Sorted with the most privileged first.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Total users: <strong>{rows.length}</strong> ·
          {" "}Active: <strong>{rows.filter((r) => r.status === "active").length}</strong> ·
          {" "}With write privilege: <strong>{rows.filter((r) => r.isAdmin || r.isSuperAdmin || r.isME || r.isSupervisor).length}</strong>
        </p>
      </header>

      <section className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5 text-left">Name</th>
              <th className="px-4 py-2.5 text-left">Email</th>
              <th className="px-4 py-2.5 text-left">Role</th>
              <th className="px-4 py-2.5 text-left">Privilege flags</th>
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-left">Account expiry</th>
              <th className="px-4 py-2.5 text-left">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-500">No portal users on file.</td></tr>
            ) : (
              rows.map((row) => {
                const pills = flagPills(row);
                const isExpired = row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now();
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{row.fullName}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{row.email}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{row.role}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {pills.length === 0 ? (
                          <span className="text-[10px] text-gray-400">none</span>
                        ) : (
                          pills.map((p) => {
                            const tone =
                              p.tone === "danger" ? "bg-red-50 text-red-700" :
                              p.tone === "warn" ? "bg-amber-50 text-amber-700" :
                              "bg-gray-100 text-gray-700";
                            return (
                              <span key={p.label} className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${tone} uppercase tracking-wider`}>{p.label}</span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        row.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                      }`}>{row.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {row.expiresAt ? (
                        <span className={isExpired ? "text-red-600 font-semibold" : "text-gray-700"}>
                          {new Date(row.expiresAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">no expiry</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
