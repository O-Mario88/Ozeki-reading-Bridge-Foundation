import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import type { ExternalUserRow } from "@/lib/server/postgres/repositories/external-users";

type Props = {
  user: ExternalUserRow;
  roleLabel: string;
  title: string;
  description?: string;
  navItems?: { href: string; label: string }[];
  children: React.ReactNode;
};

export function ExternalShell({ user, roleLabel, title, description, navItems, children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#066a67] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> {roleLabel} portal
            </p>
            <h1 className="text-lg font-bold text-gray-900">{user.fullName}</h1>
            <p className="text-xs text-gray-500">
              {user.email}{user.organization ? ` · ${user.organization}` : ""}
            </p>
          </div>
          <form action="/api/external/auth/logout" method="POST">
            <button type="submit" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </form>
        </div>
        {navItems && navItems.length > 0 ? (
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ul className="flex gap-1 overflow-x-auto -mb-px">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 hover:text-[#066a67] border-b-2 border-transparent hover:border-[#066a67]/30">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {description ? <p className="text-sm text-gray-600 mt-1">{description}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
