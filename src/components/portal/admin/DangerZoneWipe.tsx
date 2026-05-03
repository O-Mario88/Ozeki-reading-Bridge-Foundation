"use client";

import { useState } from "react";
import { AlertOctagon, Loader2, CheckCircle2 } from "lucide-react";

const REQUIRED_PHRASE = "DELETE ALL DATA";

type WipeResult =
  | { ok: true; truncatedCount: number; preservedCount: number; truncated: string[]; preserved: string[] }
  | { ok: false; error: string };

export function DangerZoneWipe() {
  const [phrase, setPhrase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<WipeResult | null>(null);

  const canSubmit = phrase === REQUIRED_PHRASE && !submitting;

  const handleWipe = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/portal/admin/wipe-all-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: phrase }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: data.error ?? "Wipe failed." });
      } else {
        setResult({ ok: true, ...data });
        setPhrase("");
      }
    } catch (err) {
      setResult({ ok: false, error: String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3 mb-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-emerald-900">Wipe complete</h3>
            <p className="text-sm text-[#044f4d] mt-1">
              <strong>{result.truncatedCount}</strong> tables truncated;{" "}
              <strong>{result.preservedCount}</strong> preserved (login + config + reference data).
            </p>
          </div>
        </div>
        <details className="text-xs text-[#044f4d]">
          <summary className="cursor-pointer font-semibold">Show affected tables</summary>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] mb-1">Truncated</p>
              <ul className="font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto">
                {result.truncated.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] mb-1">Preserved</p>
              <ul className="font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto">
                {result.preserved.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-red-300 bg-white p-6">
      <div className="flex items-start gap-3 mb-4">
        <AlertOctagon className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-red-900 text-lg">Nuclear wipe — clean slate</h3>
          <p className="text-sm text-gray-700 mt-1">
            Truncates every transactional/content table in the public schema. Preserves
            login, app config, reference data (geo hierarchy, benchmarks, audited PDFs),
            and your super-admin account.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-900 mb-4 space-y-2">
        <p className="font-semibold">This will permanently delete:</p>
        <ul className="list-disc pl-5 text-red-800 space-y-1">
          <li>Schools, contacts, learners, teachers</li>
          <li>Assessments, observations, lesson evaluations</li>
          <li>Training sessions, attendance, programmes</li>
          <li>Finance invoices, receipts, expenses, journal entries</li>
          <li>Donations, sponsorships, service bookings, payments</li>
          <li>Blog, testimonials, newsletter, story library, gallery</li>
          <li>Audit logs, API usage logs, API keys</li>
        </ul>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Type <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{REQUIRED_PHRASE}</code> to confirm
          </span>
          <input
            type="text"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={REQUIRED_PHRASE}
            autoComplete="off"
            spellCheck={false}
            className={`mt-1.5 w-full px-3 py-2.5 text-sm font-mono rounded-lg border-2 focus:outline-none transition-colors ${
              phrase === REQUIRED_PHRASE
                ? "border-red-500 focus:ring-2 focus:ring-red-400"
                : "border-gray-200 focus:border-red-300 focus:ring-2 focus:ring-red-200"
            }`}
          />
        </label>

        {result?.ok === false && (
          <p className="text-sm text-red-700 font-semibold">{result.error}</p>
        )}

        <button
          onClick={handleWipe}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertOctagon className="w-4 h-4" />}
          {submitting ? "Wiping…" : "Wipe all data"}
        </button>

        <p className="text-xs text-gray-500 italic">
          Button activates only once you have typed the exact phrase. The wipe runs
          inside a single transaction — if any step fails, nothing is deleted.
        </p>
      </div>
    </div>
  );
}
