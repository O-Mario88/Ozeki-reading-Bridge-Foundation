"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Download, Search, Filter, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";

interface AuditRow {
  id: number;
  userId: number;
  userName: string;
  action: string;
  targetTable: string;
  targetId: string | number | null;
  payloadBefore: string | null;
  payloadAfter: string | null;
  detail: string | null;
  ipAddress: string | null;
  timestamp: string;
}

interface FacetCounts {
  actions: Array<{ action: string; count: number }>;
  targetTables: Array<{ targetTable: string; count: number }>;
  actors: Array<{ userId: number; userName: string; count: number }>;
}

interface AuditPage {
  rows: AuditRow[];
  total: number;
  limit: number;
  offset: number;
  facets: FacetCounts;
}

const PAGE_SIZE = 50;

const ACTION_TONES: Record<string, string> = {
  delete: "bg-red-50 text-red-700 ring-red-100",
  soft_delete: "bg-orange-50 text-orange-700 ring-orange-100",
  void: "bg-orange-50 text-orange-700 ring-orange-100",
  bulk_delete: "bg-red-50 text-red-700 ring-red-100",
  wipe_data: "bg-red-100 text-red-800 ring-red-200 font-bold",
  approve: "bg-emerald-50 text-[#066a67] ring-emerald-100",
  reject: "bg-rose-50 text-rose-700 ring-rose-100",
  post: "bg-emerald-50 text-[#066a67] ring-emerald-100",
  issue: "bg-emerald-50 text-[#066a67] ring-emerald-100",
  send: "bg-blue-50 text-blue-700 ring-blue-100",
  create: "bg-blue-50 text-blue-700 ring-blue-100",
  update: "bg-slate-50 text-slate-700 ring-slate-100",
  role_change: "bg-purple-50 text-purple-700 ring-purple-100",
  permission_grant: "bg-purple-50 text-purple-700 ring-purple-100",
  permission_revoke: "bg-purple-50 text-purple-700 ring-purple-100",
  settings_update: "bg-amber-50 text-amber-700 ring-amber-100",
};

