"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  PhotoEvidenceCapture,
  type PhotoEvidenceCaptureHandle,
  uploadStagedPhotos,
} from "@/components/portal/evidence/PhotoEvidenceCapture";

interface SchoolOption { id: number; name: string; district: string }
interface CoachOption { id: number; fullName: string; email: string }

interface Props {
  schools: SchoolOption[];
  coaches: CoachOption[];
  defaultSchoolId?: number;
  defaultCoachId?: number;
}

const VISIT_TYPES = [
  { value: "initial_diagnostic", label: "Initial Diagnostic" },
  { value: "lesson_evaluation_coaching", label: "Lesson Evaluation + Coaching" },
  { value: "demo_lesson", label: "Demo Lesson" },
  { value: "leadership_meeting", label: "Leadership Meeting" },
  { value: "endline_review", label: "Endline Review" },
  { value: "follow_up", label: "Follow-up" },
];

const FOCUS_OPTIONS = [
  "Phonics — letter sounds",
  "Phonics — blending",
  "Reading fluency",
  "Comprehension",
  "Writing",
  "Classroom management",
  "Lesson pacing",
  "Differentiation",
  "Use of decodable readers",
  "Assessment routines",
];

const VISIT_REASONS = [
  "Scheduled coaching cycle",
  "Follow-up to previous visit",
  "Training Follow Up",
  "Headteacher request",
  "Concern flagged by coach",
  "Termly review",
  "Sponsor visit",
];

function buildEmptyForm(defaultSchoolId?: number, defaultCoachId?: number) {
  return {
    schoolId: defaultSchoolId ?? 0,
    visitDate: new Date().toISOString().slice(0, 10),
    visitType: "lesson_evaluation_coaching",
    coachUserId: defaultCoachId ?? 0,
    coachingCycleNumber: 1,
    visitReason: "Scheduled coaching cycle",
    visitReasons: [] as string[],
    focusAreas: [] as string[],
    implementationStatus: "started" as "not_started" | "started" | "partial" | "full",
    startTime: "",
    endTime: "",
    sponsorshipType: "none" as "none" | "school" | "district" | "region" | "general",
    notes: "",
  };
}

export function CoachingVisitForm({ schools, coaches, defaultSchoolId, defaultCoachId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(buildEmptyForm(defaultSchoolId, defaultCoachId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const photoCaptureRef = useRef<PhotoEvidenceCaptureHandle>(null);

  const toggleInArray = (key: "focusAreas" | "visitReasons", value: string) => {
    setForm((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value],
      };
    });
  };

  const submit = async () => {
    if (!form.schoolId) { setError("Please choose a school."); return; }
    if (!form.coachUserId) { setError("Please choose a coach."); return; }
    // Same-day window check: when the user supplies both a start and end
    // time, end must be strictly after start. The API rejects this too,
    // but a client-side guard avoids the round-trip and gives an
    // immediate, specific message.
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      setError("End time must be after start time.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        schoolId: form.schoolId,
        visitDate: form.visitDate,
        visitType: form.visitType,
        coachUserId: form.coachUserId,
        coachingCycleNumber: form.coachingCycleNumber,
        visitReason: form.visitReason,
        visitReasons: form.visitReasons,
        focusAreas: form.focusAreas,
        implementationStatus: form.implementationStatus,
        classesImplementing: [],
        classesNotImplementing: [],
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        sponsorshipType: form.sponsorshipType === "none" ? null : form.sponsorshipType,
        notes: form.notes || null,
      };
      const res = await fetch("/api/portal/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }

      const stagedPhotos = photoCaptureRef.current?.getStaged() ?? [];
      let photoSummary = "";
      if (stagedPhotos.length > 0 && typeof data.id === "number") {
        const result = await uploadStagedPhotos({
          parentType: "coaching_visit",
          parentId: data.id,
          schoolId: form.schoolId,
          staged: stagedPhotos,
          geo: photoCaptureRef.current?.getGeolocation() ?? null,
        });
        photoSummary =
          result.failed.length === 0
            ? ` ${result.uploaded} photo${result.uploaded === 1 ? "" : "s"} attached.`
            : ` ${result.uploaded} photo${result.uploaded === 1 ? "" : "s"} attached, ${result.failed.length} failed.`;
        photoCaptureRef.current?.clear();
      }

      setSuccess(`Visit ${data.visitUid} saved.${photoSummary} Form has been reset for the next entry.`);
      // Reset the form so the user can log another visit immediately. The
      // success banner stays visible until the next submit attempt.
      setForm(buildEmptyForm(defaultSchoolId, defaultCoachId));
      // Refresh server data so dashboards / lists pick up the new visit
      // without forcing the user off this page.
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-start gap-2 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex items-start gap-2 text-[#066a67] text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {success}
        </div>
      )}

      {/* Section 1: Identification */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Visit Details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">School *</label>
            <select
              value={form.schoolId || ""}
              onChange={(e) => setForm({ ...form, schoolId: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Choose a school…</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.district}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Coach *</label>
            <select
              value={form.coachUserId || ""}
              onChange={(e) => setForm({ ...form, coachUserId: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Choose a coach…</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visit Date *</label>
            <input
              type="date"
              value={form.visitDate}
              onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visit Type</label>
            <select
              value={form.visitType}
              onChange={(e) => setForm({ ...form, visitType: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {VISIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Coaching Cycle</label>
            <input
              type="number" min={1} max={20}
              value={form.coachingCycleNumber}
              onChange={(e) => setForm({ ...form, coachingCycleNumber: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Start time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">End time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Reasons + focus */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Reasons &amp; Focus</h2>

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Visit reasons</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {VISIT_REASONS.map((r) => {
            const selected = form.visitReasons.includes(r);
            return (
              <button
                key={r} type="button" onClick={() => toggleInArray("visitReasons", r)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  selected ? "bg-[#006b61] text-white border-[#006b61]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Focus areas (multi-select)</p>
        <div className="flex flex-wrap gap-2">
          {FOCUS_OPTIONS.map((f) => {
            const selected = form.focusAreas.includes(f);
            return (
              <button
                key={f} type="button" onClick={() => toggleInArray("focusAreas", f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  selected ? "bg-[#ff7235] text-white border-[#ff7235]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Implementation status */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Implementation Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {(["not_started", "started", "partial", "full"] as const).map((s) => {
            const labels: Record<typeof s, string> = {
              not_started: "Not started", started: "Started", partial: "Partial", full: "Full",
            };
            return (
              <button
                key={s} type="button"
                onClick={() => setForm({ ...form, implementationStatus: s })}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                  form.implementationStatus === s ? "bg-[#006b61] text-white border-[#006b61]" : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 4: Sponsor + notes */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Sponsorship &amp; Notes</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sponsor tier</label>
            <select
              value={form.sponsorshipType}
              onChange={(e) => setForm({ ...form, sponsorshipType: e.target.value as typeof form.sponsorshipType })}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="none">No sponsor</option>
              <option value="school">School-tier sponsor</option>
              <option value="district">District-tier sponsor</option>
              <option value="region">Region-tier sponsor</option>
              <option value="general">General fund</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visit notes</label>
          <textarea
            rows={4} placeholder="Brief narrative — what happened, what was observed, next steps."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      {/* Section 5: Photo evidence */}
      <PhotoEvidenceCapture
        ref={photoCaptureRef}
        helperText="Take photos at the school. GPS location is captured from your device or the photo's EXIF data — both are stored for verification."
      />

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#006b61] text-white font-bold text-sm hover:bg-[#006b61]/90 disabled:bg-gray-300 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Visit"}
        </button>
      </div>
    </div>
  );
}
