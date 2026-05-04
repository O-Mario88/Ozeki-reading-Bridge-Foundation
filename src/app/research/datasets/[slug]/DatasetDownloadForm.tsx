"use client";

import { useState } from "react";
import { Loader2, Download, AlertCircle } from "lucide-react";

type Props = { datasetSlug: string; datasetTitle: string };

export function DatasetDownloadForm({ datasetSlug, datasetTitle }: Props) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError("You must accept the license terms before downloading.");
      return;
    }
    if (!email.trim() || !fullName.trim() || intendedUse.trim().length < 10) {
      setError("Please provide your name, email, and a brief description of intended use.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/research/datasets/${datasetSlug}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim(),
          organization: organization.trim() || undefined,
          intendedUse: intendedUse.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Download failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = res.headers.get("X-Filename") ?? `${datasetSlug}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white border border-gray-100 p-6 space-y-4">
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Sign the data-use agreement</h2>
      <p className="text-xs text-gray-500">
        We require a one-time signed agreement before we release {datasetTitle}. This is logged for accountability — we never share these details with anyone.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="ds-name" className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Full name *</label>
          <input id="ds-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
        </div>
        <div>
          <label htmlFor="ds-email" className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Email *</label>
          <input id="ds-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ds-org" className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Organisation</label>
          <input id="ds-org" value={organization} onChange={(e) => setOrganization(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" placeholder="e.g. University of Cambridge, BBC, J-PAL" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ds-use" className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Intended use *</label>
          <textarea id="ds-use" rows={3} value={intendedUse} onChange={(e) => setIntendedUse(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" placeholder="One sentence describing what you'll use the data for." />
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs text-gray-700">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
        <span>I have read the license terms above and agree to abide by them, including the attribution and non-re-identification clauses.</span>
      </label>

      {error ? (
        <p className="text-xs text-red-600 inline-flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      ) : null}

      <button type="submit" disabled={submitting || !agreed} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#066a67] text-white text-sm font-bold disabled:bg-gray-300">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {submitting ? "Preparing CSV…" : "Accept & download CSV"}
      </button>
    </form>
  );
}
