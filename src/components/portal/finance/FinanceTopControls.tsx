"use client";

import { useState } from "react";
import { Search, Plus, Bell, Check } from "lucide-react";

interface Props {
  initials: string;
}

export function FinanceTopControls({ initials }: Props) {
  const [query, setQuery] = useState("");

  return (
    <div className="flex items-center gap-3 w-full">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search schools, reports, records…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-12 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-gray-400"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50">
          ⌘K
        </span>
      </div>

      {/* Synced badge */}
      <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-[#066a67] text-xs font-bold">
        <Check className="w-3.5 h-3.5" />
        Synced
      </div>

      {/* Quick add */}
      <button
        type="button"
        className="hidden md:inline-flex w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 text-[#066a67] hover:bg-emerald-100 items-center justify-center"
        aria-label="Quick add"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Notifications */}
      <button
        type="button"
        className="relative w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 inline-flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
          3
        </span>
      </button>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#066a67] to-emerald-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
        {initials}
      </div>
    </div>
  );
}
