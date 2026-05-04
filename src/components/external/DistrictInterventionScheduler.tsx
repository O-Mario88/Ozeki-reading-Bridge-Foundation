"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";

const INTERVENTION_TYPES = [
  "Coaching visit",
  "Teacher training",
  "Materials distribution",
  "Headteacher meeting",
  "Assessment",
  "Remediation cohort",
];

type Props = {
  district: string;
  schools: { id: number; name: string }[];
};

export function DistrictInterventionScheduler({ district, schools }: Props) {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<number | "">("");
  const [interventionType, setInterventionType] = useState(INTERVENTION_TYPES[0]);
  const [scheduledFor, setScheduledFor] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/government/districts/${encodeURIComponent(district)}/interventions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: schoolId === "" ? null : schoolId,
          interventionType,
          scheduledFor,
          notes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not schedule.");
        return;
      }
      setSuccess(`${interventionType} scheduled for ${scheduledFor}.`);
      setNotes("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid sm:grid-cols-4 gap-3">
      <div>
        <label htmlFor="iv-school" className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">School (optional)</label>
        <select id="iv-school" value={schoolId} onChange={(e) => setSchoolId(e.target.value === "" ? "" : Number(e.target.value))} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200">
          <option value="">District-wide</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="iv-type" className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Intervention</label>
        <select id="iv-type" value={interventionType} onChange={(e) => setInterventionType(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200">
          {INTERVENTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="iv-date" className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date</label>
        <input id="iv-date" type="date" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
      </div>
      <div>
        <label htmlFor="iv-notes" className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Notes</label>
        <input id="iv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Brief context" className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
      </div>
      <div className="sm:col-span-4 flex items-center justify-between">
        <div className="text-xs">
          {error ? <span className="text-red-600">{error}</span> : success ? <span className="text-emerald-700">{success}</span> : null}
        </div>
        <button type="button" onClick={submit} disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#066a67] text-white text-sm font-bold disabled:bg-gray-300">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
          {submitting ? "Scheduling…" : "Schedule"}
        </button>
      </div>
    </div>
  );
}
