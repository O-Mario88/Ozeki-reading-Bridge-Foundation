"use client";

import { useState } from "react";
import { Loader2, AlertCircle, Trash2, Eye, ShieldAlert } from "lucide-react";

type TableSummary = { name: string; rowsBefore: number; rowsAfter: number };
type Summary = {
  executedAt: string;
  tablesAffected: number;
  totalRowsDeleted: number;
  tables: TableSummary[];
};

const CONFIRM_PHRASE = "I UNDERSTAND THIS WILL PERMANENTLY DELETE ALL FINANCE TRANSACTIONS";

export function FinancePurgePanel() {
  const [dryResult, setDryResult] = useState<Summary | null>(null);
  const [liveResult, setLiveResult] = useState<Summary | null>(null);
  const [running, setRunning] = useState<"dry" | "live" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");

  const run = async (dryRun: boolean) => {
    setRunning(dryRun ? "dry" : "live");
    setError(null);
    try {
      const res = await fetch("/api/portal/finance/admin/purge-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dryRun ? { dryRun: true } : { confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Purge failed.");
        return;
      }
      if (dryRun) setDryResult(data.summary);
      else {
        setLiveResult(data.summary);
        setConfirm("");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(null);
    }
  };

  const SummaryView = ({ summary, mode }: { summary: Summary; mode: "dry" | "live" }) => {
    const populated = summary.tables.filter((t) => t.rowsBefore > 0);
    return (
      <div className={`rounded-xl border p-4 mt-4 ${mode === "live" ? "bg-emerald-50 border-emerald-200" : "bg-sky-50 border-sky-200"}`}>
        <p className="text-sm font-bold text-gray-900 mb-2">
          {mode === "live"
            ? `Wiped ${summary.totalRowsDeleted.toLocaleString()} rows across ${summary.tablesAffected} table(s).`
            : `Would wipe ${summary.totalRowsDeleted.toLocaleString()} rows across ${summary.tablesAffected} populated table(s).`}
        </p>
        {populated.length === 0 ? (
          <p className="text-xs text-gray-600">All purgeable tables are already empty.</p>
        ) : (
          <ul className="text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
            {populated.map((t) => (
              <li key={t.name} className="flex justify-between gap-3">
                <span className="text-gray-700">{t.name}</span>
                <span className="text-gray-900 font-bold">
                  {t.rowsBefore.toLocaleString()}
                  {mode === "live" && " → 0"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-gray-500 mt-3">Run at: {new Date(summary.executedAt).toLocaleString()}</p>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-red-50 border border-red-300 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-red-900">Danger zone — permanent finance data wipe</h2>
            <p className="text-sm text-red-800 mt-1">
              Truncates all transactional finance tables (invoices, receipts, payments, expenses, journal,
              ledger, audit trail, statements, budgets, files, generated documents, etc.) and resets
              identity sequences. Configuration tables — chart of accounts, branches, contacts, settings,
              approval workflows, period locks, programs, projects, departments, funds, grants, assets — are
              <strong> preserved</strong>. This action cannot be undone from the UI.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Step 1: Dry-run projection</h3>
          <button
            onClick={() => run(true)}
            disabled={running !== null}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#377FEF] hover:bg-[#1f5cce] disabled:bg-gray-300 text-white text-sm font-semibold transition"
          >
            {running === "dry" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview row counts
          </button>
        </div>
        <p className="text-xs text-gray-500">Counts every purgeable table inside a transaction that's rolled back. Nothing is modified.</p>
        {dryResult && <SummaryView summary={dryResult} mode="dry" />}
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-3">Step 2: Live purge</h3>
        <p className="text-xs text-gray-500 mb-3">
          Type the exact confirmation phrase to enable the button. Runs in a single transaction with
          <code className="bg-gray-100 px-1 rounded mx-1">TRUNCATE … RESTART IDENTITY CASCADE</code>
          and writes one bulk-delete audit-log entry.
        </p>
        <div className="mb-3">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirmation phrase</label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            className="mt-1 w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <p className="text-xs text-gray-400 mt-1">Paste exactly: <code className="bg-gray-100 px-1 rounded">{CONFIRM_PHRASE}</code></p>
        </div>
        <button
          onClick={() => run(false)}
          disabled={running !== null || confirm !== CONFIRM_PHRASE}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F2382F] hover:bg-[#c92a22] disabled:bg-gray-300 text-white text-sm font-semibold transition"
        >
          {running === "live" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Purge all finance data
        </button>
        {liveResult && <SummaryView summary={liveResult} mode="live" />}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
