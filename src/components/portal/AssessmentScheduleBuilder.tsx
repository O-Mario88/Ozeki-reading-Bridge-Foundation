"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";

export function AssessmentScheduleBuilder() {
  const router = useRouter();
  const [form, setForm] = useState({
    assessmentType: "baseline" as "baseline" | "progress" | "endline",
    academicYear: new Date().getFullYear(),
    termNumber: 1,
    windowOpen: "",
    windowClose: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/assessments/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to save window.");
        return;
      }
      router.refresh();
      setForm({ ...form, windowOpen: "", windowClose: "", notes: "" });
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-5">
      <div className="grid md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cycle</label>
          <select
            value={form.assessmentType}
            onChange={(e) => setForm({ ...form, assessmentType: e.target.value as "baseline" | "progress" | "endline" })}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="baseline">Baseline (Term 1)</option>
            <option value="progress">Progress (Term 2)</option>
            <option value="endline">Endline (Term 3)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Year</label>
          <input
            type="number"
            min="2020"
            max="2050"
            value={form.academicYear}
            onChange={(e) => setForm({ ...form, academicYear: Number(e.target.value) })}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Term</label>
          <select
            value={form.termNumber}
            onChange={(e) => setForm({ ...form, termNumber: Number(e.target.value) })}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Window opens</label>
          <input
            type="date"
            value={form.windowOpen}
            onChange={(e) => setForm({ ...form, windowOpen: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Window closes</label>
          <input
            type="date"
            value={form.windowClose}
            onChange={(e) => setForm({ ...form, windowClose: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>
      <div className="mt-3 flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes (optional)</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g. Kickoff reminder 2 weeks before open"
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <button
          onClick={submit}
          disabled={saving || !form.windowOpen || !form.windowClose}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#006b61] hover:bg-[#006b61]/90 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarIcon className="w-4 h-4" />}
          Create Window
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
