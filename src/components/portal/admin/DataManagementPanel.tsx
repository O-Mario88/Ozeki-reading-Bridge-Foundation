"use client";

import { useState, useCallback } from "react";
import {
  AlertTriangle, CheckCircle2, Loader2, Trash2, X, RefreshCw,
  DollarSign, HandHeart, Building2, Briefcase, School, Users, GraduationCap,
  BookOpen, Activity, FileText, ScrollText, Key, Zap, Database,
} from "lucide-react";

type CategoryKey =
  | "finance" | "donations" | "sponsorships" | "services"
  | "schools" | "learners" | "teachers" | "assessments"
  | "training" | "visits" | "content" | "logs"
  | "api_keys" | "everything";

type Category = {
  key: CategoryKey;
  label: string;
  description: string;
  warning: string | null;
  tableCount: number;
  rowCount: number;
};

const ICONS: Record<CategoryKey, typeof DollarSign> = {
  finance: DollarSign,
  donations: HandHeart,
  sponsorships: Building2,
  services: Briefcase,
  schools: School,
  learners: Users,
  teachers: GraduationCap,
  assessments: BookOpen,
  training: Activity,
  visits: Activity,
  content: FileText,
  logs: ScrollText,
  api_keys: Key,
  everything: Zap,
};

export function DataManagementPanel({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [target, setTarget] = useState<Category | null>(null);
  const [phrase, setPhrase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCleared, setLastCleared] = useState<{ key: CategoryKey; tablesCleared: number; rowsCleared: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/portal/admin/data-management");
      const data = await res.json();
      if (res.ok) setCategories(data.categories ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleConfirm = async () => {
    if (!target) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/admin/data-management/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryKey: target.key, confirmation: phrase }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to clear.");
        return;
      }
      setLastCleared({
        key: target.key,
        tablesCleared: data.tablesCleared?.length ?? 0,
        rowsCleared: data.rowsCleared ?? 0,
      });
      setTarget(null);
      setPhrase("");
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setTarget(null);
    setPhrase("");
    setError(null);
  };

  return (
    <>
      {/* Last-cleared banner */}
      {lastCleared && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 mb-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-900 flex-1">
            <p className="font-semibold">Cleared: {categories.find((c) => c.key === lastCleared.key)?.label ?? lastCleared.key}</p>
            <p className="text-xs text-emerald-800 mt-0.5">
              {lastCleared.tablesCleared} tables · {lastCleared.rowsCleared.toLocaleString()} rows deleted
            </p>
          </div>
          <button
            onClick={() => setLastCleared(null)}
            className="text-emerald-700 hover:text-emerald-900"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-end mb-3">
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh counts
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {categories.map((cat) => {
          const Icon = ICONS[cat.key] ?? Database;
          const isNuclear = cat.key === "everything";
          const isEmpty = cat.rowCount === 0;
          return (
            <div
              key={cat.key}
              className={`rounded-2xl border p-5 transition-colors ${
                isNuclear
                  ? "bg-red-50/50 border-red-300"
                  : isEmpty
                    ? "bg-gray-50 border-gray-200"
                    : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isNuclear ? "bg-red-600 text-white" : isEmpty ? "bg-gray-200 text-gray-400" : "bg-[#006b61]/10 text-[#006b61]"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{cat.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{cat.description}</p>
                </div>
              </div>

              {cat.warning && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 mb-3 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-snug">{cat.warning}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span><strong className="text-gray-800">{cat.rowCount.toLocaleString()}</strong> rows</span>
                <span>{cat.tableCount} {cat.tableCount === 1 ? "table" : "tables"}</span>
              </div>

              <button
                onClick={() => setTarget(cat)}
                disabled={isEmpty}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                  isEmpty
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : isNuclear
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isEmpty ? "Already empty" : `Clear ${cat.label.toLowerCase()}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation modal */}
      {target && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Clear {target.label}?</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {target.tableCount} tables · {target.rowCount.toLocaleString()} rows will be permanently deleted
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                disabled={submitting}
                className="text-gray-400 hover:text-gray-600 shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {target.warning && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">{target.warning}</p>
              </div>
            )}

            <p className="text-sm text-gray-700 mb-3">
              Type <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">{target.label}</code> to confirm:
            </p>
            <input
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={target.label}
              autoComplete="off"
              spellCheck={false}
              className={`w-full px-3 py-2.5 text-sm font-mono rounded-lg border-2 focus:outline-none transition-colors ${
                phrase === target.label
                  ? "border-red-500 focus:ring-2 focus:ring-red-400"
                  : "border-gray-200 focus:border-red-300 focus:ring-2 focus:ring-red-200"
              }`}
            />

            {error && (
              <p className="text-xs text-red-700 font-semibold mt-2">{error}</p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={phrase !== target.label || submitting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {submitting ? "Clearing…" : "Confirm delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