function actionTone(action: string): string {
  return ACTION_TONES[action] ?? "bg-slate-50 text-slate-700 ring-slate-100";
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function prettyJson(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function AuditTrailViewer() {
  const [data, setData] = useState<AuditPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [filters, setFilters] = useState({
    search: "",
    action: "",
    targetTable: "",
    userId: "",
    dateFrom: "",
    dateTo: "",
  });
  const [offset, setOffset] = useState(0);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (filters.search.trim()) sp.set("search", filters.search.trim());
    if (filters.action) sp.set("action", filters.action);
    if (filters.targetTable) sp.set("targetTable", filters.targetTable);
    if (filters.userId) sp.set("userId", filters.userId);
    if (filters.dateFrom) sp.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) sp.set("dateTo", filters.dateTo);
    sp.set("limit", String(PAGE_SIZE));
    sp.set("offset", String(offset));
    return sp.toString();
  }, [filters, offset]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/portal/admin/audit-trail?${queryString}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json as AuditPage);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load audit trail.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [queryString]);

  const total = data?.total ?? 0;
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + PAGE_SIZE, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  const resetFilters = () => {
    setFilters({ search: "", action: "", targetTable: "", userId: "", dateFrom: "", dateTo: "" });
    setOffset(0);
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-gray-700">
          <Filter className="w-4 h-4" />
          <h2 className="font-semibold text-sm uppercase tracking-wider">Filter</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setOffset(0); }}
              placeholder="Search user / detail"
              className="pl-9 pr-3 py-2 w-full text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-charius-orange/40 focus:border-charius-orange"
            />
          </div>
          <select
            value={filters.action}
            onChange={(e) => { setFilters((f) => ({ ...f, action: e.target.value })); setOffset(0); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-charius-orange/40 focus:border-charius-orange"
          >
            <option value="">All actions</option>
            {data?.facets.actions.map((f) => (
              <option key={f.action} value={f.action}>
                {f.action} ({f.count})
              </option>
            ))}
          </select>
          <select
            value={filters.targetTable}
            onChange={(e) => { setFilters((f) => ({ ...f, targetTable: e.target.value })); setOffset(0); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-charius-orange/40 focus:border-charius-orange"
          >
            <option value="">All tables</option>
            {data?.facets.targetTables.map((f) => (
              <option key={f.targetTable} value={f.targetTable}>
                {f.targetTable} ({f.count})
              </option>
            ))}
          </select>
          <select
            value={filters.userId}
            onChange={(e) => { setFilters((f) => ({ ...f, userId: e.target.value })); setOffset(0); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-charius-orange/40 focus:border-charius-orange"
          >
            <option value="">All users</option>
            {data?.facets.actors.map((f) => (
              <option key={f.userId} value={String(f.userId)}>
                {f.userName} ({f.count})
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => { setFilters((f) => ({ ...f, dateFrom: e.target.value })); setOffset(0); }}
              className="px-2 py-2 text-sm border border-gray-200 rounded-lg w-1/2 focus:outline-none focus:ring-2 focus:ring-charius-orange/40 focus:border-charius-orange"
              aria-label="From date"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => { setFilters((f) => ({ ...f, dateTo: e.target.value })); setOffset(0); }}
              className="px-2 py-2 text-sm border border-gray-200 rounded-lg w-1/2 focus:outline-none focus:ring-2 focus:ring-charius-orange/40 focus:border-charius-orange"
              aria-label="To date"
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline-offset-2 hover:underline"
          >
            Reset filters
          </button>
          <a
            href={`/api/portal/admin/audit-trail/export?${queryString}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>
        </div>
      </div>

      {/* Result meta */}
      <div className="flex items-baseline justify-between text-sm text-gray-600">
        <p>
          {loading
            ? "Loading…"
            : total === 0
            ? "No matching audit events."
            : `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canPrev || loading}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={!canNext || loading}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
        </div>
      )}

      {/* Rows */}
      {data && data.rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {data.rows.map((row) => {
            const isOpen = expandedId === row.id;
            const before = prettyJson(row.payloadBefore);
            const after = prettyJson(row.payloadAfter);
            const hasPayload = Boolean(before || after);
            return (
              <div key={row.id} className="p-4 hover:bg-gray-50/40 transition-colors">
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : row.id)}
                  className="w-full text-left flex items-start gap-3"
                >
                  <span className="mt-1 text-gray-400">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${actionTone(row.action)}`}>
                        {row.action}
                      </span>
                      <span className="font-semibold text-sm text-gray-900">{row.targetTable}</span>
                      {row.targetId != null && (
                        <span className="text-xs text-gray-500">#{row.targetId}</span>
                      )}
                      <span className="text-xs text-gray-500 ml-auto whitespace-nowrap">{formatTimestamp(row.timestamp)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-600">
                      <span className="font-medium text-gray-700">{row.userName}</span>
                      <span className="text-gray-400">·</span>
                      <span>user #{row.userId}</span>
                      {row.ipAddress && (
                        <>
                          <span className="text-gray-400">·</span>
                          <span className="font-mono">{row.ipAddress}</span>
                        </>
                      )}
                    </div>
                    {row.detail && (
                      <p className="mt-1.5 text-sm text-gray-700">{row.detail}</p>
                    )}
                  </div>
                </button>

                {isOpen && hasPayload && (
                  <div className="mt-4 ml-7 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {before && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Before</p>
                        <pre className="bg-gray-900 text-gray-100 text-[11px] leading-relaxed rounded-lg p-3 overflow-auto max-h-60">{before}</pre>
                      </div>
                    )}
                    {after && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">After</p>
                        <pre className="bg-gray-900 text-gray-100 text-[11px] leading-relaxed rounded-lg p-3 overflow-auto max-h-60">{after}</pre>
                      </div>
                    )}
                  </div>
                )}
                {isOpen && !hasPayload && (
                  <p className="mt-3 ml-7 text-xs text-gray-400 italic">No payload snapshot recorded for this event.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data && data.rows.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-sm text-gray-500">
          No audit events match the current filters.
        </div>
      )}
    </div>
  );
}
