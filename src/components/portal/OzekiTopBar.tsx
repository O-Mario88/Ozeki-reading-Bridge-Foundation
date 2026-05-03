"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Bell, Check, ChevronDown, Plus } from "lucide-react";

interface Props {
  /** "Welcome back, Ozeki Team" heading content. */
  greeting: string;
  /** Subtitle line under the greeting. */
  subtitle?: string;
  /** Initials for the round avatar. */
  initials: string;
  /** Notification count, 0 hides the badge. */
  notificationCount?: number;
}

/**
 * Top workspace bar — search, sync status, notifications, avatar — matches
 * the Ozeki dashboard reference. Used by `OzekiPortalShell`. Sits flush on
 * the right of the dark green sidebar.
 */
export function OzekiTopBar({
  greeting,
  subtitle,
  initials,
  notificationCount = 3,
}: Props) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
        {/* Greeting */}
        <div className="min-w-0">
          <h1 className="text-[15px] md:text-[16px] font-bold text-gray-900 leading-tight truncate">
            {greeting}
          </h1>
          {subtitle && (
            <p className="text-[12px] text-gray-500 leading-snug mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Search */}
          <form action="/portal/schools" method="get" className="hidden md:block relative w-[280px] lg:w-[360px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
            <input
              type="text"
              name="query"
              placeholder="Search schools, reports, records..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Global search"
              className="w-full pl-9 pr-12 h-10 text-[13px] rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 focus:bg-white"
            />
            <span className="hidden lg:inline-flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 bg-white">
              ⌘K
            </span>
          </form>

          {/* Synced */}
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-bold text-[#066a67]">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            Synced
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-0.5" aria-hidden />
          </span>

          {/* Create */}
          <details
            className="relative hidden sm:block"
            onToggle={(e) => setCreateOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary
              className="list-none cursor-pointer grid h-10 w-10 place-items-center rounded-full bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
              aria-label="Create new"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
            </summary>
            {createOpen && (
              <div className="absolute right-0 top-12 z-30 min-w-[220px] rounded-xl border border-gray-100 bg-white shadow-xl p-1.5">
                {[
                  { href: "/portal/schools?new=1", label: "New School" },
                  { href: "/portal/visits?new=1", label: "New Visit" },
                  { href: "/portal/assessments?new=1", label: "New Assessment" },
                  { href: "/portal/trainings?new=1", label: "New Training" },
                  { href: "/portal/national-intelligence", label: "New Intervention" },
                  { href: "/portal/resources", label: "Upload Evidence" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </details>

          {/* Bell */}
          <Link
            href="/portal/support"
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-full bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 grid place-items-center h-[18px] min-w-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Link>

          {/* Avatar */}
          <Link
            href="/portal/profiles"
            aria-label="Profile"
            className="flex items-center gap-1.5 hover:opacity-90"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#066a67] text-[12px] font-bold text-white">
              {initials}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </header>
  );
}
