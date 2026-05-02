"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Bell, Check } from "lucide-react";
import { SyncStatusBadge } from "@/components/portal/SyncStatusBadge";

interface Props {
  initials: string;
  /** When false, the SyncStatusBadge is replaced with a static "synced" pill. */
  withLiveSync?: boolean;
}

/**
 * Glass-styled replacement for the legacy FinanceTopControls — same controls,
 * monochrome treatment. Drop-in for any glass dashboard top bar.
 */
export function GlassTopControls({ initials, withLiveSync = true }: Props) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex items-center gap-2.5 w-full">
      {/* Search */}
      <form action="/portal/schools" method="get" className="relative flex-1 min-w-0">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6E76]" strokeWidth={1.75} />
        <input
          type="text"
          name="query"
          placeholder="Search schools, reports, records…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Global search"
          className="w-full pl-10 pr-12 h-11 text-[14px] rounded-full border border-white/70 bg-white/65 backdrop-blur-xl text-[#111111] placeholder:text-[#6B6E76] focus:outline-none focus:ring-2 focus:ring-[#111111]/15 focus:bg-white/80 shadow-[0_8px_22px_rgba(10,10,10,0.06)]"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#6B6E76] px-1.5 py-0.5 rounded-md border border-white/70 bg-white/70">
          ⌘K
        </span>
      </form>

      {/* Sync */}
      {withLiveSync ? (
        <div className="hidden sm:block">
          <SyncStatusBadge />
        </div>
      ) : (
        <span className="hidden sm:inline-flex items-center gap-1.5 h-11 px-4 rounded-full border border-white/70 bg-white/65 backdrop-blur-xl text-[12px] font-semibold text-[#0F8F6B]">
          <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
          Synced
        </span>
      )}

      {/* Create */}
      <details
        className="relative"
        onToggle={(e) => setCreateOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary
          className="list-none cursor-pointer grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-white/70 text-[#111111] shadow-[0_8px_18px_rgba(10,10,10,0.06)] backdrop-blur-xl hover:bg-white"
          aria-label="Create new"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
        </summary>
        {createOpen && (
          <div className="absolute right-0 top-12 z-30 min-w-[220px] rounded-[24px] border border-white/70 bg-white/85 backdrop-blur-2xl shadow-[0_22px_60px_rgba(10,10,10,0.18)] p-2">
            <CreateLink href="/portal/schools?new=1" label="New School" />
            <CreateLink href="/portal/visits?new=1" label="New Visit" />
            <CreateLink href="/portal/assessments?new=1" label="New Assessment" />
            <CreateLink href="/portal/trainings?new=1" label="New Training" />
            <CreateLink href="/portal/national-intelligence" label="New Intervention" />
            <CreateLink href="/portal/resources" label="Upload Evidence" />
          </div>
        )}
      </details>

      {/* Notifications */}
      <Link
        href="/portal/support"
        aria-label="Notifications"
        className="grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-white/70 text-[#111111] shadow-[0_8px_18px_rgba(10,10,10,0.06)] backdrop-blur-xl hover:bg-white"
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
      </Link>

      {/* Avatar */}
      <Link
        href="/portal/profiles"
        aria-label="Profile"
        className="grid h-11 w-11 place-items-center rounded-full bg-[#111111] text-[12px] font-bold text-white shadow-[0_12px_28px_rgba(10,10,10,0.22)] hover:bg-black"
      >
        {initials}
      </Link>
    </div>
  );
}

function CreateLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-full px-4 py-2 text-[13px] font-medium text-[#222] hover:bg-white"
    >
      {label}
    </Link>
  );
}
