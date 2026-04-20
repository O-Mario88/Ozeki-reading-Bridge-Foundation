"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Play, Rewind } from "lucide-react";

type Summary = {
  batchId: string;
  archivedReceipts: number;
  archivedLedgerRows: number;
  archivedJournalEntries: number;
  archivedDonationReceipts: number;
  archivedSponsorshipReceipts: number;
  archivedPaymentReceipts: number;
  invoicesRestored: number;
};

const CONFIRM_PHRASE = "I UNDERSTAND THIS WILL ARCHIVE DUPLICATE FINANCE ROWS";

export function FinanceResetPanel() {
  const [dryResult, setDryResult] = useState<Summary | null>(null);
  const [liveResult, setLiveResult] = useState<Summary | null>(null);
  const [running, setRunning] = useState<"dry" | "live" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");

  const run = async (dryRun: boolean) => {
    setRunning(dryRun ? "dry" : "live");
    setError(null);
    try {
      const res = await fetch("/api/portal/finance/admin/reset-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dryRun ? { dryRun: true } : { confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Batch failed.");
        return;
      }
      if (dryRun) setDryResult(data.summary);
      else setLiveResult(data.summary);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(null);
    }
  };

  const Row = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-bold text-gray-900 font-mono">{value.toLocaleString()}</span>
    </div>
  );

  const SummaryCard = ({ title, icon: Icon, color, summary }: { title: string; icon: typeof Play; color: string; summary: Summary }) => (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5" />
        <h3 className="font-bold">{title}</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">Batch id: <code className="bg-white px-1.5 py-0.5 rounded">{summary.batchId}</code></p>
      <Row label="Receipts archived" value={summary.archivedReceipts} />
      <Row label="Ledger rows archived" value={summary.archivedLedgerRows} />
      <Row label="Journal entries archived" value={summary.archivedJournalEntries} />
      <Row label="Donation receipts archived" value={summary.archivedDonationReceipts} />
      <Row label="Sponsorship receipts archived" value={summary.archivedSponsorshipReceipts} />
      <Row label="Service-payment receipts archived" value={summary.archivedPaymentReceipts} />
      <Row label="Invoices rebalanced" value={summary.invoicesRestored} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Step 1 — Dry run */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Step 1: Dry-run projection</h3>
          <button
            onClick={() => run(true)}
            disabled={running !== null}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-gray-300 text-white text-sm font-semibold transition"
          >
            {running === "dry" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rewind className="w-4 h-4" />}
            Run dry projection
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Counts what would be archived. No rows are modified. Safe to run repeatedly.
        </p>
        {dryResult && <SummaryCard title="Dry-run projection" icon={Rewind} color="bg-sky-50 border-sky-200" summary={dryResult} />}
      </div>

      {/* Step 2 — Live batch */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-3">Step 2: Live batch</h3>
        <p className="text-xs text-gray-500 mb-3">
          Type the exact confirmation phrase to enable the button. The run is atomic; a single audit-log row captures the summary.
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-gray-300 text-white text-sm font-semibold transition"
        >
          {running === "live" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run live batch
        </button>
        {liveResult && (
          <div className="mt-4">
            <SummaryCard title="Live batch — committed" icon={CheckCircle2} color="bg-emerald-50 border-emerald-200" summary={liveResult} />
          </div>
        )}
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
