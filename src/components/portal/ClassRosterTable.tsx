"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpDown, ChevronRight, Search } from "lucide-react";
import { DashboardListRow } from "@/components/portal/DashboardList";

interface Learner {
  learnerUid: string;
  learnerName: string;
  gender: string | null;
  age: number | null;
  latestReadingStage: string | null;
  latestComposite: number | null;
  latestAssessmentDate: string | null;
  cycleType: string | null;
  flaggedForAttention: boolean;
  flagReason: string | null;
}

interface Props {
  learners: Learner[];
  schoolId: number;
}

type SortKey = "name" | "score" | "gender" | "stage" | "flag";

export function ClassRosterTable({ learners, schoolId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false);

  const sorted = useMemo(() => {
    const filtered = learners
      .filter((l) => (showOnlyFlagged ? l.flaggedForAttention : true))
      .filter((l) => {
        if (!filter) return true;
        const q = filter.toLowerCase();
        return (
          l.learnerName.toLowerCase().includes(q) ||
          l.learnerUid.toLowerCase().includes(q) ||
          (l.latestReadingStage ?? "").toLowerCase().includes(q)
        );
      });

    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.learnerName.localeCompare(b.learnerName);
      else if (sortKey === "score") cmp = (a.latestComposite ?? -1) - (b.latestComposite ?? -1);
      else if (sortKey === "gender") cmp = (a.gender ?? "").localeCompare(b.gender ?? "");
      else if (sortKey === "stage") cmp = (a.latestReadingStage ?? "").localeCompare(b.latestReadingStage ?? "");
      else if (sortKey === "flag") cmp = Number(a.flaggedForAttention) - Number(b.flaggedForAttention);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [learners, sortKey, sortDir, filter, showOnlyFlagged]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const headerCell = (key: SortKey, label: string, align: "left" | "center" | "right" = "left") => (
    <span
      className={`font-semibold text-${align} cursor-pointer select-none hover:text-gray-800 block`}
      onClick={() => toggleSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === key ? "text-blue-500" : "text-gray-300"}`} />
      </span>
    </span>
  );

  const ROW_TEMPLATE = "minmax(0,1.4fr) 80px minmax(0,1fr) 110px 160px 80px";

  return (
    <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, UID, or stage…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyFlagged}
            onChange={(e) => setShowOnlyFlagged(e.target.checked)}
            className="rounded border-gray-300 text-red-600 focus:ring-red-400"
          />
          Show only flagged
        </label>
        <span className="text-xs text-gray-400 ml-auto">
          {sorted.length} of {learners.length} learners
        </span>
      </div>

      <div className="px-2">
        <div
          className="grid items-center text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/30 py-2 px-1 gap-3"
          style={{ gridTemplateColumns: ROW_TEMPLATE }}
        >
          {headerCell("name", "Learner")}
          {headerCell("gender", "Gender", "center")}
          {headerCell("stage", "Reading Stage")}
          {headerCell("score", "Composite", "center")}
          {headerCell("flag", "Status", "center")}
          <span />
        </div>
        {sorted.map((l) => (
          <DashboardListRow
            key={l.learnerUid}
            template={ROW_TEMPLATE}
            className={`hover:bg-blue-50/30 ${l.flaggedForAttention ? "bg-red-50/20" : ""}`}
          >
            <span className="min-w-0">
              <span className="block font-semibold text-gray-800 truncate">{l.learnerName}</span>
              <span className="block text-xs text-gray-400 font-mono truncate">{l.learnerUid}</span>
            </span>
            <span className="text-center text-gray-600">{l.gender ?? "—"}</span>
            <span className="text-gray-700 truncate">{l.latestReadingStage ?? "—"}</span>
            <span className="text-center">
              {l.latestComposite != null ? (
                <strong className={`text-sm ${
                  l.latestComposite >= 70 ? "text-emerald-700" :
                  l.latestComposite >= 40 ? "text-amber-700" :
                  "text-red-600"
                }`}>{l.latestComposite}</strong>
              ) : (
                <span className="text-gray-300">—</span>
              )}
            </span>
            <span className="text-center">
              {l.flaggedForAttention ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                  <AlertTriangle className="w-3 h-3" />
                  {l.flagReason ?? "Attention"}
                </span>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
            </span>
            <span className="text-right">
              <Link
                href={`/portal/learners/${encodeURIComponent(l.learnerUid)}`}
                className="text-xs text-[#006b61] font-semibold hover:underline inline-flex items-center gap-0.5"
              >
                Profile <ChevronRight className="w-3 h-3" />
              </Link>
            </span>
          </DashboardListRow>
        ))}
        {sorted.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400 italic">
            No learners match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
