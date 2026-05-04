import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPortalUser, canViewAuditPortal } from "@/lib/auth";
import { ShieldCheck, FileSearch, Banknote, Users, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

const NAV_ITEMS: { href: string; label: string; icon: typeof ShieldCheck }[] = [
  { href: "/portal/auditor", label: "Integrity Badge", icon: ShieldCheck },
  { href: "/portal/auditor/audit-trail", label: "Audit Trail", icon: FileSearch },
  { href: "/portal/auditor/finance-log", label: "Finance Log", icon: Banknote },
  { href: "/portal/auditor/role-assignments", label: "Role Assignments", icon: Users },
];

export default async function AuditorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentPortalUser();
  if (!user) redirect("/portal/login");
  if (!canViewAuditPortal(user)) redirect("/portal/dashboard");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#066a67] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Audit Portal · Read-Only
            </p>
            <h1 className="text-lg font-bold text-gray-900">{user.fullName}</h1>
            <p className="text-xs text-gray-500">{user.email}{user.role === "Auditor" ? " · external auditor session" : ` · ${user.role}`}</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <LogOut className="w-3.5 h-3.5" /> End session
            </button>
          </form>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex gap-1 overflow-x-auto -mb-px">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 hover:text-[#066a67] border-b-2 border-transparent hover:border-[#066a67]/30"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
